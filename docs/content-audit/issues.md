# 问题清单：只记录，不修复

基线 `7734b94`。所有问题保持 open/unreviewed。本报告不判定 HD/Gene Keys/经络知识本身正确或错误；以下结论来自数据和实际调用链。人工文案审核与产品修改留给下一阶段。

## 下一阶段最优先的 10 项

1. **LOSS-01 权威细分丢失**：Sharp 的 EgoManifested / EgoProjected 合并为 ego，原分类不进入最终 chart。
2. **MISSING-01 定义正文缺口**：只有五类名称，没有独立定义/分岛/桥接解释库。
3. **MIX-01 adapter 混合职责**：适配结果时同时加本地目录、24 条 Variable 解读和摘要，难以分清计算来源。
4. **DUP-01 Gene Keys 两份关键词**：序列与 Lens/展示优先读取不同字典，未来修改容易不同步。
5. **SOURCE-01 经络出处**：64 条对应记录缺逐条外部知识依据，不能猜测为老师材料。
6. **CUSTOM-01/02 关系与团队**：启发式分数、角色和建议容易被理解成 Sharp 计算或标准 HD 结论。
7. **DUP-04 回路双入口**：主要回路统计与资料库/行运回路修正的入口不同。
8. **DRIFT-01/02 三语与模板**：文件字段齐全不等于语义一致；匹配失败有英文 fallback。
9. **LOSS-02/03 原中心状态与岛成员**：简化状态、缺少原始组件输出，使后续审核依赖本地再推导。
10. **PROSE-01 写在 UI 的知识断言**：88 天、70% 等说明需追溯依据，不能只作为 UI 翻译处理。

## information-loss

### LOSS-01：两种 Ego Authority 合并（高）

- 原始 `Authorities` 具有 EgoManifested / EgoProjected；C# SerializeBirth 写 chart.Authority.ToString()，二者仍独立。
- `sharp-contract.js:authorityKeys` 将两者都映射到 `ego`。
- 最终 chart.authority 来自 AUTHORITIES.ego；未保留 raw.authority。
- 影响基础信息、关系权威比较、复制数据和敏感度检查；敏感度使用名称比较，合并后的类别可能无法被区别。
- 已确认信息损失；本轮不拆枚举、不改名称/解释。

### LOSS-02：中心激活来源状态被压平（中）

- C# 原值为 ActivationTypes（None / FirstComparator / SecondComparator / Mixed）。
- JS 用 `v !== 'None'` 得到 definedNames，不保留原始值，最终只剩定义状态及本地中心资料。
- 这是来源细节丢失，不表示“已定义/未定义”本身算错。合图其他来源逻辑仍可从激活重新推导。

### LOSS-03：原库 ConnectedComponents 未进入 JSON（中，契约缺口）

- Sharp HumanDesignChart 具有 ConnectedComponents；SerializeBirth 只序列化 definition、channels、centers 等，不输出岛成员字典。
- adapter 没有原始 component 信息，时间轴从 channels 在 bridge.js 重算 islands。
- 属于引擎→C#桥接的数据可用性缺口；可从结构重构，不等于已证明桥接错误。

补充规范化（不计入以上三项）：designUtc 被格式化到本地分钟；birthUtc/行运 utc 被截为日期；channels、十字枚举字符串转显示对象后无 raw 副本。这些可能是有意显示契约，但追溯来源时需回到 raw 接口。门、爻、色、调、底、经度数值正常保留。

## duplicate：确认的 4 个独立维护入口

### DUP-01：Gene Keys 关键词光谱

`catalog.GENE_KEY_SPECTRUM[gate]` 与 `english-readings.GENE_KEY_DESCRIPTIONS[gate].shadow/gift/siddhi` 都保存 64 组英文词。calculateGeneKeys 读前者；gateReading/geneKeyTerm 读后者。中文又在 gene-keys.json。即使当前一致，也有独立修改入口。

### DUP-02：类型的两种解释版本

`catalog.TYPES[type].description` 与 `en.TYPE_PLAIN / zh.TYPE_PLAIN_ZH` 都解释同一类型；分别服务基础卡与顶部。它们不是逐字相同，可能有意一长一短；属于同概念多版本维护，后续应明确文案职责，不在本轮自动合并。

### DUP-03：季度静态字段与运行覆盖表

english-readings.GATE_DESCRIPTIONS 有 quarter；quarter.js 有独立的 64 门→4 季度表。content.js 覆盖读取结果，41 门原值与有效值不同。原始字段仍在 inventory，effective 差异另存 dependency-map.json。直接绕开 content.js 的读取可能得到不同值。

### DUP-04：回路目录与显示修正

catalog.CHANNELS 保存 circuit/subcircuit；circuit-topology.js 为 10-34 / 20-57 再存修正。reference-catalog 与 transit-presentation 走 channelCircuit；sharp-contract.circuitAnalysis 按 catalog circuit 直接计数。重复分类维护入口已确认，是否应统一属于第二阶段设计决定。

353 个跨文件完全相同字符串仅是自动候选：英文翻译源键、lookup、父子条目与复用模板可重复，不能宣称有 353 个文案缺陷。每条位置见 dependency-map.json。

## mixed-concern

- **MIX-01**：sharp-contract 同时完成结构适配、显示词汇和 Variable 解读，详见 adapter-boundary 的 A/B/C/D。
- **MIX-02**：catalog 混合拓扑、名称、主题、中心/权威等解释与 Gene Keys 光谱；display-data 又把不同体系聚合导出。需要逐字段 domain，不能整文件都标 HD。
- **MIX-03**：ui-*.json 的 source key 包含知识陈述；engine-* 文件既有名称又有分析解释。文件名不足以决定类别。

