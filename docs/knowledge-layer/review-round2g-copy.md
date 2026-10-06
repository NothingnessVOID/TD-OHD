# Round 2G：Variable Copy Finalization

## 基线与范围

- 实际起始 SHA：`e731e69b91ea1ce083a4a8b023d2dd660c08735e`。
- 基线：`origin/fix/variable-deviation-state-v1`，已 fetch 并核对。
- 独立任务分支：`fix/variable-copy-localization-v1`。
- 本轮只修改 Perspective / Motivation 的 12 个目标 Detail、对应 ranges、批准的 UI 消息及 Need 中文名称，保留其他内容和算法。

## 内容验收

| 项目 | 结果 |
|---|---|
| zh-CN 12 条 Detail | 逐字采用任务批准全文 |
| zh-Hant 12 条 Detail | 逐字采用任务批准全文 |
| English 12 条 Detail | 逐字采用任务批准全文 |
| Summary changed | false，165 条语言记录全部保持基线 |
| 其他 43 个知识对象 | 三语言 129 条记录完整保持 Round 2F |
| Need zh-CN / zh-Hant | 需求动机 / 需求動機 |
| Perspective UI | 偏离状态 / 分心；繁体与英文使用各自定稿 |
| Motivation UI | 偏离状态 / 动机转移；繁体与英文使用各自定稿 |
| Flow | 原本视角／动机 → ↓＋偏离时 → 可能转向；中文节点显示完整 XX视角／XX动机 |
| 中文页面英文括号中文 | false，目标正文与偏离区块不使用这种名称拼接 |
| Pairing changed | false |
| Determination changed | false |
| Environment changed | false |
| Engine changed | false |
| Variable calculation changed | false |

名称继续通过现有 Knowledge Registry / vocabulary 读取。英文节点保留原有名称（例如 Need），没有另造英文身份或拼接名称系统。

正文完全来自本轮用户批准的三语言文本，没有自行翻译、润色或增补。所有目标的结构为 Intro、Tone 1–3、Tone 4–6、Deviation；Deviation range 仅包含最后的具体偏离段落。一般机制说明由共享 renderer 使用批准的 i18n 文案显示。

## 精确性与历史保护

`tests/fixtures/knowledge-round2g-copy.json` 保存 36 条完整预期字符串，测试逐字比较实际 Detail，未仅依赖 hash。144 个 section range 的切片也逐项比较完整预期正文。

Round 2C 和 Round 2F 历史 fixture 未修改。原 Round 2F 的追加段落与 prefix 保护测试仍对不可变历史提交运行；当前输出额外与 Round 2G 定稿比较。来源 guard 增加有明确基线和 10 个批准资源文件的 Round 2G scope，其他受保护运行文件仍受原合并来源检查。

## 测试与浏览器验证

| 检查 | 结果 |
|---|---|
| npm test | 347 passed，0 failed，3 skipped |
| localization | 34 passed，0 failed |
| timeline 单元测试 | 63 passed，0 failed |
| Knowledge / Variable / exact-copy 聚焦测试 | 44 passed，0 failed |
| source / distribution guard | passed，429 个受保护文件；engineSignature 保持 59b90e629033cc7faf95 |
| npm run build | passed，只有既有大 bundle advisory |
| deviation E2E | 72 组案例，每组验证 Modal 和 Library |
| Knowledge presentation E2E | 132 组案例，每组验证 Modal 和 Library |
| BodyGraph regression | 24 组 DOM／文字／几何对照通过；timing 与 controller 切换通过 |
| Copy Data | 三语言真实剪贴板、出生图、行运、时间轴、loading guard、无新增计算，全部通过 |
| Timeline E2E | timeline、gestures、mobile touch、mobile layout 四个脚本全部通过 |
| responsive | 1224、903、664、390 × en／zh-CN／zh-Hant 全部通过，无溢出 |
| Home layout comparison | 12 组基础卡与 Variable 卡文字、数量、宽高与 Round 2F 完全一致 |

3 个 skipped 为默认关闭的联网城市搜索、联网地理编码与未知地点报错测试，不属于本轮知识展示修改路径。

首次 BodyGraph 对照在旧基线 Vite 服务的热更新状态下打开详情超时；重启同一个基线服务后，完整 24 项对照通过。未为此修改生产代码或放宽断言。

Need 的显示名是本任务明确批准的变化；若图表本身选中 Need，它将显示需求动机／需求動機。除此之外，主页摘要、卡片布局、信息密度保持原样。关系、团队、复制数据、时间轴与计算源文件保持基线。

## 修改文件

- `docs/frontend-knowledge-sync-v1/validate.mjs`
- `docs/knowledge-layer/review-round2g-copy.md`
- `docs/knowledge-layer/round2g-scope.json`
- `docs/knowledge-layer/round2g-validation.json`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/detail-renderer.js`
- `src/locales/ui-contexts.json`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-CN/vocabulary.js`
- `src/locales/zh-Hant/ui-chart.json`
- `src/locales/zh-Hant/vocabulary.js`
- `tests/fixtures/knowledge-round2g-copy.json`
- `tests/helpers/knowledge-round2f-contract.js`
- `tests/knowledge-deviation-e2e.mjs`
- `tests/knowledge-round2b.test.js`
- `tests/knowledge-round2f.test.js`
- `tests/knowledge-round2g.test.js`

## Git 与后续

提交消息：`fix: finalize Variable copy and localized deviation labels`。

提交并推送该独立分支，核对 origin 与本地 SHA 一致；最终 SHA 由交付回复提供，避免提交内容自引用。

不合并 main，不部署。未解决事项：无。
