# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Verified repo facts (supersede AGENTS.md where they differ)

Checked against the repo on 2026-11-18.

- **No tests, no linter.** The build is the check: `npm run build:2027` / `build:2025` (each runs `tsc && vite build`).
  Prettier config: `htmlWhitespaceSensitivity: strict`.
- **Deploy is per site, not combined.** `.github/workflows/deploy.yml` is a reusable workflow (optional `npm ci` +
  build, then `peaceiris/actions-gh-pages` push to an org repo with a deploy key). Thin callers trigger it on push to
  `main`: `deploy-2025.yml` / `deploy-2027.yml` (paths `editions/<year>/**`, `package-lock.json`, `.nvmrc`) push
  `dist` to `icc-ras-workshop/<year>`; `deploy-portal.yml` (paths `editions/portal/**`) pushes `editions/portal`
  as-is to `icc-ras-workshop/icc-ras-workshop.github.io`. Secrets: `ORG_2025_DEPLOY_KEY`, `ORG_2027_DEPLOY_KEY`,
  `ORG_PORTAL_DEPLOY_KEY`. All have `workflow_dispatch`. `check.yml` runs `build:all` on pull requests.
  Node version comes from `.nvmrc`.
- **Portal is plain static HTML, no build** (`editions/portal/index.html`, `404.html`, `favicon.svg`), not a
  workspace. It lists all editions by hand: add a new edition there when its site goes live. `404.html` JS-redirects
  the old root URLs of the 2025 site (`/cfp`, `/speakers.html`, `/images/...`) to `/2025/...`. Preview with
  `python3 -m http.server -d editions/portal` (the `/2025/`, `/2027/` links only resolve in production).
- **2027 base is `/2027/`** (`editions/2027/vite.config.ts`), not `./`.
- **Both editions are Tailwind v4.** 2025's `tailwind.config.ts` is an unused v3 leftover.
- **One Vite (7.x) for both editions**, hoisted at the root; `editions/2027/tsconfig.json` type-checks
  `vite.config.ts` again. TypeScript is still split on purpose (2025 ~5.9, 2027 ^7); each workspace runs its own `tsc`.
- **2025 is archived:** only dependency/vulnerability updates there. Its unused assets were moved to the gitignored
  `archive/2025/` (kept locally, not deployed).
- **`npm audit`** shows 4 high findings from one `picomatch` ReDoS advisory with no upstream fix (build-time only,
  via vite → tinyglobby → fdir). Don't force overrides for it.
- **CI** uses `npm ci`, so commit `package-lock.json` with any dependency change.
- **Two different page architectures:**
  - 2025: multi-page HTML; shared header/footer are partials pulled in with `vite-plugin-html-inject`
    (`<load src="src/components/header.html" />`); data in `src/data/*.json`, rendered by `src/scripts/*.ts`.
    Each page must be listed in `build.rollupOptions.input`.
  - 2027: one `index.html` shell; `src/main.ts` renders everything from `src/content.ts` as template strings.
