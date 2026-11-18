# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Verified repo facts (supersede AGENTS.md where they differ)

Checked against the repo on 2026-11-18.

- **No tests, no linter.** The build is the check: `npm run build:2027` / `build:2025` (each runs `tsc && vite build`).
  Prettier config: `htmlWhitespaceSensitivity: strict`.
- **Deploy is per edition, not combined.** `.github/workflows/deploy-<year>.yml` runs on push to `main` when
  `editions/<year>/**` changes. It builds that one workspace and pushes its `dist` to a separate repo
  (`icc-ras-workshop/2025`, `icc-ras-workshop/2027`) via `peaceiris/actions-gh-pages` + deploy key. Editing one
  edition never redeploys another.
- **Portal is empty.** `editions/portal/index.html`, `editions/portal/vite.config.ts` and
  `.github/workflows/deploy-portal.yaml` are 0-byte placeholders; no `package.json`, so not a workspace and
  `build:all` skips it.
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
