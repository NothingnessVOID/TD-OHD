# Optional local library on the shared main branch

The public site and the Mac install use the same chart, timeline, and
localization code. The password-protected SQLite library is an optional local
mode in this repository, not a separate fork to merge on every update.

| Target | Build | What is included |
| --- | --- | --- |
| GitHub Pages / static hosting | `npm run build:pages` | Static UI and browser-local profiles; no local account UI or `/api/local/*` client code |
| Local Mac install | `npm run build:desktop` | Shared UI plus local password gate and SQLite-backed profile adapter |

The Pages workflow builds from the dedicated `pages` branch in `static` mode.
Pushing `main` does not deploy Pages until those changes are promoted to
`pages`. The local server is never uploaded as a Pages artifact. Hiding a
button alone is not the boundary: the static build excludes the local module,
and Pages has no Node/SQLite process.

The local server is `local/server.mjs`; it listens on `127.0.0.1` only.
`src/lib/local-store.js` is the storage adapter and `src/lib/local-account.js`
provides the password gate. Small conditional hooks in `main.js`, `people.js`,
`connection.js`, and `team.js` remain part of the shared source. This is a
build-time option, not yet a zero-hook plugin.

On the Mac install, `OHD_CONFIG` points to `config.json` under
`~/Library/Application Support/OpenHumanDesign/`. The database, sessions,
and backups live in its `data/` directory, outside the Git checkout and
outside `dist/`. Never commit these files or a personal `.env.*.local` file.
The tracked `.env.desktop` contains only the public build flag.

To update the installed local app, first back up the SQLite database with
SQLite's online backup command, update the shared source, run tests, build in
desktop mode, and restart the LaunchAgent. Verify the password gate, saved
profiles, and timeline before removing the prior installation backup.
