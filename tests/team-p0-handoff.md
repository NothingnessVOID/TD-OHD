# Team P0 B handoff

Branch: feature/p0-team-workspace. Baseline: 1d41435. No push, merge or deployment.

Direct checkbox selection creates a stable Penta on first selection and reuses existing Team member identities. Advanced management preserves unlimited pools, multiple groups, ungrouped members and repository v2. Each member remains assigned to at most one group; each group has at most five members. Formal analysis remains 3–5 with unchanged 13+13 activation validation.

Unknown birth time contract changed: calculate from a copied birth record with effective 12:00 while retaining timeUnknown=true. Original People data is not modified. Result people include memberId/personId/displayName/timeUnknown/estimatedTime. Overview, legend and contributions mark estimated noon. Invalid date, precise missing/invalid time and invalid/missing timezone still reject.

Desktop uses sticky left selection/SVG and separately scrolling right analysis; mobile uses document scrolling. Gate/channel activation focuses the matching persistent article. Default knowledge still uses existing Penta registry evidence, without copied ordinary gate/channel prose.

C integration: in team.js renderResult(), pass detailAdapter: pentaDetailAdapter alongside analysisContainer. Parent imports it from src/lib/shared-object-details.js once available. createPentaMatrix accepts analysisContainer=container and detailAdapter=null; adapter gate/channel/knowledge receive ctx={result,people,groupLabel,onGateSelect,onChannelSelect}. bind(root,ctx) disposer runs before rerender and at disposal. Callback IDs are gate numbers and channel IDs. No C file imported in this branch.

A integration: existing zero-argument onPeopleChange callback remains compatible with event payloads. Baseline deletePerson does not emit that callback; browser deletion test emits the existing ohd-people-changed event explicitly. A's 158dda0 event implementation is not merged here. Person snapshots, generation, group identity, repository revision and external storage changes invalidate results or reject stale completion.

## Actual verification

- npm.cmd ci --no-audit --no-fund succeeded.
- Service: npm.cmd run dev -- --host 127.0.0.1 --port 19962 --strictPort.
- CHROME_CHANNEL=chromium, isolated contexts and fictional fixtures.
- Team unit subset: 16/16 pass including unknown-copy and ten-person 5+5 repository tests; 13+13 completeness unchanged.
- i18n + Penta knowledge + new Team unit subset: 17/17 pass.
- team-direct-e2e: pass (2/3/5/6, 5+5 reopen, uncertainty, edit/delete/external invalidation, desktop scroll, 390px, three languages, keyboard and adapter disposal).
- team-phase1b-e2e: pass.
- team-phase1b-grouping-e2e: pass.
- team-phase1c-e2e: pass.
- team-phase1c-polish-e2e: pass (11 skins, 320/390px, 44px controls, three locales).
- team-phase1e-knowledge-e2e: pass.
- npm.cmd run build:pages: pass; existing large chunk warning.
- git diff --check: pass.
- Full npm.cmd test rerun: 447 total, 432 pass, 12 fail, 3 existing skips. No skips added.

Remaining full-suite failures: knowledge-round2b, knowledge-round2d, knowledge-round2f, knowledge-round2g, penta-phase1b-history-scope, variable-29-content reject changed Team bytes against historical pinned SHA; penta-phase1c-scope reports unreviewed vite.config.js; penta-phase1e-scope and repository-license report invalid Phase1E review scope; local-server expects mode 384 but gets 438 on Windows; no-natalengine reports tests\\team-members-phase1b.test.js (untouched); swiss-parity-fix reports G2015-feb/design/venus speed delta 1.1533139332442488e-8. Frozen manifests, engine and cross-owner files were not edited. Parent owns review resolution.

Old browser assertions were updated explicitly for persistent focused analysis instead of dialogs, advanced management disclosure, and estimated unknown time acceptance. Genuine bad-data assertions retained. Knowledge source inventory/missing-evidence assertions retained. Checkbox hit area includes associated label.

Not run: parent A+C integrated suite, live C adapter content, production deployment, remote push, full non-Team browser suite. Full npm test was not rerun after final UI-only touch sizing/disposal adjustment; direct browser regression was rerun and passed.
