# 按来源分类：代码出处与知识出处分开

## 分类规则

`domain` 是文字讲什么；`sourceType` 是现有仓库能证实它从哪里来；`layer` 标明翻译。Human Design 的一段文字可能来源 natalengine，也可能来源 td-ohd。MIT 归属不能替代逐段知识引用或专业审核。

优先证据：实际读写链、package/csproj、第三方声明、当前源码注释；没有逐句出处则如实标注。未上网纠正现有正文，未导入教材。

## SharpAstrology + Swiss Ephemeris

负责出生/设计时刻的天体位置、六层激活以及类型/权威/人生角色/定义/十字分类/通道/中心状态。SharpAstrology.HumanDesign 1.2.0 与 SharpAstrology.SwissEph 0.5.1 在 `engine-core/SharpTransitCore.csproj` 锁定，Swiss 文件哈希在 `engine-wasm/ephemeris-manifest.json`。

不向本网站返回 64 门长篇解读、384 爻解读、通道长文、Gene Keys 光谱/正文、经络或关系/团队建议。即使类型来自计算，网站显示的类型解释仍从本地 catalog 取。

## NatalEngine 1.6.0 / Unforced Dev 遗留

| 本地资产 | 现有内容 | 来源证据 / 限制 |
|---|---|---|
| catalog.js | 门/通道/中心/类型/角色/权威/回路/爻名/GK 光谱 | THIRD_PARTY_NOTICES 的本地复制声明；没有逐对象原始文章引用 |
| english-readings.js | HD 门/爻/通道、易经卦/爻、Gene Keys | 同上；不能将这三体系统一标为 HD 官方正文 |
| gene-keys.js | 激活/Venus/Pearl 序列球位映射及摘要 | 从旧包适配；11 个主要球位、core/brand 别名，不是新的天文引擎 |
| transit-analysis.js | 通道补全、临时中心、重复激活及 meaning | 非天文结构计算 + 作者解释 |
| connection.js | 15 类型对、权威描述、评分、中心关系、四类通道、桥接、摘要 | 旧包移植后本地维护；评分/措辞不能自动视作标准 HD 定义 |
| penta.js | Career Type、9 中心角色、合组结构、成员连接、建议 | 同上；2–9 人的泛化分析，不等于已经实现完整 Penta/Wa 原理 |
| svg-renderer.js / geometry | 展示与布局、固定标签 | 文字多是显示 UI；geometry 另有 hdkit 来源 |

没有把同一文件里所有字句都标成“直接来自旧包、未变一字”。本报告的 natalengine 标签表示声明的迁移 lineage；修改情况及字句初始作者仍待外部逐项比对。

## Open Human Design 应用层

`src/main.js`、`src/views/chart.js` 等继承原应用的界面与展示组织，并包含 TD-OHD 后续修改。当前代码没有逐句注明谁首创；全站 AST 提供位置，但不能仅凭文件所在目录确定每句话最初作者。需要从上游历史比较才能细分 OHD 原句与 TD-OHD 改写。当前报告不编造这一层的逐句归属。

## TD-OHD 自研及扩展

| 资产 | 域 | 使用 |
|---|---|---|
| sharp-contract.js | vocabulary + human-design | 24 Variable 名称/说明、6 认知名、定义名及适配摘要 |
| planet-reference.js | human-design | 13 行星三语简述、3 来源说明、3 概念正文；注释列 Jovian Archive URLs，但文本是项目摘要 |
| quarter.js | human-design | 64 门季度映射覆盖原有资料；不是修改原文文件 |
| circuit-topology.js | vocabulary/分类 | 本地 10-34 / 20-57 回路显示修正，与 raw catalog 并存 |
| gate-meridian-acupoints.json | td-ohd-extension / meridian | 64 条门→卦→经络→五输穴记录；外部逐条出处 unknown |
| transit-timeline | td-ohd-extension | 时间区间/查询/桥接/图窗/固定标记与 UI 文案 |
| line-fixing-data.js | sharpastrology 事实来源 + td-ohd-extension 本地实现 | 表注释指向 Sharp utility，383/384 门爻有规则，54.4 缺失；759 个 fixing 事实。不含知识正文；色彩不在本轮调整 |
| chart-data-export.js | ui + vocabulary | 已算 chart 的匿名文本输出；无长篇正文，无新计算 |
| local-account.js / local/server.mjs | ui | 可选本机资料库、密码、同步等操作文案；不是 HD 知识 |

## 翻译层

- `zh-CN / zh-Hant` 的 gates/lines/channels/hexagrams/gene-keys：知识对象逐字段译文。
- vocabulary.js：类型、策略、权威、角色、定义、中心、门、通道、回路、行星、Variable 名称；另有类型简短简介。
- engine-messages.json：英文源字符串→译文，包括名称、固定正文、关系/团队解释、Variable/cross 标题等。文件名中的 engine 是旧约定。
- engine-templates.json：数字占位 `{0}` 等动态句式，供 contentText 匹配；不是 UI `{count}` 参数体系。
- ui-*.json / ui-contexts.json：按钮/标签/操作/部分解释性 UI 句子；部分内容含知识断言，不能全部当纯按钮文案。
- timeline.json：时间轴独立 keyed 消息系统；local 的 ui-local.json 在本机 UI 模块加载后 registerMessages。

`createChineseReadings` 会把现有英文门/爻/通道/易经的字段和中文版索引成全文 source-key lookup，再叠加 engine-messages，模板按固定部分长度匹配；最终无法匹配会返回英文。这是实际 fallback 原因之一。

## 其他体系与来源未知

Gene Keys、I Ching 都有独立 domain，和 HD 共用门号不等于共用知识出处。经络 Lens 是本项目扩展，JSON 未给逐记录外部出处，不能推定是老师体系。

unknown 清单在 inventory.json 可通过 `sourceType.includes('unknown')` 筛选；其中也有 AST 技术/错误候选，需要区分“来源不明的知识”与“无须知识出处的操作字符串”。

## 后续外部候选类型

仅预留 `teacher-material` 和 `teacher-extension`。本轮没有任何资产被归为这两类，没有教材条目、引用或对应比较。
