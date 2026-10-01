# 覆盖范围、证据与审核界限

## 完整性方法

1. 在最新 main 独立工作树执行；基线与文件哈希写入 inventory.json。
2. `catalog.js` / `english-readings.js` 按导出的数据结构展开对象：64门、384爻、36通道、9中心等，包含每个原文字段。
3. 中文五类阅读 JSON 按同一对象路径关联，逐一比较英文 string 字段是否存在。所有三语正文仍标 unreviewed。
4. vocabulary 导出的对象逐项展开，非导出 JS 字典用 Rollup AST 读取：definition/variable/cognition/type plain/type dynamics/score/roles/planet/messages。
5. 扫描整个 src、worker 的 JS AST，记录静态 import、re-export、literal dynamic import，建立反向可达图。未用文件 grep 替代读者函数检查。
6. 全 JS 抽取 t/contentText/setMessage、较长字符串和 HTML/动态模板候选；保留位置与函数名，避免将正则抽取包装成已审核正文。
7. 运行时入口人工追踪：content、reference-content、vocabulary、createChineseReadings、gateReading、centerReading、channelReading、crossName、geneKeyTerm、chart/reference/connection/team/transits/timeline/export。
8. 计算链人工追踪 C# 以及 JS adapter，逐字段放在 adapter-boundary；不从文件名推断计算来源。

生成器读写边界：只读 repository 文件，写 docs/content-audit 的四个 generated 文件。没有联网请求、教材扫描、用户资料读取、业务计算重写。会执行现有本地纯字典模块的 import，不启动 WASM 或网页。

## 指令要求对应表

| 要求入口 | 覆盖证据 |
|---|---|
| engine-core / engine-wasm | csproj版本、Program.Bridge、TransitCore.SerializeBirth/Calculate；adapter-boundary逐字段 |
| sharp-contract/provider/chartdata | 原始→加工→本地目录→最终 chart；cache/sensitivity；A/B/C/D拆分 |
| catalog/display-data/english-readings | 按对象记录全部导出字典，并按不同知识域分开 |
| content/reference-content/reference-catalog | gateReading/channelReading/centerReading实际调用，资料库索引类别 |
| en / zh-CN / zh-Hant | 五类JSON、术语、UI/context、engine messages/templates、timeline/local |
| Gene Keys | GENE_KEY_SPECTRUM/GENE_KEY_DESCRIPTIONS/序列映射/实际消费分开 |
| planet-reference | 13行星、3来源、3概念三语字典及chart/reference入口 |
| meridian/lenses | 64对象及Lens共用，source unknown，不作医学或教材内容审核 |
| transit-analysis/transits/timeline | Sharp激活与本地结构/区间/动态说明/固定UI分开 |
| line fixing | 上游事实表的注释出处、383规则/54.4缺失及本地算法/显示链，未改规则 |
| connection | 数值harmony、15类型对、authority/profile/bridge/summary与结构类别 |
| penta/team | 9角色、5职业类别、groupType、建议、当前实际渲染字段；无新增Wa |
| chart-data-export | 白名单计算值、显示词汇与crossName；不含长篇解释 |
| other renderer/worker/UI | AST候选、import可达与可选worker路径说明 |

## 统计的单位

- `objects` 是唯一核心知识对象数；同一门有HD、易经、Gene Keys、经络四个记录，属于不同域。
- inventory 的审计条目包括对象、翻译词条、候选源码字符串。易经整卦与六爻子项同时保留，便于人工逐项审，统计长文不得重复加总。
- 一条Gate记录有name/theme；一条阅读记录有keynote/description等。每个字段原文和路径在textFields，canonicalPath指向对象。
- UI字典657键不是全站657句话。源码动态模板和解释性UI句子可能另有记录。
- 1121 hardcoded候选包含HTML/错误/技术字符串；“hardcoded”只表示维护位置，不能作为知识质量判断。
- 353重复候选是完全相同跨文件字符串组。镜像source-key常有意复用；4项确认问题是人工识别的独立维护入口。
- unknown有两种口径：`domain=unknown`（尚不能确定文字类别）与`sourceType`含unknown（代码/文案出处未知），不能混用。
- unreviewed表示尚未专业审核文字正确性，不否定代码读取链已经审计。

## 可达不等于被渲染

inventory的reachableConsumers是import图；usedBy/runtimePath说明对象族的页面入口，不承诺该对象每个字段都显示。例如 centerReading不渲染全部中心字段，Venus/Pearl没有主图面板，团队部分字段只用于建议。

AST从较长字符串判定候选也可能包括技术错误；不要按unknown总数声称有314段知识正文出处不明。门/爻等权威数据对象单独统计，不受这一候选噪声影响。

## 未做的核验

- 未对384爻或64门进行专业知识正确性审核；未评判易经/Gene Keys正文忠于原著的程度。
- 未逐句对比所有Open Human Design/NatalEngine历史版本，代码迁移出处与首次文字作者不完全等同。
- 未把注释中的网站引用当作逐句已核实来源；没有引用外网来改字。
- 未读取老师教材、未搜索教材、未建立教材对照。
- 未运行完整页面所有交互分支来宣称字段一定出现；实际功能测试是现有套件，调用追踪证据另行列出。

这些不影响阶段1的来源地图交付，但应在下一阶段选定审核范围时保留。
