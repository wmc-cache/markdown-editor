# Repository Guidelines

## Project Structure & Module Organization
- `main/` Electron main process: window/menu/IPC (`main/window.js`, `main/menu.js`, `main/ipc-handlers.js`).
- `preload.js` Secure bridges (`electronAPI`, `storageAPI`, `secureStorageAPI`).
- `src/` Renderer app: `index.html`, `renderer.js` and modules:
  - `components/` UI (Editor, Preview, FileTree, TabManager, ThemeSelector, StreamingOptimizer, FindReplace, ImageGenerator).
  - `services/` API and storage (`deepseek.js`, `cogview.js`, `storage.js`).
  - `utils/markdown.js`; `styles/` CSS assets.

## Build, Test, and Development Commands
- `npm start` Launch app.
- `npm run dev` Launch with dev flag.
- `npm run build` Package via electron-builder (`dist/`). Use `build:mac`, `build:win`, or `build:all` for targets.
- `npm run lint` / `npm run lint:fix` Run ESLint (install if missing).
- `npm run format` / `npm run format:check` Format via Prettier.
- Tests: none configured yet. If adding, prefer `tests/` + `npm test` and keep unit tests headless.

## Coding Style & Naming Conventions
- JS: 2-space indent, semicolons, single quotes. Prefer small, pure functions; keep UI strings Chinese-consistent.
- File names: `PascalCase` for `src/components/*` (e.g., `TabManager.js`); lower-case for `services/`, `utils/` (e.g., `storage.js`). CSS uses kebab-case (e.g., `main.css`).
- Add brief JSDoc for public methods; avoid unnecessary comments.

## Testing Guidelines
- Manual flows to verify: open/save files; folder tree; preview toggle; tabs; find/replace; AI optimize selected/full; CogView image generation (Zhipu only).
- Configure keys first: Settings → choose provider (DeepSeek/Zhipu) and set API key; verify streaming and fallback paths.

## Commit & Pull Request Guidelines
- Current history favors short, imperative titles (e.g., `fix`, `bug fix`, `重构`). Keep messages concise; English or Chinese acceptable. Optional: use Conventional prefixes (`feat:`, `fix:`, `chore:`).
- PRs must include: clear description, rationale/scope, linked issue, screenshots for UI changes, and local verification steps.
- Before opening: run `npm run format:check` and `npm run lint`; ensure app starts with `npm start`.

## Security & Configuration Tips
- Never commit API keys. Use in-app Settings; keys are stored via Electron `safeStorage` (`src/services/storage.js`, `preload.js`).
- Do not log secrets; scrub request/response payloads when debugging.
- New providers: add under `src/services/`, extend `storage.js` and renderer wiring.

永远用中文回答我
