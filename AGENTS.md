# Repository Guidelines

## Project Structure & Module Organization

- `src/`: React + TypeScript app code.
  - `src/App.tsx`: main UI and app state.
  - `src/components/`: UI components (PascalCase, e.g. `CardPreview.tsx`).
  - `src/utils/`: core logic (e.g. `splitToCards.ts`, `exportCards.ts`).
  - `src/index.css`: Tailwind-driven styles and global CSS.
- `public/`: static assets copied as-is to the build output.
- `dist/`: Vite build output (generated; do not edit by hand).
- Tooling/config: `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json` (preferred for CI/repro).
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: typecheck (`tsc -b`) and build production assets to `dist/`.
- `npm run preview`: serve the built app locally (validates production build).
- `npm run lint`: run ESLint across the repo.

## Coding Style & Naming Conventions

- Language: TypeScript + React (function components + hooks).
- Naming: components in `src/components/` use `PascalCase.tsx`; utilities use `camelCase.ts`; shared types live in `src/types.ts`.
- Formatting: follow existing code style (2-space indentation in TS/TSX, single quotes, minimal semicolons). Run `npm run lint` before opening a PR.

## Testing Guidelines

- No automated test runner is configured yet (no `npm test` script).
- For non-trivial changes, validate via:
  - `npm run lint` and `npm run build`
  - manual smoke test: paste sample content, verify pagination/preview, and confirm ZIP export works.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits (seen in history): `feat: …`, `docs: …` (also use `fix:`, `refactor:`, `chore:` as needed).
- PRs should include: a clear description, linked issue (if any), screenshots/GIFs for UI changes, and a short “How to test” section (commands + manual steps).

## Configuration & Security Tips

- This is a client-side Vite app: anything prefixed with `VITE_` is exposed to the browser—never put secrets there.
- Keep generated files and local editor settings out of git (see `.gitignore`).

## Agent-Specific Instructions

- If you use an AI agent in this repo, also read `AI_GUIDE.md` for project-specific workflows and expectations.
