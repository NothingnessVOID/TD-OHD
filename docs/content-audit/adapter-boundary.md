# 计算、适配与文案的逐字段边界

基线同 README。证据文件：[TransitCore.cs](../../engine-core/TransitCore.cs)、[Program.cs](../../engine-wasm/Program.cs)、[sharp-provider.js](../../src/lib/chart-engine/sharp-provider.js)、[sharp-contract.js](../../src/lib/chart-engine/sharp-contract.js)、[chartdata.js](../../src/lib/chartdata.js)。

## 出生图真实计算链

`main.js → computeChart → chartEngine/sharpProvider.calculateBirth → utcInstant → WASM initializeEngine → Bridge.CalculateBirthChart → SwissEphemeridesService → DesignJulianDay → HumanDesignChart → TransitCore.SerializeBirth → JSON → adaptSharpChart → {chart, calculateGeneKeys(chart)} → chartdata cache → 页面`。

WASM 用 file Swiss，`allowMoshierFallback:false`；设计时刻按太阳回退 88°计算。`timeUnknown` 使用 12:00；分钟出生输入转 UTC。cacheRule 固定引擎版本与 adapter-v1。敏感度检查另算 ±15 分钟并比较名称/编码；它不生成知识正文。

## A. C# 层返回的计算结果与最终 chart 对应

| Sharp JSON | JS 做什么 | 最终字段 | 是否附加解释/损失 |
|---|---|---|---|
| birthUtc | 截取日期；原始时间可由输入和时区推回 | positions.personality.date + meta.birthDate/birthHour/timezone | 原始完整 UTC 字符串不保留 |
| designUtc | 日期、按输入时区格式化到分钟 | positions.design.date / dateTime | 原始秒/亚秒精度不保留；不是改算设计时刻 |
| type | typeKeys 枚举映射 → TYPES 本地对象 | chart.type | name、strategy、signature、notSelf、description 来自本地 |
| authority | authorityKeys → AUTHORITIES | chart.authority | 两种 Ego 合并，最终 chart 无原枚举；本地名称/description |
| profile | 删除空格 → PROFILES | chart.profile.numbers/name/theme | numbers 来自 Sharp；名称/主题来自本地 |
| definition | definitionNames 五类文本替换，未知值保留原字符串 | chart.definition | 不是新计算；没有附加独立 Definition 正文 |
| incarnationCross | 去枚举前缀、拆 CamelCase、拆末尾编号；angle 另从 profile 推断 | chart.incarnationCross | 名称源于 Sharp 枚举，angleName/fullName/gates/gateNames 本地构造；原枚举不保留 |
| personality / design.<planet>.gate | 验证门号存在；合并 GATES 对象 | chart.gates.personality / design | gate/line/color/tone/base/longitude 保留；附加 name/iching/theme/center |
| line/color/tone/base | 验证范围；未重算 | 各激活对象原数值 | 正常保留；用于本地 Variable |
| longitude | 保留原值；派生星座与度分秒字符串 | chart.positions 两侧 | 星座/格式是 JS 派生显示，不是正文 |
| channels[] | KeyNKeyM → 匹配 CHANNELS 门号顺序 | chart.channels | name/theme/circuit/subcircuit/centers 来自本地目录；原字符串不保留，未知抛错 |
| centers.<center> | 把非 None 都视为已定义；改中心 key | centers.definedNames | 原中心 FirstComparator/SecondComparator/Mixed 区分丢失 |

使用 cached Sharp 源码快照核对的枚举：`Authorities` 包含 EgoManifested / EgoProjected；`ActivationTypes` 包含 None / FirstComparator / SecondComparator / Mixed；`SplitDefinitions` 包含 Empty / SingleDefinition / SplitDefinition / TripleSplit / QuadrupleSplit。原始源码快照提交 `5d95ece57098fd776df7f2362722c1392a6f06b6`，来源 CReizner/SharpAstrology.HumanDesign。这里只用于核对枚举及库能力，当前实际包版本由 csproj 锁定 1.2.0，不以该源码 HEAD 替代锁定版本。

## B. adapter 生成的派生字段（非 Sharp 原文）

