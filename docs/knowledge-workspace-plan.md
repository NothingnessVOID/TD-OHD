# Knowledge workspace implementation

Base: `14ae78a` · branch: `feature/knowledge-workspace`.

This is a local development project. Publishing and upstream PR updates are separate.
Birth input stays minute precision; transit input retains seconds. English, simplified
and traditional Chinese stay supported. Gene Keys use the existing space-separated
Chinese / English display, without parentheses.

| Batch | Work | Acceptance | Status |
| --- | --- | --- | --- |
| 0 | Baseline, build identity, deterministic/external test separation (F24) | Reproducible local checks | Complete |
| 1 | Birth validation, sensitivity scope, provenance, team validation, static export, share preview (F15–19, F21–23, F25) | No silent input corruption; working export | Complete |
| 2 | Complete catalog, routes, shared contextual detail, six lines, topology, circuits (F01–10, F14, F26–27) | Browse without a chart; all entities reachable | Complete |
| 3 | Line events, contributors, fixing evidence, persistent detail (F11–13, F20) | Line changes and source changes inspectable | Complete |
| 4 | Watchlist, planet filter, event navigation, comparison, condition/bridge queries | Bounded cancellable queries | Complete |
| 5 | Observations, snapshots, storage adapters, import/export | Durable notes and conflict-preserving restore | Complete |
| 6 | Lazy resources, accessibility, mobile regression, final validation (F28, F27) | Three languages and 60/40 mobile layout retained | Complete |

After batch 2: commit, tag `checkpoint/knowledge-library-v1`, save a Git bundle
outside the checkout and record its path. Continue subsequent batches. Restore by
opening a branch at the checkpoint, never discarding later work. Before an actual
installed database migration, make a consistent SQLite backup. Development uses
synthetic profiles and isolated test databases.

## Required scenarios

- No profile, inactive channel, no defined channels, multi-partner gates, multiple
  planets/sides/lines for one gate, refresh/history/locale changes.
- Minute links round-trip; invalid dates/offsets/nonzero birth seconds are rejected;
  unknown time is explicit; DST and transit precision remain covered.
- Same-gate line crossings, contributor changes, clipped intervals, cancellation,
  chart-switch isolation, actual natal-component bridge paths.
- Invalid/excess team members, >10 connections, static PNG export, anonymous sharing.
- Observation reload/restart/import conflicts and desktop cross-browser access.
- English/简体中文/繁體中文, light/dark, keyboard and phone gestures.

Professional Penta/Wa reconstruction, licensed originals, AI interpretation and new
cloud accounts are out of scope. Synthesized readings retain source attribution;
missing fixing rules remain unknown. Independent ephemeris validation is reported
separately from UI and regression tests.

## Baseline evidence

2026-09-26: 144 tests, 142 passed, 2 failed on external geocoding fetches.
Static and desktop builds passed; static bundle excludes local account client.
The installed desktop source tree and dist matched main, although its local Git
history predates the privacy rewrite. No installed data is used by development.

## Delivery log

Implementation entries record commit, checks, preview and remaining limitations.

| Batch | Committed revision(s) | Evidence gate |
| --- | --- | --- |
| 0 | `b7a4206` | Deterministic baseline and build identity |
| 1 | `3a40a88`, integrated in `f5253b0`, boundary follow-up `813e04a` | Birth/share/team tests and static PNG browser check |
| 2 | `f5253b0`, `4c15794`, provenance follow-up `48f40cd` | Catalog coverage and `checkpoint/knowledge-library-v1` bundle |
| 3 | `5342b67` | Line/source events and persistent detail browser check |
| 4 | `be4a8d6` | Watchlist, comparison and cancellable query browser check |
| 5 | `acb878a` | Static/desktop observation persistence and restore checks |
| 6 | `82945d7`, `69c2027` | Lazy locale, keyboard, phone and full timeline regression |

- Batch 0: 143 deterministic tests passed, 2 external geocoding tests skipped by
  default and available via `npm run test:external`. `npm run build:pages` passed;
  the generated `dist/build-info.json` reports the exact source revision, engine
  dependency and build timestamp. Commit `b7a4206`.
- Batch 1: core validation, share/export utilities and team admission committed
  as `3a40a88`. The visible share dialog, export button, provenance and saved
  input feedback landed in the following integration commit because the old
  chart/main views and new library share navigation and styling. A synthetic
  browser run showed a PNG success state, and the runtime now verifies its PNG
  signature before reporting success. No personal birth data was used.
- Batch 2: one index for nine centers, 36 channels, 64 gates, 384 lines, three
  circuit groups, six ordinary circuits and the distinct Integration network.
  Channel reverse aliases and both Chinese variants are searchable independent
  of the active display language. Hash routes work after reload without a
  chart, and omit birth parameters. Existing chart, transit, relationship and
  timeline details link to the same localized source catalog. The no-profile
  transit page uses sky-only mode. Structural references are recorded in
  `docs/knowledge-sources.md`; imported reading text is not represented as an
  original licensed edition.
- Batch 2 integration commit: `f5253b0`. The checkpoint tag points to the
  documentation follow-up commit immediately after it; its recoverable bundle
  is kept outside this checkout at `../TD-OHD-recovery/knowledge-library-v1.bundle`.
