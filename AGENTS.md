# TD-OHD development agreement

## Local environment and preview

- Use Node.js 24 and the .NET 10 SDK. In Windows PowerShell, prefer `npm.cmd`.
- Keep development and built preview at **http://127.0.0.1:9961/**.
- `npm.cmd run dev` starts development; `npm.cmd run build:pages` then `npm.cmd run preview` serves the static build.
- Both servers use `strictPort`. Do not silently fall back to another port or run both at once.
- If 9961 is occupied, identify the process before stopping it. Prefer reusing or stopping this project's own preview; preserve unrelated applications and unsaved work.
- Browser profiles are origin-specific. Use `127.0.0.1`, not a mixture of `localhost`, old ports, and the fixed address.
- Preserve LF line endings. Engine signatures hash file contents, so automatic CRLF conversion can change generated signatures without a logic change.

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
