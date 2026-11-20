// Lidar background: a small wheeled robot scans the page and builds a map. The obstacles
// are the page's text blocks (headings, paragraphs, facts, buttons), so their outlines
// appear as it explores. It picks a random goal on screen, plans a path there with RRT
// (the tree grows visibly), shortcuts the path, and drives it. When scrolled out of view,
// it plans its way back in. The canvas is fixed behind the page and decoration only;
// the map lives in page coordinates and scrolls with the content.

const SHOW_RAYS = true; // false = points only
const SPEED = 2.2; // beam rotation, rad/s (about 3 s per revolution)
const RAYS_PER_SEC = 700; // about 0.2 degrees between rays
const TRAIL = 350; // ms a ray stays visible behind the beam
const RANGE = 280; // sensor reach, px: every ray ends here or at an obstacle
const CELL = 4; // map grid, px
const LIFE = 18000; // ms a map cell stays visible after its last hit
const FLASH = 160; // ms a new hit is drawn larger
const PATH = 2000; // ms of robot trail
const PAD = 8; // gap between a text block and its obstacle edge, px
const CRUISE = 90; // robot top speed, px/s
const RETURN = 2.5; // speed multiplier while the robot is off screen, driving back in
const SETTLE = 300; // ms after the last scroll before the robot reacts to it
const TURN = 2.5; // robot max turn rate, rad/s
const STEP = 22; // RRT edge length, px
const GROW = 120; // RRT samples per second, slow enough to watch the tree grow
const HOLD = 600; // ms to show the finished path before driving it
const BODY = 15; // robot radius, px: the planner keeps the whole body clear of blocks
const MAX_NODES = 1500; // give up on a goal after this many nodes
const FADE = 1500; // ms the tree takes to fade once a path is found
// Text blocks that act as obstacles.
const BLOCKS = 'main :is(h1, h2, h3, p, li, dl > div, a.inline-flex)';

type Ray = { ox: number; oy: number; a: number; len: number; t: number };
type P = { x: number; y: number };
type Robot = P & { h: number; a: number; path: (P & { t: number })[] };
// RRT state: tree nodes (parent index), goal, and the route once found.
type Plan = { nx: number[]; ny: number[]; np: number[]; goal: P; route: P[] | null; at: number; born: number; i: number; y0: number; y1: number };

