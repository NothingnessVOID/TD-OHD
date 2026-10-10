# TD-OHD development agreement

## Local environment and preview

- Use Node.js 24 and the .NET 10 SDK. In Windows PowerShell, prefer `npm.cmd`.
- Keep user-facing development and built preview on **port 9961**. Bind to `0.0.0.0` for the user's trusted LAN; local access is `http://127.0.0.1:9961/`, remote access is `http://<host-LAN-IP>:9961/`.
- Do not configure public port forwarding, disable firewall protections, or set unrestricted Vite host allow-lists. Private research under `docs/handoff/` is denied by the dev server.
- `npm.cmd run dev` starts development; `npm.cmd run build:pages` then `npm.cmd run preview` serves the static build.
- Both servers use `strictPort`. Do not silently fall back to another port or run both at once.
- If 9961 is occupied, identify the process before stopping it. Prefer reusing or stopping this project's own preview; preserve unrelated applications and unsaved work.
- Browser profiles are origin-specific. Keep one consistent address per browser; localhost and LAN-IP libraries do not automatically synchronize.
- Preserve LF line endings. Engine signatures hash file contents, so automatic CRLF conversion can change generated signatures without a logic change.

## Parallel implementation

- Authorized implementation tasks that need edits, installs, tests or commits start in fresh `write`-permission instances. Do not reuse a historical read-only research instance for development.
- Give each implementation task its own branch/worktree and explicit file ownership. Keep shared API changes coordinated.
- Isolated worktree test servers use assigned loopback-only ports; reserve 9961 for the user's validated shared preview.
- Preserve failed test evidence. A task's passing tests do not replace cross-module integration and full browser regression.

## Git synchronization

- The user requests a commit and push to a development branch after each completed, validated development increment, so another computer can continue the work.
- Current shared development branch: **`dev/windows-development`**.
- Before work, inspect the current branch and worktree and fetch remote updates when available. Preserve existing uncommitted work. If histories diverge, investigate before integrating.
- Commit only the intended changes, with a clear message. Run relevant tests/build checks and report any checks not run or failures.
- Push the development branch without force and confirm its remote commit matches local `HEAD`.
- Do not push directly to `main`, merge to `main`, publish, or deploy without separate explicit authorization. `main` updates trigger the production GitHub Pages workflow.
- If authentication or a non-fast-forward push blocks synchronization, report it; do not rewrite remote history to bypass the problem.

## Test data

- Use clearly labeled fictional people for development fixtures.
- Never commit actual personal birth records, credentials, local databases, browser profiles, or local storage dumps.
- Keep reusable import fixtures outside `public/`; do not auto-seed production builds or overwrite existing people.
