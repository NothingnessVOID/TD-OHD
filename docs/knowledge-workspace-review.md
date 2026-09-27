# Knowledge workspace change list and review guide

Branch: `feature/knowledge-workspace` · base: `main` at `14ae78a`.
This branch is for review in the TD-OHD fork. It has not been merged into `main`
or deployed to Pages/Netlify. The independent numerical accuracy of NatalEngine
and the candidate line-fixing table is not certified by these UI tests.

## 中文修改清单

1. 统一出生资料、分享链接与保存入口的分钟级校验；补齐无效时区、坐标、团队人数和结果检查；提供分享字段预览、匿名链接与静态图片导出。匿名链接省略姓名、地点、坐标和 IANA 名称，但仍含出生日期、时间及 UTC 时差。
2. 增加不依赖出生图的资料库，可搜索并查看中心、36 条通道、64 个闸门、384 条爻线、回路及基础概念，未激活条目也可阅读；各页面复用同一正文来源并标注解读出处。
3. 扩展时间轴：爻线事件、行星贡献来源、持续详情、关注清单、单行星筛选、前后事件、A/B 比较及可取消的条件查询；保持现有手机布局和操作。
4. 增加观察记录和备份：网页端使用 IndexedDB，本机桌面模式使用已有登录保护下的 SQLite 新表；支持去标识化导出、恢复预览和冲突副本。
5. 简中与繁中长篇资料改为按需加载；语言切换保留阅读位置；补键盘入口和专业来源说明。基因钥匙保留现有“中文 English”格式，不加括号。
6. 增加构建版本信息、测试与资料库恢复点。开发分支未合并到 `main`，也没有更新 Pages、Netlify 或上游 PR。

## What changed

1. **Input, sharing and team boundaries.** Birth records and shared URLs use one
   minute-precision validator. Invalid dates, times, UTC offsets, coordinate
   pairs and IANA zones stop calculation instead of becoming a plausible noon
   chart. Explicit unknown birth time remains separate. Sharing previews its
   fields and offers an anonymous URL that omits name and place but retains the
   calculation fields. Team membership and result counts are checked; the
   existing team view is labeled as a chart overlay, not a specialist Penta/Wa
   implementation. Static builds can download a verified PNG.
2. **Chart-independent knowledge library.** Centers, all 36 channels, 64 gates,
   384 Human Design lines, circuits and basic concepts have searchable,
   refreshable hash routes. An inactive channel can be read without a birth
   chart. The natal, transit, relationship and timeline interfaces link to the
   same content catalog while retaining their contextual activations. Source
   metadata distinguishes upstream synthesized readings from original texts.
3. **Timeline detail and analysis.** Optional line-level tracks detect changes
   such as `14.1 → 14.2`; continuous activation bars keep separate planet
   contribution events. Details can follow the selected time or stay fixed.
   Watchlists, one-planet filtering, adjacent-event navigation, A/B comparison
   and cancellable condition queries cover channels, centers, lines and natal
   definition bridges. Cache identity includes the event level, planet and
   shared rule version. The existing mobile 60%/40% chart/timeline layout and
   24-hour local-day behavior are retained.
4. **Observation records.** Immediate observation, later interpretation,
   real-world event, tags, optional person link and chart snapshot are separate
   fields. Static sites use IndexedDB; desktop mode uses an authenticated,
   additive SQLite table. Full and deidentified exports, restore preview and
   conflict-preserving import are available. Deidentification removes explicit
   linkage and snapshots; it does not inspect names typed into free text.
5. **Localization, loading and access.** English remains the fallback. Simplified
   and Traditional Chinese reading catalogs load on first use, with compact
   terminology available for search. The existing Gene Keys presentation stays
   `中文 English`, without parentheses. Language changes retain the knowledge
   route and reading position. Natal channel, gate, planet and incarnation-cross
   entries now support keyboard activation; source metadata is expandable
   without hiding the reading.
6. **Build and recovery.** Builds write source revision, target, engine and rule
   versions without birth data. The batch-2 recovery tag is
   `checkpoint/knowledge-library-v1`; a verified Git bundle is kept outside the
   checkout. No production database is migrated as part of this branch.

## Review starting points

| Question | Files |
| --- | --- |
| Can invalid or ambiguous birth data reach calculation or storage? | `src/lib/birth-input.js`, `src/lib/share.js`, `src/lib/people.js`, `src/views/entry.js` |
| Do all library routes and contexts show the same reading and correct topology? | `src/lib/knowledge-catalog.js`, `src/lib/knowledge-topology.js`, `src/views/knowledge.js`, `src/views/chart.js` |
| Are timeline transitions, cache keys, cancellation and bridge paths correct at range edges? | `src/features/transit-timeline/{core,client,query,query-client,provider,view}.js` |
| Can an observation import overwrite, leak or misattribute a person's data? | `src/lib/{observation-record,observation-store}.js`, `src/views/observations.js`, `local/server.mjs` |
| Are lazy locales and account code isolated between static and desktop builds? | `src/locales/index.js`, `src/lib/i18n.js`, `src/main.js`, `vite.config.js`, `scripts/build-info.mjs` |
| Are wording and provenance claims proportionate to the source? | `docs/knowledge-sources.md`, `docs/localization.md`, the locale catalogs |

## Verification and known limits

- `npm test`: 163 passed, 2 optional external geocoding tests skipped, 0 failed.
- `npm run test:localization`: 30 passed.
- `npm run e2e:locales`, `npm run e2e:timeline`, `npm run e2e:observations`,
  `npm run e2e:workspace`, and the original browser E2E suite passed locally.
- Both `npm run build:pages` and `npm run build:desktop` passed. The static bundle
  check confirmed that local-account client code is absent. The entry chunk
  still exceeds Vite's 500 kB advisory threshold; Chinese long-form prose is
  deferred until its language is selected.
- The line-fixing source lacks rule `54.4` and has not been independently checked
  against every official output. The interface preserves an unknown state.
- These checks do not constitute independent ephemeris certification, a screen
  reader audit, a security audit of all dependencies, or a license for paid
  Human Design source texts.

Batch-by-batch status and commit IDs are in
[`knowledge-workspace-plan.md`](knowledge-workspace-plan.md).