export function startLidar(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const theme = getComputedStyle(document.documentElement);
  const lidar = theme.getPropertyValue('--color-lidar').trim() || '#f26b1d';
  const ink = theme.getPropertyValue('--color-ink').trim() || '#1f2328';
  const paper = theme.getPropertyValue('--color-paper').trim() || '#f3f3f1';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, vh = 0, H = 0, cols = 0;
  let mask = new Uint8Array(0); // w x H page-sized grid of blocks, what the rays hit
  let cspace = new Uint8Array(0); // blocks grown by BODY, where the robot's center may not go
  let cells = new Map<number, number>(); // grid cell -> time of last hit
  let rays: Ray[] = [];
  let bots: Robot[] = []; // one robot; several static scanners with reduced motion
  let plan: Plan | null = null;
  let timer = 0, last = 0, acc = 0, scrolledAt = 0;

  const solid = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= H || mask[(y | 0) * w + (x | 0)] === 1;
  const blocked = (x: number, y: number) =>
    x < BODY || y < 0 || x >= w - BODY || y >= H || cspace[(y | 0) * w + (x | 0)] === 1;
  const onScreen = (y: number, top: number) => y > top && y < top + vh;

  // True if the robot can drive the straight line between two points.
  function clear(ax: number, ay: number, bx: number, by: number) {
    const n = Math.hypot(bx - ax, by - ay) / 4;
    for (let i = 1; i <= n; i++) if (blocked(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }

  // A random free spot in the band of the page that starts at `top`, preferably at
  // least `far` px from `from`.
  function freeSpot(top: number, from?: P, far = 0) {
    let any: P | null = null;
    for (let i = 0; i < 60; i++) {
      const x = w * (0.04 + Math.random() * 0.92), y = top + vh * (0.1 + Math.random() * 0.8);
      if (blocked(x, y)) continue;
      if (!from || Math.hypot(x - from.x, y - from.y) > far) return { x, y };
      any ??= { x, y };
    }
    return any;
  }

  // The goal is always on screen. The tree samples the band from the robot to the screen,
  // so a robot that was scrolled off screen can plan its way back in.
  function newPlan(b: Robot, top: number, now: number) {
    const goal = freeSpot(top, b, Math.min(w, vh) * 0.5);
    const y0 = Math.max(0, Math.min(b.y, top) - STEP), y1 = Math.min(H, Math.max(b.y, top + vh) + STEP);
    plan = goal && { nx: [b.x], ny: [b.y], np: [-1], goal, route: null, at: 0, born: now, i: 1, y0, y1 };
  }

  // A free spot just outside the screen edge nearest to the robot, close to its x.
  function edgeSpot(b: Robot, top: number): P | null {
    const above = b.y < top;
    for (let k = 0; k < 20; k++) {
      const y = above ? top - BODY - 4 - k * 8 : top + vh + BODY + 4 + k * 8;
      for (let d = 0; d < w; d += 8) {
        for (const x of [b.x - d, b.x + d]) if (!blocked(x, y)) return { x, y };
      }
    }
    return null;
  }

  // Grow the RRT by `n` samples. On reaching the goal, walk back to the root and
  // shortcut the path: from each point, jump to the furthest point still in line of sight.
  function grow(p: Plan, n: number, now: number) {
    for (let k = 0; k < n && !p.route; k++) {
      const bias = Math.random() < 0.1; // sometimes sample the goal itself
      const sx = bias ? p.goal.x : Math.random() * w, sy = bias ? p.goal.y : p.y0 + Math.random() * (p.y1 - p.y0);
      let j = 0, best = Infinity;
      for (let i = 0; i < p.nx.length; i++) {
        const d = (p.nx[i] - sx) ** 2 + (p.ny[i] - sy) ** 2;
        if (d < best) { best = d; j = i; }
      }
      const d = Math.sqrt(best) || 1, f = Math.min(1, STEP / d);
      const x = p.nx[j] + (sx - p.nx[j]) * f, y = p.ny[j] + (sy - p.ny[j]) * f;
      if (!clear(p.nx[j], p.ny[j], x, y)) continue;
      p.nx.push(x); p.ny.push(y); p.np.push(j);
      if (Math.hypot(p.goal.x - x, p.goal.y - y) < STEP && clear(x, y, p.goal.x, p.goal.y)) {
        const raw: P[] = [p.goal];
        for (let i = p.nx.length - 1; i >= 0; i = p.np[i]) raw.unshift({ x: p.nx[i], y: p.ny[i] });
        const route = [raw[0]];
        for (let i = 0; i < raw.length - 1;) {
          let j = raw.length - 1;
          while (j > i + 1 && !clear(raw[i].x, raw[i].y, raw[j].x, raw[j].y)) j--;
          route.push(raw[j]);
          i = j;
        }
        p.route = route;
        p.at = now;
      }
    }
    if (!p.route && p.nx.length > MAX_NODES) plan = null; // unreachable goal: try another
  }

  // March along one ray until it enters an obstacle or runs out of range.
  function cast(b: P, a: number, now: number) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let len = RANGE;
    for (let d = 0; d < RANGE; d += 2) {
      const x = b.x + dx * d, y = b.y + dy * d;
      if (solid(x, y)) {
        const f = Math.max(d - 3, 0);
        if (x >= 0 && y >= 0 && x < w && y < H) {
          cells.set((((b.y + dy * f) / CELL) | 0) * cols + (((b.x + dx * f) / CELL) | 0), now);
        }
        len = d;
        break;
      }
    }
    rays.push({ ox: b.x, oy: b.y, a, len, t: now });
  }

  function render(now: number) {
    const top = scrollY;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = canvas.width / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
    ctx.strokeStyle = lidar;
    ctx.lineWidth = 1;
    if (!still) {
      ctx.globalAlpha = 0.08;
      ctx.setLineDash([3, 5]);
      for (const b of bots) { ctx.beginPath(); ctx.arc(b.x, b.y, RANGE, 0, Math.PI * 2); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    if (SHOW_RAYS && !still) {
      for (const r of rays) {
        ctx.globalAlpha = (1 - (now - r.t) / TRAIL) * 0.22 * (1 - (0.7 * r.len) / RANGE);
        ctx.beginPath();
        ctx.moveTo(r.ox, r.oy);
        ctx.lineTo(r.ox + Math.cos(r.a) * r.len, r.oy + Math.sin(r.a) * r.len);
        ctx.stroke();
      }
    }
    ctx.fillStyle = lidar;
    for (const [k, t] of cells) {
      const x = (k % cols) * CELL, y = ((k / cols) | 0) * CELL, age = now - t;
      if (y < top - CELL || y > top + vh) continue;
      if (!still && age < FLASH) {
        ctx.globalAlpha = 1;
        ctx.fillRect(x - 1, y - 1, CELL + 1, CELL + 1);
      } else {
        ctx.globalAlpha = still ? 0.8 : Math.min(0.85, 2 * (1 - age / LIFE));
        ctx.fillRect(x, y, CELL - 1, CELL - 1);
      }
    }
    if (still) return;
    const p = plan;
    if (p) {
      const fade = p.route ? 1 - (now - p.at) / FADE : 1;
      if (fade > 0) { // the tree, edge to parent
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.18 * fade;
        ctx.beginPath();
        for (let i = 1; i < p.nx.length; i++) { ctx.moveTo(p.nx[i], p.ny[i]); ctx.lineTo(p.nx[p.np[i]], p.ny[p.np[i]]); }
        ctx.stroke();
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      if (p.route) { // the rest of the route, dashed
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(bots[0].x, bots[0].y);
        for (let i = p.i; i < p.route.length; i++) ctx.lineTo(p.route[i].x, p.route[i].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Goal: an orange cross in a ring. A new goal sends out two rings, so it's easy to spot.
      const { x: gx, y: gy } = p.goal;
      ctx.strokeStyle = lidar;
      ctx.lineWidth = 2;
      for (const delay of [0, 300]) {
        const k = (now - p.born - delay) / 900;
        if (k <= 0 || k >= 1) continue;
        ctx.globalAlpha = 0.6 * (1 - k);
        ctx.beginPath(); ctx.arc(gx, gy, 8 + 28 * k, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(gx, gy, 8, 0, Math.PI * 2);
      ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy);
      ctx.moveTo(gx, gy - 5); ctx.lineTo(gx, gy + 5);
      ctx.stroke();
    }
    for (const b of bots) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      for (let i = 1; i < b.path.length; i++) {
        const p = b.path[i - 1], q = b.path[i];
        ctx.globalAlpha = 0.25 * (1 - (now - q.t) / PATH);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      // Differential-drive robot seen from above: chassis, two wheels, lidar puck.
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.h);
      ctx.fillStyle = ink;
      ctx.fillRect(-6, -11, 12, 4);
      ctx.fillRect(-6, 7, 12, 4);
      ctx.fillStyle = paper;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-10, -7, 20, 14, [2, 6, 6, 2]); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = lidar;
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = lidar;
      ctx.beginPath(); // beam direction
      ctx.moveTo(b.x + Math.cos(b.a) * 4, b.y + Math.sin(b.a) * 4);
      ctx.lineTo(b.x + Math.cos(b.a) * 14, b.y + Math.sin(b.a) * 14);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Everything is driven by elapsed time, so 60 Hz and 120 Hz screens look the same.
  function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!w) return;
    const top = scrollY;
    const b = bots[0];
    // After scrolling stops: drop a goal that went off screen, and if the robot is more
    // than a screen away (a nav-link jump), move it just outside the nearest edge so it
    // drives back in instead of taking ages. While scrolling, it keeps doing what it was.
    if (now - scrolledAt > SETTLE) {
      if (plan && !onScreen(plan.goal.y, top)) plan = null;
      if (b.y < top - vh || b.y > top + 2 * vh) {
        const p = edgeSpot(b, top);
        if (p) { b.x = p.x; b.y = p.y; b.h = b.y < top ? Math.PI / 2 : -Math.PI / 2; b.path = []; plan = null; }
      }
      if (!plan) newPlan(b, top, now);
    }
    if (plan && !plan.route) grow(plan, Math.ceil(GROW * dt), now);
    const route = plan?.route;
    if (plan && route && now - plan.at > HOLD) {
      const tx = route[plan.i].x, ty = route[plan.i].y, end = plan.i === route.length - 1;
      const dist = Math.hypot(tx - b.x, ty - b.y);
      if (dist < (end ? 4 : 10)) {
        if (end) plan = null; // arrived: plan the next trip
        else plan.i++;
      } else {
        // Go-to-goal on the next waypoint: turn at a capped rate; drive only when roughly
        // facing it, slowing near the goal, so it turns in place at corners, then rolls.
        const err = Math.atan2(Math.sin(Math.atan2(ty - b.y, tx - b.x) - b.h), Math.cos(Math.atan2(ty - b.y, tx - b.x) - b.h));
        b.h += Math.max(-TURN * dt, Math.min(TURN * dt, err * 4 * dt));
        const cap = CRUISE * (onScreen(b.y, top) ? 1 : RETURN);
        const v = Math.min(cap, (end ? dist : dist + 60) * 1.5) * Math.max(0, Math.cos(err)) ** 8;
        b.x += Math.cos(b.h) * v * dt;
        b.y += Math.sin(b.h) * v * dt;
      }
    }
    const lp = b.path[b.path.length - 1];
    if (!lp || now - lp.t > 60) b.path.push({ x: b.x, y: b.y, t: now });
    b.path = b.path.filter((p) => now - p.t < PATH);
    for (const [c, t] of cells) if (now - t > LIFE) cells.delete(c);
    rays = rays.filter((r) => now - r.t < TRAIL);
    acc += RAYS_PER_SEC * dt;
    for (; acc >= 1; acc -= 1) { b.a += SPEED / RAYS_PER_SEC; cast(b, b.a, now); }
    render(now);
  }

  function rebuild() {
    w = document.documentElement.clientWidth;
    vh = innerHeight;
    H = document.documentElement.scrollHeight;
    if (!w || !H) return;
    cols = Math.ceil(w / CELL);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = vh * dpr;

    // Text blocks (padded) are the obstacles, filled straight into the page-sized mask.
    // The planner's copy is grown by the robot's radius (a configuration space), so a
    // path that keeps the center out of it keeps the whole body off the blocks.
    mask = new Uint8Array(w * H);
    cspace = new Uint8Array(w * H);
    const box = (g: Uint8Array, r: DOMRect, pad: number) => {
      const l = Math.max(0, (r.left - pad) | 0), rt = Math.min(w, Math.ceil(r.right + pad));
      const t = Math.max(0, (r.top + scrollY - pad) | 0), bt = Math.min(H, Math.ceil(r.bottom + scrollY + pad));
      for (let y = t; y < bt; y++) g.fill(1, y * w + l, y * w + rt);
    };
    for (const el of document.querySelectorAll(BLOCKS)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      box(mask, r, PAD);
      box(cspace, r, PAD + BODY);
    }

    cells = new Map();
    rays = [];
    if (still) { // reduced motion: one static scan per screen height of page
      bots = [];
      for (let top = 0; top < H; top += vh) {
        const p = freeSpot(Math.min(top, H - vh));
        if (p) bots.push({ ...p, h: 0, a: 0, path: [] });
      }
      for (const b of bots) for (let i = 0; i < 1800; i++) cast(b, (i / 1800) * Math.PI * 2, 0);
      rays = [];
      render(0);
      return;
    }
    plan = null;
    bots = [{ ...(freeSpot(scrollY) ?? { x: w / 2, y: scrollY + vh / 2 }), h: Math.random() * Math.PI * 2, a: 0, path: [] }];
  }

  const schedule = () => { clearTimeout(timer); timer = window.setTimeout(rebuild, 120); };
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body); // page height changes, web fonts loading
  document.fonts.ready.then(schedule);
  addEventListener('scroll', () => { scrolledAt = performance.now(); if (still) render(0); }, { passive: true });
  if (still) return;
  requestAnimationFrame(frame);
}
