# AGENTS.md

Notes for anyone (human or AI agent) working in this repo. Read this first.

The 2027 edition was started in a chat with Claude (claude.ai) and is being continued in Claude Code.
The code in this repo is the source of truth. Code snippets in the chat history may be out of date,
so read the actual files before editing.

## Repo layout

One repo, several independent static websites, managed as npm workspaces.

```
.
├── AGENTS.md
├── package.json          workspaces: ["editions/*"]; scripts build:2025, build:2027, build:all
├── package-lock.json     the only lockfile that should exist
├── shared/               shared code or assets (inspect before duplicating anything)
└── editions/
    ├── portal/           base site: https://icc-ras-workshop.github.io/ (index.html + vite.config.ts)
    ├── 2025/             ICC 2025 RAS workshop, multi-page (workspace name: ras-2025)
    │   ├── index.html, cfp.html, speakers.html, schedule.html, organizers.html, abstracts.html
    │   ├── public/, src/, tailwind.config.ts, tsconfig.json, vite.config.ts, package.json
    └── 2027/             ICC 2027 RAS workshop, single page for now (workspace name: ras-2027)
        └── index.html, src/, tsconfig.json, vite.config.ts, package.json
```

- The 2025 edition lives at https://icc-ras-workshop.github.io/2025/ ; 2027 should end up at `/2027/`.
  `editions/2027/vite.config.ts` uses `base: './'` so paths stay relative and work from any URL path.
- Root scripts reference workspaces by name, so `editions/2027/package.json` must have `"name": "ras-2027"`.
  Check that it does.
- `editions/portal` has no `package.json` in the layout, so it may not be a real workspace and `build:all` may skip it.
  Check how the portal is built and how the three `dist` folders are combined for deployment. This was not
  looked at during the chat, so don't assume.
- The portal probably needs a link to the 2027 edition once the page is ready. Check `editions/portal/index.html`.

## Known problems to fix first

Items 1, 3 and 4 were fixed on 2026-11-18 (single Vite 7, `vite.config.ts` type-checked again, 2027 README removed). Item 2 turned out to be a non-issue: both editions are Tailwind v4.

1. **Two copies of Vite.** `editions/2027` has its own `package-lock.json` (and likely its own `node_modules`) next
   to the root workspace install. That produced a `tsc` error in `vite.config.ts`: the `@tailwindcss/vite` plugin was
   typed against one Vite copy and `defineConfig` against the other. Fix: delete `editions/2027/node_modules` and
   `editions/2027/package-lock.json`, then run `npm install` from the repo root. Confirm with `npm ls vite`.
2. **Tailwind versions may differ.** 2027 uses Tailwind CSS v4 (`@tailwindcss/vite`, `@theme` in CSS, no config file).
   2025 has a `tailwind.config.ts`, which suggests v3. Not verified. If they conflict after hoisting, pin the
   versions per workspace or upgrade 2025; don't mix them silently.
3. **Workaround currently in place:** `editions/2027/tsconfig.json` has `"include": ["src"]`, so `vite.config.ts` is
   not type-checked by `tsc`. Once there is a single Vite install, `"vite.config.ts"` can be added back to `include`.
4. **Leftover scaffold files.** `editions/2027/README.md` (and a `.github/workflows/deploy.yml` if one was copied in)
   assume a standalone repo deployed straight to GitHub Pages. That is wrong for this monorepo: delete or rewrite them
   to match the repo's real deploy setup.

## Commands

From the repo root:

```bash
npm install                      # one install for all workspaces
npm run build:2027               # tsc --noEmit, then vite build, for editions/2027
npm run build:2025
npm run build:all
npm run dev --workspace=ras-2027 # local dev server for the 2027 edition
```

## The 2027 edition

### What it is

Landing page for the **Robotics and Autonomous Systems (RAS) workshop** at the **Indian Control Conference (ICC) 2027**,
IIT Kharagpur.

- Conference: ICC-12, 11-13 January 2027, IIT Kharagpur (https://controlsociety.org/icc/)
- Workshop: half day, in person (assumed). The exact day is **not decided yet**.
- The sessions are undecided too: there may be talks, tutorials, guest seminars, student presentations or submissions.
  Keep the page flexible about this.
- Student submissions go through OpenReview: https://openreview.net/group?id=controlsociety.org/ICC/2027/Workshop/RAS
  (the `#tab-your-consoles` part of the organizer link only works for logged-in organizers, so the site links to the
  plain venue URL).
- What the 2025 page had, as a guide to what the 2027 page will need: date, time, format, session code in the
  conference program (Papercept), room, building and campus, plus Call for Papers, Speakers, Schedule, Organizers and
  Abstracts pages. The contact emails on the 2025 page belong to the 2025 organizers; don't reuse them without asking.

### Stack

Vite + TypeScript + Tailwind CSS v4, static output, no framework. Keep it as simple as it is now.

### Where things are (`editions/2027`)

- `src/content.ts`: all text, dates, links, deadlines, schedule, speakers, organizers. Empty lists render a
  "to be announced" note, so add entries as decisions are made.
- `src/main.ts`: builds the page as HTML template strings (header, hero, sections, footer), then calls `startLidar`.
- `src/lidar.ts`: the hero animation (see below).
- `src/style.css`: Tailwind import and theme tokens (colors, fonts).
- `vite.config.ts`: `base: './'` and the Tailwind plugin.

### Decisions made

- **Single page for now.** Program, speakers and deadlines are undecided, so extra pages would be empty. Later, split
  off only the pages that get long (accepted abstracts, maybe speaker bios). That means one extra HTML file per page
  plus `build.rollupOptions.input` entries in `vite.config.ts`, with the header and footer moved into a shared
  function. 2025's `abstracts.html` etc. show the convention; use the same URLs (`/2027/abstracts/` or
  `abstracts.html`, matching 2025) unless there's a reason not to.
