# Chart contract v2：计算与资料边界

2026-10-02。基线：main `7734b94` + 阶段 1 审计 `23a4032`。开发分支：`feature/chart-contract-boundary-v2`。采用增量迁移，不增加 UI、知识正文或依赖。

## 四层数据链

原链：Sharp → C# JSON → adapter（身份、派生结构、本地目录、Variable 正文混合）→ UI。

新链：Sharp → C# JSON（补原始组件）→ `chart.raw` / `chart.calculation` → `chart.derived` → 本地资料 lookup → 旧字段兼容 UI。

| 层 | 数据/入口 | 约束 |
|---|---|---|
| A Raw Calculation | `chart.raw` | 保存引擎标识，不当作解释文字 |
| B Normalized Calculation | `chart.calculation` | 类型/权威/角色/定义稳定 ID、通道门号、中心原始状态 |
| C Derived Mechanics | `chart.derived` | 四箭头方向及值 ID、十字门组及角度、有效回路分类、规范化岛组 |
| D Knowledge / Presentation | 本地 catalog、variable-data、content/vocabulary；旧 chart 字段 | 名称、解释、翻译；不是 Sharp 返回的正文 |

本轮没有把旧 chart 中的资料清空。`chart.type.name`、`chart.authority.name`、字符串 `chart.definition`、`chart.variable.*.description` 继续可用。新消费者使用明确的 calculation/derived 字段，不从 description 猜测引擎来源。

## Sharp 原始数据必须保留

`chart.raw` 保存 type、authority、profile、definition、incarnationCross、channels、centers、connectedComponents、birthUtc、designUtc。只复制紧凑标识和时间，不复制庞大资料对象。两侧 13 点的 gate/line/color/tone/base/longitude 仍在 `chart.gates.personality/design` 原值保留，catalog 名称是兼容资料附加。

| 字段 | 原始标识 | 规范化/兼容字段 |
|---|---|---|
| Type | `raw.type` | `calculation.type.id`；旧 `type` 补 id/rawId |
| Authority | `raw.authority` | `calculation.authority.id`；旧 `authority` 补 id/rawId/family |
| Profile | `raw.profile` | `calculation.profile.id` 与旧 profile.id/numbers |
| Definition | `raw.definition` | `calculation.definition.id/rawId/componentCount`；旧字符串保留 |
| Cross | `raw.incarnationCross` | `incarnationCross.rawId`；derived.cross 保留四门与角度 |
| Channel | `raw.channels` | `calculation.channels[].rawId/gates`；旧 channels 原样保留 |
| Center | `raw.centers` | `centerStates[稳定中心ID].rawId/rawActivation/defined` |
| Component | `raw.connectedComponents` | `definitionComponents` / `derived.definitionComponents` |

EgoManifested → egoManifested；EgoProjected → egoProjected。family 同为 ego，只用于兼容旧显示。两者中文显示继续沿用现有意志力/心脏权威，不新增解释。

centerStates 保存 None / FirstComparator / SecondComparator / Mixed。defined 是 `state !== None` 的本地派生布尔值；已有 defined/undefined/open 数组完全保留旧判断。

ConnectedComponents 原格式为中心枚举→整数岛编号。C# 写原字典；JS 按编号分组，中心映射为 head/ajna/throat/g/heart/solar/spleen/sacral/root，并排序以便比较。排序不是引擎编号语义。旧合成 DTO 缺字段时兼容为空分组、componentCount=null，不能把 null 当作已验证的零岛；当前 C# 一定输出字典，无定义图输出空字典、componentCount=0。

原始 UTC 保留完整值；旧 positions 日期和分钟显示不变。

## Variable：计算与原文搬家

`sharp-contract.js` 保留四个激活来源、Color/Tone/Base、Tone≤3 左向规则和 PLL DRL 标准编码。稳定 valueId 不依赖可编辑的显示名称。

24 名称/24 原解释及 6 认知名称原文搬入 `src/lib/human-design/variable-data.js`。adapter 调用必要 lookup 为旧页面附加展示字段；derived.variable 只含 kind/valueId/color/tone/base/direction，无 description。后续正文编辑只改资料入口，不往 adapter 增加解释。

## 有效回路分类

当前正式分类统一使用 `channelCircuit(channel)`。资料库、reference-catalog、transit-presentation 已使用它；本轮 adapter.circuitAnalysis 与 transit-analysis 补全同一入口。derived.circuits 给出 group/circuit。

- 10-34：individual / centering。
- 20-57：individual / knowing。
- topology 将 integration 纳入 individual；旧 catalog 的独立 integration 字段保留作历史元数据。主要回路统计可能因此改变，这是授权的分类修正，不改变计算通道。

**保护边界**：关系与团队源码完全未动。其既有作者启发式仍读取历史 channel.circuit；adapter 保留旧 channel 元数据，使算法、评分、建议输出不随本轮改变。这两个受保护的历史分析入口不是本轮宣称已迁移的有效分类读取者，后续需单独授权迁移。新业务分类逻辑必须调用 topology helper。

320 图中 132 图的 circuitAnalysis 与旧值不同；差异来自统一 group 统计，类型、权威、中心状态、四箭头原文与标准编码等对照没有差异。

## Gene Keys：正式关键词入口

`geneKeySpectrum(gate)` 位于 `human-design/gene-key-spectrum.js`。

canonical：`english-readings.GENE_KEY_DESCRIPTIONS[gate].shadow/gift/siddhi`，与旧 Lens/UI 英文一致；fallback：catalog.GENE_KEY_SPECTRUM。两份原资料都保留。

calculateGeneKeys sphere 和 content.geneKeyTerm 的英文来源都通过该 API；中文仍读原语言字典并保留原双语显示。64 门两份英文关键词全部一致。本轮不改正文、序列或映射。

## 缓存

Sharp provider 出生图 cacheRule 从 adapter-v1 升为 adapter-v2；chart 输出显式带 contractVersion。出生图与敏感度缓存都以 provider.cacheKey 为键，因此只影响必要计算结果。

profile-storage 读取会剔除 cachedData，只存用户输入；没有在 IndexedDB 持久化旧 chart 对象。年度时间轴缓存存激活事件，签名与 chart 展示契约独立，不升级、不删除。正式本机账号/SQLite 不在本轮触及范围。

## 验证与限制

见 [validation.md](validation.md)。Sharp components 与 bridge.js 的 320 图对照一致。时间轴仍保留 natalIslands/bridgeState 算法，没有替换或删除。

本轮不审核知识、不读取老师教材、不引入外部纠正文案、不新增详细弹窗、Penta/Wa 或资料库入口。阶段 1 原审计文件不覆盖，状态追加于 [phase-2-resolution.md](../content-audit/phase-2-resolution.md)。
