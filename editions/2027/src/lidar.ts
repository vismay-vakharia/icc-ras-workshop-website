// Lidar hero: a small robot scans the headline. Rays bounce off the letters and
// leave points that fade out. The <h1> stays real text; the canvas is decoration only.

const SHOW_RAYS = true; // false = points only
const SPEED = 2.2; // beam rotation, rad/s (about 3 s per revolution)
const RAYS_PER_SEC = 700; // angular resolution: about 0.2 degrees between rays
const TRAIL = 350; // ms a ray stays visible behind the beam
const LIFE = 5000; // ms a point stays visible
const RANGE = 900; // max ray length, px
const MISS_LEN = 240; // drawn length of rays that hit nothing, px

const STEP = SPEED / RAYS_PER_SEC;

type Pt = { x: number; y: number; t: number };
type Ray = { ox: number; oy: number; a: number; len: number; hit: boolean; t: number };

export function startLidar(host: HTMLElement, canvas: HTMLCanvasElement, title: HTMLElement): void {
  const ctx = canvas.getContext('2d')!;
  const theme = getComputedStyle(document.documentElement);
  const signal = theme.getPropertyValue('--color-signal').trim() || '#2640e8';
  const ink = theme.getPropertyValue('--color-ink').trim() || '#17233f';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, mask = new Uint8Array(0);
  let pts: Pt[] = [];
  let rays: Ray[] = [];
  let rx = 0, ry = 0, angle = 0, visible = true, timer = 0, last = 0, acc = 0;
  let target: { x: number; y: number; at: number } | null = null;

  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && mask[(y | 0) * w + (x | 0)] === 1;

  // March along one ray until it enters a letter. A hit leaves a point just in
  // front of the letter edge, so the glyph doesn't cover it.
  function cast(a: number, now: number) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let inside = solid(rx, ry); // ignore the letter we may be standing in
    let len = MISS_LEN, hit = false;
    for (let d = 0; d < RANGE; d += 2) {
      const x = rx + dx * d, y = ry + dy * d;
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      const s = mask[(y | 0) * w + (x | 0)] === 1;
      if (inside) { inside = s; continue; }
      if (s) {
        const f = Math.max(d - 3, 0);
        pts.push({ x: rx + dx * f + Math.random() - 0.5, y: ry + dy * f + Math.random() - 0.5, t: now });
        len = d;
        hit = true;
        break;
      }
    }
    rays.push({ ox: rx, oy: ry, a, len, hit, t: now });
  }

  function render(now: number) {
    ctx.clearRect(0, 0, w, h);
    if (SHOW_RAYS && !still) {
      ctx.strokeStyle = signal;
      ctx.lineWidth = 1;
      for (const r of rays) {
        ctx.globalAlpha = (1 - (now - r.t) / TRAIL) * (r.hit ? 0.28 : 0.1);
        ctx.beginPath();
        ctx.moveTo(r.ox, r.oy);
        ctx.lineTo(r.ox + Math.cos(r.a) * r.len, r.oy + Math.sin(r.a) * r.len);
        ctx.stroke();
      }
    }
    ctx.fillStyle = signal;
    for (const p of pts) {
      ctx.globalAlpha = still ? 0.85 : Math.min(1, 2 * (1 - (now - p.t) / LIFE));
      ctx.fillRect(p.x - 1.4, p.y - 1.4, 2.8, 2.8);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = signal;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx, ry, 11, 0, Math.PI * 2); ctx.stroke();
  }

  // Everything is driven by elapsed time, so 60 Hz and 120 Hz screens look the same.
  function frame(now: number) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || !w) return;
    const t = now / 1000, tg = target;
    const live = tg && now - tg.at < 4000 ? tg : null; // follow the pointer, else patrol
    const tx = live ? live.x : w / 2 + Math.sin(t * 0.31) * w * 0.4;
    const ty = live ? live.y : h / 2 + Math.sin(t * 0.47 + 1) * h * 0.38;
    const k = 1 - Math.exp(-dt * 1.8);
    rx += (tx - rx) * k;
    ry += (ty - ry) * k;
    pts = pts.filter((p) => now - p.t < LIFE);
    rays = rays.filter((r) => now - r.t < TRAIL);
    acc += RAYS_PER_SEC * dt;
    for (; acc >= 1; acc -= 1) { angle += STEP; cast(angle, now); }
    render(now);
  }

  async function rebuild() {
    const cs = getComputedStyle(title);
    const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    await document.fonts.load(font).catch(() => {});
    w = host.clientWidth;
    h = host.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw the headline word by word into a hidden canvas; its pixels are the walls.
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const c = off.getContext('2d', { willReadFrequently: true })!;
    c.font = font;
    c.letterSpacing = cs.letterSpacing;
    const ascent = c.measureText('M').fontBoundingBoxAscent;
    const box = host.getBoundingClientRect();
    title.querySelectorAll<HTMLElement>('.word').forEach((el) => {
      const r = el.getBoundingClientRect();
      c.fillText(el.textContent ?? '', r.left - box.left, r.top - box.top + ascent);
    });
    const px = c.getImageData(0, 0, w, h).data;
    mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] > 60 ? 1 : 0;

    pts = [];
    rays = [];
    if (!rx) { rx = w * 0.8; ry = h * 0.7; }
    if (still) { // reduced motion: one full static scan
      rx = w * 0.8; ry = h * 0.72;
      for (let i = 0; i < 1800; i++) cast((i / 1800) * Math.PI * 2, 0);
      rays = [];
      render(0);
    }
  }

  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    target = { x: e.clientX - r.left, y: e.clientY - r.top, at: performance.now() };
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
  new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(rebuild, 120); }).observe(host);
  if (!still) requestAnimationFrame(frame);
}