# Penta reading UI v1

Base: f7cb220. UI source commits: 02b5b10 and bf6ad20. Knowledge source 7a85dab and knowledge tests ae39af9 were cherry-picked into the isolated feature/penta-reading-v1 worktree.

## Delivered behavior

- 12 Penta gates, six Penta channels and 11 mechanism articles; 29 total, preserving 21 original identities and appending eight mechanisms.
- Team links to `#library?filter=penta`. The three original diagram background entries remain; one More mechanisms link opens `#library?filter=penta-mechanism`.
- Library retains 64 general gates and 36 general channels. It has 228 total entries, including 29 Penta entries. Default Knowledge inventory remains 70; explicit includePenta inventory is 99.
- Summary and Detail remain independent slots. The summary policy and reference index never resolve Penta Detail. Detail failure or absence does not suppress a valid Summary.
- Penta entry/slot policy validates package/version/editorial actor and status, known normalized sources with nonempty locator and scope/use, reviewed source slots and exact localized package field identity. Packaged content cannot borrow the old structural verified path. Human approval metadata is retained without suppressing later approved content.
- Penta uses the existing escaped multi-paragraph article renderer. Existing non-Penta renderer branches, general gate/channel readings, contributor data, chart coordinates, colors, computation and stores are unchanged.
- Penta names come from Knowledge entries; complete hexagram names come from vocabulary hexagramName, including library gate articles.

## Verification

`node --test tests/penta-reading-ui.test.js tests/shared-object-details.test.js tests/reference-catalog.test.js`: 10 passed, 0 skipped on bf6ad20. Includes all 87 localized entries, independent slots, Detail throwing while Summary and index remain readable, unknown sources, incorrect review status, humanApproval=true, verified legacy rejection and unchanged general readings.

`node tests/penta-reading-v1-e2e.mjs`: 261 entry reads, 29 × three languages × widths 1440/390/320. Exercises four lenses, gate→channel→gate→Back, contributor/member focus, Escape focus restoration, independent multi-paragraph article text, mechanism filtering/back navigation and horizontal overflow checks. Produces 27 screenshots under `artifacts/visual-review/penta-reading-v1`.

`E2E_URL=http://127.0.0.1:19979 node tests/team-phase1e-knowledge-e2e.mjs`: three locales and three original background dialogs passed; 70/99 inventory and editorial metadata verified.

Existing public Knowledge regression subset (access/content/layer/polish) passed 28 tests before the isolated policy follow-up. Vite production build passed with reused WASM, with existing optional font CSS and bundle-size warnings. Parent integration owns the final full source-scope audit and broader old E2E migration.

An integration mismatch was reported to the parent in the content-agent-owned `penta-knowledge.test.js`: its last test still expected Penta excluded from referenceEntries and old direct verified-only matrix reads. Its general gate/channel counts and default 70 inventory assertions remain applicable.

## Local preview

Loopback port 19979 was free before startup. Vite explicitly binds `127.0.0.1:19979`; node_modules and public/engine reuse junctions to the base checkout. No engine/store source, push, main change or deployment was performed. Only fictional fixtures were used in browser tests.