| 派生字段 | 原料与规则 | 使用位置 |
|---|---|---|
| gates.all | 两侧门号去重 | 中心分类、关系、团队、行运 |
| centers.undefinedNames | 未被通道定义但存在激活闸门 | 基础信息/中心详情/复制 |
| centers.openNames | 未定义且没有任何激活闸门 | 中心详情/复制 |
| centers.allUndefinedNames | 合并未定义与全开放 | 本地图结构逻辑 |
| undefined/open.activatedGates | 按中心筛选 gates.all | 中心详情 |
| circuitAnalysis.<group>.channels/names | 从本地通道分类计数 | 基础信息主要回路 |
| circuitAnalysis.dominant | 通道数最多的本地回路组；平局依插入顺序 | 主要回路卡 |
| cross.angle | profile 4/1 并列；5/1、5/2、6/2、6/3 左角；其他右角 | 十字名称/详情 |
| cross.gates | 人格太阳、人格地球、设计太阳、设计地球 | 十字/复制/Gene Keys 激活序列 |
| Variable 四槽 | 设计太阳、设计北交、人格太阳、人格北交的 C/T/B | 四箭头/复制 |
| Variable.arrow | tone ≤3 left，否则 right | 图及四箭头卡 |
| notation / standardNotation | P(动机)(视角) D(摄取)(环境) | 基础卡/复制 |
| digestiveType/environmentType/motivationType/perspectiveType | 四槽 name 的别名 | 对外 chart contract；当前部分字段无页面直接消费 |
| positions.sign/degree | 经度归一化，30°一星座、取度分秒显示 | 行星显示 |
| meta | 输入出生信息、nodeType=true、版本、designSolarArc=88 | 内部来源信息 |
| useEphemeris / summary | 常量/基于本地名称拼接英文摘要 | contract；summary 不是 Sharp 解读 |

## C. 从本地 catalog 附加的资料

- `GATES`：激活对象的 center/name/iching/theme，十字 gateNames。
- `CHANNELS`：完整通道对象，而非单纯计算编号。
- `CENTERS`：中心名称、主题、身体关联、定义状态解释、非自己问题等。
- `TYPES`：类型名、策略、标志、非自己主题、简介。
- `AUTHORITIES`：权威名与一句解释。
- `PROFILES`：人生角色名与 theme。
- `CIRCUIT_GROUPS`：主要回路名与 theme。

这些字典有静态拓扑也有文字。adapter 混合加入它们，并不代表 Sharp 自带这套解释。

## D. adapter 自己硬编码的文案

- `definitionNames`：5 个英文定义名称（vocabulary）。
- `variableNames`：摄取/环境/动机/视角各 6 个名称（24 个 vocabulary）。
- `variableDescriptions`：24 条说明（human-design；来源为当前 adapter 作者层，逐句上游出处未确认）。
- `cognitionNames`：6 个认知名称，仅有名称；没有 cognition.description。
- `signs`：12 星座名（显示词汇，与 HD 正文分开）。
- `angleName/fullName` 的句式，以及 summary 模板。

每项均在 inventory 中保留文本；不改算式、不搬迁字典、不补认知描述。

## 行运与时间轴

行运链：`sharpProvider.calculateTransitSnapshot(s) → Bridge.CalculateTransit(Batch) → TransitCore.Calculate(Batch) → adaptSharpTransit`。C# 输出 utc、13 点六层数值；JS 验证并补 gateName/center、activeGates、date。utc 在适配结果里被裁为日期，页面另保留选定时刻用于 tooltip/复制。

本地继续处理：`analyzeTransitActivations` 补全通道/临时中心/重复激活；`buildTransitGraph` 合图结构；`graph-provider/stateAt` 激活来源；`bridge.js` 固定本命岛的连接；`intervals`/采样/事件模块形成区间。Line Fixing 由本地固定规则表和本命/行运激活计算，非 Sharp 原始字段。

## Definition：目前具备与缺少什么

| 项目 | 当前情况 |
|---|---|
| Sharp 定义分类 | 5 类枚举已经传回 |
| 网站显示 | 5 个名称及定义中心/通道数量 |
| 独立逐类解释 | 无五类 Definition 专属正文表 |
| 引擎 ConnectedComponents | 库可算，但 SerializeBirth 没输出成员列表 |
| 本地岛信息 | bridge.js 从 channels 重算 connected components，返回 islands / connected / complete |
| Split bridge 展示 | 时间轴有 bridge:natal 常驻轨道，显示本命岛由几组连接至几组；不等于已经有 Split Definition 的解释文章 |
| 关系桥接 | connection.js 按合图通道生成 bridgedChannels 与强弱描述；不同于时间轴岛算法 |

LOSS-01/02/03 与其他适配风险见 issues.md。本轮均只记录。
