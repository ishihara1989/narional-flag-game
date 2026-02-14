# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript app.

- `src/main.tsx`: app entry point.
- `src/App.tsx`: main game flow and mode switching.
- `src/components/`: UI pieces (for example `MainMenu.tsx`, `MapBoard.tsx`, `FlagCard.tsx`, `Layout.tsx`).
- `src/services/`: API/data logic (`countryService.ts` for REST Countries data).
- `src/types.ts`: shared TypeScript interfaces (`Country`, `GameState`).
- `src/index.css` and `src/App.css`: global and app-level styles.
- `public/`: static assets served as-is.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local dev server with HMR.
- `npm run build`: run TypeScript project build (`tsc -b`) and Vite production bundle.
- `npm run preview`: preview the production build locally.
- `npm run lint`: run ESLint across the repository.

Use `npm run lint && npm run build` before opening a PR.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled via `tsconfig.app.json`).
- Components: React function components in `PascalCase` file names (`MapBoard.tsx`).
- Variables/functions: `camelCase`; exported constants in `UPPER_SNAKE_CASE` only when true constants.
- Keep domain types in `src/types.ts`; avoid `any` unless unavoidable and document why.
- Follow ESLint config in `eslint.config.js` (React Hooks + TypeScript rules). No Prettier is configured, so keep formatting consistent with nearby code.

## Testing Guidelines
There is currently no automated test runner configured (`npm test` is not defined).

- For now, validate changes with `npm run lint`, `npm run build`, and manual checks in `npm run dev`.
- For UI changes, verify all three game modes and at least one full 5-round session.
- When adding tests later, place them near source files as `*.test.ts` / `*.test.tsx`.

## Commit & Pull Request Guidelines
- Current history is minimal (`init`), so use clear, imperative commit messages going forward (for example `feat: add map marker feedback`).
- Keep commits focused and logically grouped.
- PRs should include what changed and why.
- PRs should include a linked issue/ticket when available.
- PRs should include screenshots or short GIFs for UI changes.
- PRs should include local validation results (`lint`, `build`, manual mode checks).

## Security & Configuration Notes
- External data comes from public APIs (REST Countries and GeoJSON from GitHub). Keep endpoints centralized in `src/services/`.
- Do not commit secrets or tokens; use environment variables for future sensitive config.
