# Round 2F：视角／动机偏离状态

本轮将视角的 Distraction 与动机的 Transference 展示为条件性的「偏离状态」。先解释正确状态偏离时可能转向的方向，再展示配对与具体正文。不对用户此刻的心理状态作判断。

## 基线与边界

- 实际起始 SHA：`fa1d6afba38ebe0128b517a565123c827340554d`。
- 任务指定旧 SHA `cee5ebcd7f611c243c2e2b02ef9f26d725712384` 的 fast-forward 后继，保留闸门图标对齐修复。
- 分支：`fix/variable-deviation-state-v1`。提交并推送该分支，不合并 main、不部署。
- zh-CN 使用任务提供的 12 段批准正文；zh-Hant 独立忠实翻译；English 独立表述，并明确不是第二项特质／第二个动机。
- 未读取额外老师文件，也未进行外部知识核查。

## 最终配对与修改条目

以下 objectId 的 `detail.distraction` 或 `detail.transference` 在三个语言资源中替换，共 36 个正文范围；对应 section 增加结构 metadata。

| 类别 | sourceValue | targetValue | section |
|---|---|---|---|
| Perspective | survival | wanting | distraction |
| Perspective | possibility | probability | distraction |
| Perspective | power | personal | distraction |
| Perspective | wanting | survival | distraction |
| Perspective | probability | possibility | distraction |
| Perspective | personal | power | distraction |
| Motivation | fear | need | transference |
| Motivation | hope | guilt | transference |
| Motivation | desire | innocence | transference |
| Motivation | need | fear | transference |
| Motivation | guilt | hope | transference |
| Motivation | innocence | desire | transference |

完整内容 key 为 `variable.{类别小写}:{sourceValue}`。没有修改 `wanting` 的稳定身份或正式显示名称。

## 共享展示

`detail-renderer.js` 根据 `kind: deviation`、`sourceValue`、`targetValue`、`terminology` 生成区块。名称通过当前语言的 Knowledge registry 获取，renderer 不维护 Color 名称副本、不搜索正文推断配对。

顺序保持：Summary → Intro → Tone 分支 → 偏离状态。标题为「偏离状态／偏離狀態／Off-track State」，下方保留 Distraction／Transference 术语副标题和机制说明。

流程标注「正确视角／正确动机 → 可能的偏离方向」，呈现为垂直 A ↓ B。仅使用现有 theme token，没有警报样式或另一套 palette。UI 术语使用专属 Variable message key，保留已有其他体系的 Distraction 词条。

Chart modal 与 Reference Library 使用同一 renderer。区块不依赖 chart context；只有 numeric Tone 决定「你的」标记，偏离目标永远没有该标记。Variable 区块没有「非我主题／Not-Self Theme」。Type 的正式 Not-Self Theme 保持原状。

## 内容保护

- 12 个目标的 Summary 全部未改；全部 165 个语言摘要未改。
- 12 个目标的 Intro、Tone 1–3、Tone 4–6 字符与范围 metadata 未改。
- 43 条 × 3 语言，即其余 129 条 Knowledge 的 Summary、Detail、metadata 与实际基线保持一致。
- Determination 6 条、Environment 6 条全部未改，也没有新增偏离区块。
- `tests/fixtures/knowledge-round2c-content.json` 保留原始历史哈希，没有覆盖。
- 历史 Round 2B/C/D/E 测试接入精确授权 diff assertion，不把基线整体换成新内容；首先验证实际起始内容仍匹配 Round 2C fixture，再验证只有这 36 个范围改变。
- 新增 `knowledge-round2f-deviation.json` 只记录本轮 36 个批准范围的哈希，未复制正文。

Engine changed = false；Variable calculation changed = false。SharpAstrology、TransitCore、Color/Tone/Base、Arrow direction、mapping、主页、复制数据、关系与团队代码均保持原样。

## 验证

具体结果及复现信息见 `round2f-validation.json`。

| 验证 | 结果 |
|---|---|
| npm test | 341 passed / 0 failed / 3 skipped |
| test:localization | 34 passed |
| test:timeline | 63 passed |
| 最终内容／范围／pairing／renderer 集合 | 32 passed |
| build | passed；已有大 chunk 提示保留 |
| 偏离块 E2E | 72 个案例，每个验证 modal 与 library |
| 共享 Knowledge presentation E2E | 132 个案例，每个验证两种 surface |
| BodyGraph 回归 | 24 个 DOM、文字、几何对照 |
| 复制数据 E2E | passed：三语言、出生图、行运、时间轴及真实剪贴板 |
| 主页排版对照 | 1224 / 903 / 664 / 390 × en / zh-CN / zh-Hant，共 12 组完全一致 |

偏离块 E2E 覆盖 Survival、Power、Personal、Fear、Desire、Innocence。Unit test 覆盖完整 12 个配对 × 三语言、Tone 上下界与 Library 无 context、无正文匹配、neutral tokens。

三个 skipped 是默认关闭的在线地名／地理编码测试。初次环境配置和 Vite reload 导致的失败、最终重跑结果均记录在 validation 中。没有待修复的本轮项目。

## 修改文件

运行／资源：

- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/detail-access.css`
- `src/locales/ui-contexts.json`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-Hant/ui-chart.json`

测试：

- `tests/helpers/knowledge-round2f-contract.js`
- `tests/fixtures/knowledge-round2f-deviation.json`
- `tests/knowledge-round2f.test.js`
- `tests/knowledge-deviation-e2e.mjs`
- `tests/knowledge-round2b.test.js`
- `tests/knowledge-round2c.test.js`
- `tests/knowledge-round2d.test.js`
- `tests/knowledge-round2e.test.js`
- `tests/knowledge-polish.test.js`

文档及源文件保护：

- `docs/frontend-knowledge-sync-v1/validate.mjs`
- `docs/knowledge-layer/round2f-scope.json`
- `docs/knowledge-layer/round2f-validation.json`
- `docs/knowledge-layer/review-round2f-deviation.md`