- **Hero background is plain.** A graph-paper grid was removed because it hurt readability of the date, venue and
  format row. Don't put a busy background behind that row.
- **Submit is a dark full-width band** with its own focus ring (`.on-ink` in the CSS). Section headings are large and
  sit above their content. The people lists are three columns on wide screens.
- **Fonts:** Bricolage Grotesque (display) and Hanken Grotesk (body), loaded from Google Fonts in `index.html`.
- **Palette** (in `src/style.css`): paper `#f4f6fa`, ink `#17233f`, signal blue `#2640e8`, muted `#5b6784`,
  grid `#dbe1ec`.
- **Hero:** the lidar scan replaced an earlier step-response plot (see "Hero and demo ideas" for the plot's details).

### Hero: lidar scan (built)

A small robot scans the headline with lidar. Rays bounce off the letters and leave points that fade out.

- The `<h1 id="title">` stays real text, with each word wrapped in `<span class="word">`. The canvas `#scan` sits
  inside `<section id="top">`, is decoration only (`aria-hidden`, `pointer-events-none`).
- The headline is drawn word by word onto a hidden canvas; its pixels are the walls the rays hit.
- Everything runs on elapsed time, so it looks the same at 60 Hz and 120 Hz.
- The robot patrols on its own and follows the pointer for about 4 s after it moves.
- It pauses when the hero is off screen, and rebuilds on resize and after the web font loads.
- With `prefers-reduced-motion`, it shows one static scan instead of animating.
- Tuning constants are at the top of `lidar.ts`: `SPEED` (rad/s), `RAYS_PER_SEC`, `TRAIL`, `LIFE`, `RANGE`,
  `MISS_LEN`, `SHOW_RAYS`.
- History: the first version was too fast, sparse and only drew rays that hit something. The current version turns
  once per ~3 s, casts ~700 rays/s, draws faint rays for misses, and keeps points for 5 s. It was type-checked and
  built in the chat but not judged in a browser, so expect another round of tuning.
- Possible small upgrade: draw a short trail behind the robot.

## Hero and demo ideas (not built, for later)

These were discussed and can be implemented on request. If one is added, follow the same rules as the lidar hero:
real text stays in the DOM, canvas or SVG is `aria-hidden`, animation pauses off screen (IntersectionObserver),
`prefers-reduced-motion` gets a static or non-animated version, touch works, and it never hurts the readability of the
date/venue row. The hero should have one memorable thing, so add these in other sections (About, for example) or swap
the hero, not stack them.

1. **Go-to-goal robot with a gain slider** (control-flavored, good as a small demo in About).
   A differential-drive robot drives to wherever you click and leaves a trail; the user can place obstacles. A
   "controller gain" slider shows the trade-off: low gain is sluggish, high gain overshoots and oscillates.
   Suggested controller: forward speed proportional to distance to goal, turn rate proportional to heading error,
   with the gain scaling both. About 100 lines of canvas.
2. **Inverted pendulum balanced by a controller** (the original favorite, on-topic for a control conference but
   less about robotics; kept as the fallback hero). A pendulum (or cart-pole) balanced by a PD or LQR-style controller.
   Visitors drag it to disturb it and watch it recover; a gain slider detunes the controller until it falls.
   About 80 lines of canvas.
3. **Planner growing a tree.** An RRT grows across a field of obstacles, finds a path, and re-plans when you click to
   move the goal. Striking but more algorithm art than something to play with.
4. **Two-link arm following the cursor.** Inverse kinematics with joint angles shown live. Easiest to build but the
   least distinctive, since arms following a cursor are common.
5. **Step-response plot** (the earlier hero, removed for being over the top). An underdamped second-order system,
   zeta about 0.22, drawn as an SVG path that draws itself once (`pathLength="1"` with a `stroke-dashoffset`
   animation), with the overshoot peak marked and a dashed reference line. A smaller interactive version: a
   damping-ratio slider that reshapes the curve in real time.

Layout ideas not yet done: real photos (campus, 2025 workshop, speaker headshots) are the cheapest way to look
non-generic.

## Design and writing preferences

- The owner does not want the site to look AI-generated or over the top. Specific, on-topic touches beat decoration.
  Avoid stock templated looks: all-caps eyebrow labels above headings, numbered markers on things that aren't
  sequences, identical rounded cards, gradient washes.
- One memorable element, with the rest kept quiet.
- Readability first, especially for date, venue and deadlines.
- Copy: plain, sentence case, no filler. Buttons say what they do ("Open the OpenReview venue").
- Quality floor: responsive down to phone width, visible keyboard focus, reduced motion respected.

## Open items

- Workshop day, time, session code and room (currently "To be announced")
- Contact email (`site.email` in `content.ts` is empty; the footer shows "Contact details to follow")
- Submission deadlines, schedule, speakers, organizers
- The about text and topics list are draft copy based on the title and the 2025 page
- The "in person" format is an assumption
- Photos (the owner is looking for 2025 workshop photos)
- Fix the repo problems listed above, then decide how 2027 gets built and deployed together with 2025 and the portal
- Add a 2027 link to the portal

## Working with the owner

- Make changes directly in the repo, and run `npm run build:2027` before finishing.
- Make sure not to break the 2025 edition or the portal.
- If a decision isn't covered here (workshop date, speakers, deadlines, contact details), ask rather than inventing it.