## unclear-source

- **SOURCE-01**：经络 JSON 无出处，64 条标 td-ohd + unknown。不能据经络名称推定老师体系。
- **SOURCE-02**：旧包英文解读、I Ching/Gene Keys 的逐句作者与原文出处缺失。MIT 声明能证明代码迁移 attribution，不能证明“官方”。
- **SOURCE-03**：Variable descriptions 的 24 句在 adapter 内，当前文件未说明逐句来源。当前维护方为 td-ohd，是否沿用更早资料未知。
- **SOURCE-04**：Open Human Design 应用层与 TD-OHD 的逐句作者边界尚未通过完整上游历史比对；AST 清单包含 UI/错误/HTML 候选，不装作全部有出处。

## unreviewed

inventory 的知识内容审核状态全部保持 unreviewed。代码读取路径已查验不等于知识、译文和医疗相关映射已经专业审校；本轮未审教材、未改这些内容。

## custom-analysis

### CUSTOM-01：关系启发式分数与措辞

PROFILE_HARMONY 写死 0.7 / 0.8 / 0.75 / 0.6；阈值≥0.75 触发 summary 的 natural harmony。TYPE_DYNAMICS 有 15 对固定描述，Authority dynamic 根据类别生成 timing；bridge 数量分段为 Light/Significant/Intense。这些是旧包移植的作者规则，不是 Sharp 返回字段。

数值未直接渲染评分条，不应报告页面有某个不存在的“相容度百分比”。电磁/妥协/主导/伙伴结构判断与建议措辞应分别审核。

### CUSTOM-02：团队中心角色与职业标签

PENTA_ROLES 直接按中心 defined 分配九角色；CAREER_TYPES 由 HD type 映射；recommendations 由缺少角色/职业分布/回路比例/成员数生成。代码支持2–9人，isPenta仅3–5；错误提示提到WA，但没有独立 Wa 对象模型。本轮不重做 Penta、不新增 Wa。

### CUSTOM-03：行运影响解读

transit-analysis.reinforcedGates.meaning 把同门叠加解释为 amplified；significance high/moderate 由 natalGate 是否存在给出，非 Sharp 计算强度。结构与解释应分开溯源。

## translation-drift

- **DRIFT-01**：五类阅读 JSON 的英文/两中文文本字段完整性检查未发现缺字段；这只验证结构，不证明对应语义同版。所有译文仍待专业审核。
- **DRIFT-02**：createChineseReadings 未匹配 source key/模板返回英文；复杂动态组合受排序、句子拆分、递归深度限制。engine-templates 的占位机制与 UI 命名参数并存。
- **DRIFT-03**：Variable 名称的两个入口不同：Appetite 在 vocabulary 译“食欲型”，engine-messages 译“食欲”；四箭头详情实际用前者，contentText 用后者。这是上下文词汇差异，记录但不自动改。
- **DRIFT-04**：经络 Lens 直接显示简体中文，无英文/繁体专属正文，切语言不能自动得到对应语种。
- **DRIFT-05**：季度代理会返回本地化名称，源文件仍是旧英文枚举；如果 raw reader 绕过代理，表现可能不同。

## hardcoded-prose

- **PROSE-01**：chart.js 的行星介绍以“约88天”表述；planet-reference 的概念正文说太阳弧88°。十字面板还有“roughly70%”断言。它们是 t() 包裹的解释句，不是计算事实字段，需建立知识来源。
- **PROSE-02**：sharp-contract 的24条 Variable description；connection/penta/transit-analysis 的动态解释。
- **PROSE-03**：planet-reference 把三语正文内嵌在 JS；现有引用是 module-level 注释，未逐句核对。
- AST 抽取1121项候选，包含纯 UI、错误、HTML 模板及技术字符串。正式专家待审正文需要按 contentType/domain 再筛选，不把这一总数当长篇解读数。

## unused-content

- **UNUSED-01**：Gene Keys Venus/Pearl/core/brand/pathways 生成在对象中，但主图只呈现 Activation 四球，不存在完整其他序列面板。
- **UNUSED-02**：penta 的 circuitBalance/sharedGates/undefinedForAll 等并非全部直接在团队页展示，有些只用于 recommendations；不是完全死代码。
- **UNUSED-03**：engine-messages 存在缺少当前 literal 对应的源键；它们可能通过动态模板/全文 lookup 使用，不能仅因 grep 零命中就删除。
- **UNUSED-04**：worker SEO/OG 是可选服务入口，当前公开静态页面计算不走这些 edge handler。维护英文资料的可达路径仍需保留记录。

## missing-content

- **MISSING-01**：5类 Definition 只有名称，没有独立解释正文或 Split bridge 专属文章。
- **MISSING-02**：Variable cognition 只有6名称，无 cognition.description；界面有可选描述槽，但不表示已存在解释。
- **MISSING-03**：Type/Authority/Profile 没有 referenceEntries 类别。它们有基础卡文本，但无法作为完整资料库条目审核“共用”。
- **MISSING-04**：54.4 Line Fixing 规则在上游表中缺失，本地明确返回 unknown；不等于54.4 HD爻正文缺失。本轮不补。

## 状态

所有问题只保存到本地报告，没有创建 GitHub issue，没有修改生产文字/规则。第二阶段可逐条决定优先级、资料源及是否修改，老师资料由用户另行提供。