- Validation at the checkpoint: 150 deterministic tests passed, two optional
  external tests skipped; static and desktop builds passed, Pages bundle check
  excluded local-account code, and all existing browser E2E checks passed with
  a deterministic English locale. Browser spot checks covered library routes,
  three lenses, both Chinese choices, anonymous share preview, and sky-only
  mode without a birth chart. The large first-load content bundle remains for
  batch 6. Numerical engine accuracy has not been independently certified.
- Batch 3: the default timeline remains gate-level; selecting line-level adds
  384 optional line tracks and recognizes same-gate line crossings without
  ending a continuous gate or channel interval. Planet contribution changes
  are kept as separate source events and shown alongside the interval. The
  existing line-fixing table is linked to its versioned MIT source, with the
  absent 54.4 rule still explicitly unknown. A fixed modal detail can be
  switched to a small non-modal following card for scrubbing without reopening
  the item. Inactive tracks are opt-in. The one-minute scan limit and
  approximate crossing tolerance remain visible rather than presented as
  independently certified astronomical precision. Verification: 152 local
  tests passed, two optional external geocoding tests skipped; static build
  and local-account exclusion check passed. New browser checks cover line
  tracks, rule source, selected line and the follow/fixed switch.
- Batch 4: a per-browser, non-sensitive ID watchlist; one-planet timeline
  calculation and matching graph; previous/next event navigation; A/B active
  entity differences; and worker-backed condition searches for channel,
  center, specified line and a real path between natal definition islands.
  Results stay within the calculated interval, expose matching times and
  channel paths, and can jump to the source item. Recalculation and profile
  changes cancel stale query workers; search and long timeline calculations
  also have explicit cancel controls. A missing result is reported as missing
  only in the selected range. Verification: 156 tests passed, two optional
  geocoding tests skipped; static and desktop builds passed, with the static
  bundle excluding local-account code. Browser checks covered watchlist
  persistence after a fresh navigation, single-planet consistency, A/B,
  line-query jump and calculation cancellation. Watchlist IDs remain local to
  one browser; observation records use the separate storage work in batch 5.
- Batch 4 commit: `be4a8d6`. The full timeline browser suite, including
  mobile touch and layout checks, passed before this commit.
- Batch 5, commit `acb878a`: a standalone observations view stores the immediate
  observation, later interpretation, real-world event, tags, optional person
  link or anonymous code, UTC instant, display zone and an optional timeline
  snapshot separately. Static mode uses IndexedDB; desktop mode uses an
  authenticated additive SQLite table. Export supports full and deidentified
  files; the latter removes person links, labels and chart snapshots and warns
  that names inside free text remain. Restore
  previews additions/conflicts/unchanged notes and keeps conflicting versions
  as copies. The installed SQLite database received a consistent pre-migration
  backup at `backups/before-observations-2026-09-27.sqlite`; its integrity
  check returned `ok`. Development tests use isolated synthetic databases.
  Verification: 161 deterministic tests passed, two optional external tests
  skipped; both static and desktop builds passed; the static bundle check
  excluded local-account code. Browser checks covered anonymous notes,
  reload/edit, language switching with an unsaved draft, mobile width,
  deidentified export, conflict-preserving restore, timeline snapshot, and
  independent desktop browser sessions. The existing non-year timeline
  browser regression passed after a medium-width header overflow fix; the
  year-range behavior was already validated in batch 4. Local preview remains
  available at `http://127.0.0.1:5173/` with synthetic examples only.
- Batch 6: English and unsupported browser languages load without fetching
  either Chinese reading catalog. Each Chinese catalog is fetched once when
  selected; compact terminology and hexagram names remain available for
  cross-language search and hover labels. Long I Ching prose is excluded from
  the initial entry chunk. Locale switching retains the library hash route and
  reading position, and the editor keeps keyboard focus when opening a note.
  A DST-gap wall time is rejected rather than silently normalized. Existing
  desktop and mobile timeline layouts and interactions remain unchanged.
  Verification: 161 deterministic tests passed, two optional external
  geocoding tests skipped; static and desktop builds passed; the static bundle
  excludes local-account code. Production-bundle browser checks proved lazy
  language loading and position retention. The full timeline browser suite,
  workspace keyboard/small-screen checks, static and desktop observation
  persistence, and the original end-to-end chart suite passed. `git diff
  --check` passed. The initial application entry still exceeds Vite's 500 kB
  advisory threshold; this does not include the deferred Chinese prose.
- Final scope audit: the original chart panel's channel, gate, planet and
  incarnation-cross entries now expose focusable button semantics and keyboard
  activation. The design-date panel copy names the 88° solar-arc rule rather
  than suggesting a fixed 88-day subtraction. This was checked against Jovian
  Archive's Human Design Dictionary and chart-calculation explanation; the
  engine's independent numerical accuracy remains unclaimed.
- The source label for synthesized readings opens a short provenance disclosure;
  the reading itself is never hidden behind it. Share parsing now rejects
  empty/partial coordinates and invalid IANA zones. After those follow-ups,
  `npm test` reports 162 passed, 2 optional external checks skipped and 0
  failures. The local checkpoint deliberately remains at the original batch-2
  version; the follow-ups are on this branch and do not rewrite it.
