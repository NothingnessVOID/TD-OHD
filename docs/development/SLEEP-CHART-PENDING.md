# 睡眠图（DreamRave）待办与接续说明

**这份文件的用途**：下次继续做睡眠图时，先读这一份。它只记「还差什么、差在哪、怎么接进去」，
不重复架构说明。架构、决策依据、分层结构和已验证事实见同目录的
[SLEEP-CHART-PLAN.md](./SLEEP-CHART-PLAN.md)。

最后更新：2026-10-27
分支：`hana/15-0-09-15`（未合入 `dev/windows-development`，未推送）

---

## 0. 当前状态一句话

睡眠图的**结构与计算已全部完成并验证**：五中心／十五闸门／六通道／三门户、月亮 −88° 设计时刻、
三种睡眠类型、三域划分、行运始终叠加（时刻可选，与行运页共用同一个时间控件）、
横向图形、门户存根、点击详情、页面内双人合盘（复用共享选人弹窗，
且左右两侧行星列与单人图是同一个组件）。
术语已统一到共享键 `"Transit"`（简中「行运」），详见 §3.5。
**缺的只有「内容」**——老师要口述的那批梦境专属解读文字，以及两项待查证的事实。

代码可以直接用，界面上显示的是清醒图的解读正文（这是老师明确要求的过渡状态：
「描述用的是清醒的时候这些描述」）。

---

## 1. 等老师给资料才能做的（内容层，共四项）

这四项都**只有文字内容缺失，接入位已经留好**，不需要改结构。

### 1.1 梦境通道的另一套定义

老师原话：「梦境图的通道是这样子的啊，它也是有另一个定义啊。」

- 现状：六条通道（1-8、5-15、20-57、27-50、28-38、42-53）显示的是清醒图的通道名，
  取自 `src/lib/vocabulary.js` 的 `channelName()`，最终来自 `src/lib/human-design/catalog.js` 的 `CHANNELS`。
- 接入点：在 `src/lib/dream-vocabulary.js` 增加 `dreamChannelName(gates)`，
  与现有的 `dreamGateName` / `dreamLineTheme` 并列；三语各加一份数据
  （`src/locales/en.js` 内联、`src/locales/zh-CN/dream.js`、`src/locales/zh-Hant/dream.js`）。
- 消费方：`src/views/dream.js` 的类型条与场域通道列表、`src/lib/dream-detail.js` 的通道详情。
  这几处目前都调 `channelName()`，改为调新函数即可，**不要改 `channelName()` 本身**，
  否则会污染出生图／行运／时间轴／关系／团队所有页面。
- 稳定 ID 仍然是 `"1-8"` 这样的字符串，翻译只影响显示。

### 1.2 天时激活通道的另一套定义

老师原话：「然后另一个是天时激活的通道，这个也是也是另一个定义啊。」

- 现状：`src/lib/dream-chart.js` 的 `buildDreamTransitGraph()` 已经区分出四种通道来源
  （`natal` / `transit` / `completed` / `inactive`），`completed` 就是「天时补全的通道」。
  显示时用的是 `src/lib/transit-graph.js` 的 `TRANSIT_SOURCE_LABELS`（清醒图行运的措辞）。
- 接入点：如果老师给的是**独立的一套名称**，在 `dream-vocabulary.js` 加
  `dreamChannelSourceName(source)`；如果只是措辞不同，改 `ui-dream.json` 里对应的 key 即可。
- 消费方：`src/lib/dream-detail.js` 的通道详情徽章、`src/views/dream.js` 的
  `CHANNEL_STATUS` 表（四态文案在那里）。

### 1.3 十五个闸门的重新定义

老师原话：「这15个闸门呢，它会重新定义了它这个作用，名字不一样。」

- **名字已经做完**：`DREAM_GATE_ZH` / `DREAM_GATE_EN` 里十五个梦境名（62 爱、20 看见、57 调频、
  8 黑暗、1 喜悦、12 变异、27 渴望、50 性、5 时间、15 混沌、19 环境、53 飞离、42 死亡、
  38 攻击、28 恐惧），来源已交叉核对并记录在 `THIRD_PARTY_NOTICES.md`。
- **还缺的是「作用」的解读正文**。现状：`src/lib/dream-detail.js` 调
  `renderSharedGateReading(gate, {...})`（`src/lib/shared-object-details.js`），
  拿到的是清醒图的解读。
- 接入点（重要，按项目既有模式走）：
  1. `src/lib/knowledge/schema.js` 的 `OBJECT_TYPES` 目前只有 `penta`，需要新增 `dream` 类型，
     并定稳定 ID 规则（建议 `dream-gate:<n>`、`dream-channel:<a>-<b>`、`dream-line:<n>.<line>`）
  2. 新建内容包，参照 `src/lib/knowledge/content/penta-v1.json` + `penta.js` 的
     `readPentaContent(objectId, field, locale)` 三语单字段读取模式
  3. 在 `src/lib/knowledge/registry.js` 的 `createKnowledgeReader()` 里接入索引
  4. **不要复用** `src/lib/knowledge/penta-reading-policy.js`——它的 `mode()` / `accepted()`
     是 Penta 专属的审核判定。梦境需要自己的资格策略
  5. `src/lib/dream-detail.js` 里把 `renderSharedGateReading` 换成梦境内容读取，
     或在它之外并列一段梦境解读
- **审核状态纪律**：`REVIEW_STATUSES` 是 `unreviewed / reviewed / verified / custom`。
  老师口述的内容在确有审核证据前**不得**标成 reviewed / verified。
  项目明确区分「结构已验证」与「解读已审核」，不能拿前者冒充后者。

### 1.4 爻的另一种描述

老师原话：「然后那个爻数也是，它会转成另一种爻数的描述。」

- **爻主题名字已经做完**：六个梦境爻主题（1 秘密、2 占有、3 动荡、4 痴迷、5 幻想、6 愿景），
  显示格式为「闸门.爻 梦境名 · 爻主题」，例如 `5.4 时间 · 痴迷`。
  这与参考实现的 `5.4 Time.Obsession` 格式一致。
- **还缺每个爻主题的解释正文**（现在只有名称，没有说明）。
- 接入点：同 1.3，稳定 ID 建议 `dream-line-theme:<line>`（六个，与闸门无关，全域通用）
  或 `dream-line:<gate>.<line>`（九十种，如果每闸门每爻都有独立说法）。
  **先问老师是哪一种粒度**，这决定内容量是 6 条还是 90 条。
- 消费方：`src/lib/dream-detail.js` 的 `lineThemeRow()`、`src/views/dream.js` 的场域行。

---

## 2. 待查证的事实（不阻塞使用，但影响正确性）

### 2.1 睡眠图用的行星点数是否就是 13 个

**已实测确认的现状**：引擎对人格侧和设计侧各算 13 个点
（Sun、Earth、Moon、North Node、South Node、Mercury、Venus、Mars、Jupiter、Saturn、
Uranus、Neptune、Pluto），与清醒图完全相同；睡眠图只是**把落在 15 个梦境闸门之外的那些过滤掉不显示**。

实测样例（1990-05-20 06:30 UTC）：

| 侧 | 引擎算出的点数 | 命中梦境闸门 | 命中明细 |
|---|---|---|---|
| 睡眠人格（出生时刻） | 13 | 4 | sun 8.5 / northNode 19.3 / neptune 38.6 / pluto 1.3 |
| 睡眠设计（月亮 −88°） | 13 | 3 | northNode 19.3 / neptune 38.6 / pluto 1.4 |
| 天时（当下） | 13 | 4 | sun 28.2 / earth 27.2 / venus 50.3 / uranus 20.6 |

比例与理论值吻合：15/64 ≈ 23%，13 × 0.23 ≈ 3。所以「界面上行星看起来很少」是过滤的结果，
不是只算了几个行星。

**待向老师确认**：DreamRave 是否有额外的点（例如某些体系会单独强调月亮或交点），
或者是否排除某些点。公开资料没有提到点数变化，本项目按「13 点全算 + 15 闸门过滤」实现。
如果老师说要改，改动点在 `src/lib/dream-chart.js` 的 `filterDreamActivations()`，一处即可。

### 2.2 DreamRave 是否有自己的合盘链接分类

**已查证**：公开资料中不存在 DreamRave 专属的合盘／连接理论。官方课程
（Night Forces I / II、DreamRave Analyst Certification）讲的是个人睡眠图与三个夜间场域，
且 Ra 反复强调独自睡、不要睡在他人气场内。

**现状实现**：双人合盘复用清醒图的 composite 机制，四种链接动态
（电磁 / 主导 / 妥协 / 陪伴）由共享渲染器的 `channelDynamic()` 自然产生，
**但没有为它们编写任何梦境语境下的解释文案**。

**待确认**：老师是否认可在梦境合盘里沿用这四种分类。若认可，可考虑补梦境语境说明；
若不认可，需要在 `src/lib/dream-detail.js` 的 `compositeGateBody()` 里去掉
`COMPOSITE_DYNAMIC_LABELS` 那一段。

### 2.3 Ra 逐字稿里一句读不到全文的话

"The Design is 88 degrees, this is about 8 degrees. It's very, very different."
（出自 Dream Rave I — Introduction to Personal Analysis，网页 403 抓不到）

月亮 −88° 的**方向已由项目维护者确认**（回溯，即出生之前），且实测落在出生前 6.00–7.24 天，
与公开资料的「about a week, six or seven days」吻合。所以这句不构成阻塞，
仅在老师后续讲到时顺手核对一下上下文。

---

## 3. 技术待办（与内容无关）

### 3.1 共享选人弹窗：已抽取，Wa 那套尚未统一

团队页的选人弹窗已抽取为 `src/lib/person-picker.js`（131 行）+ `src/styles/person-picker.css`，
`openPersonPicker({ title, multiple, max, selected, exclude, confirmLabel, searchPlaceholder, onCommit, onCancel })`。
**团队页与睡眠图双人合盘都已改用它**，团队页 6 套 e2e（selection-flow / layout-dialogs /
phase1b / direct / phase1b-grouping / phase1c）全部 PASS，证明迁移未改变行为。

两处有意的取舍：

- **保留 4 个 team 风格的元素 id**（`#team-person-search` / `#team-person-create` /
  `#team-selection-count` / `#team-selection-confirm`）作为兼容钩子，因为 20 多个既有 e2e 直接按
  这些 id 选择。结构类名已统一为 `person-picker-*`。彻底改名需连带改 20+ 个 e2e 文件，未做。
- **`onCommit` 返回空字符串 = 保持打开且不报错**，用于团队页「跨组移动确认被取消」的场景；
  返回非空字符串才是错误。这是对冻结契约的语义扩展，不与之冲突。

**剩下的平行实现**：`src/views/wa-composer.js` 的 `wa-target-picker` 尚未统一——它带 import 模式
和 alpha/omega 目标语义，比较特化，需单独评估能否收进共享模块。这是 AGENTS.md §8
「减少功能相同的平行实现」剩下的最后一处。

### 3.2 release-increment 源清单门禁已过期（既有问题，非本功能引入）

`tests/release-licensing.test.js` 的
`synced frontend and Knowledge build preserves both reviewed source parents and notices`
会失败：`tests/helpers/release-increment-projection.js` 把 `incrementHead` 钉在
commit `8475a4a`（2026-10-10），而代码已前进到 2026-10-26 之后，期间合入的 24 个文件
（`src/lib/graph-shell.js`、`graph-fit.js`、`src/styles/ui-system.css`、整个 `src/lib/wa/*`、
`src/views/wa-*.js`、`scripts/run-functional-tests.mjs` 等）都不在清单内。

- **已用 git 证实是既有失败**：在完全干净的 HEAD（零个 dream 文件）上跑同一校验，
  同样失败，未登记文件正是那 24 个。本功能新增的文件会追加到清单，但不是成因。
- **该断言已被项目所有者主动退役**：测试名列于 `scripts/run-functional-tests.mjs:26` 的
  `historicalNames`，`npm test` 会跳过它。
- **纪律**：不得通过改写钉死的 `manifestDigest` 或清单文件来「修复」它——那等于伪造审阅批准。
  要重新生成一份已审阅增量清单，属发布治理决策，需由维护者发起。

### 3.3 四个 macOS 环境失败（既有）

`npm test` 全量 622 用例中有 4 个失败，全在 `tests/local-private-path.test.js` 与
`tests/local-server.test.js`，报错 `Unsafe private path: /var`，
测的是本地桌面服务的 SQLite 私有路径权限与 junction（Windows 概念）。
在 macOS 上表现不同，与人类图计算和睡眠图无关。在 Windows 开发机上应当不复现，需要在那边确认一次。
**本轮开工前后失败集合完全一致（同样 622/611/4），未引入任何新失败。**

另有 20 个把源码 SHA 钉死在历史发布点的审计文件（含 `release-increment-scope.test.js`、
`penta-phase1b-history-scope.test.js`）与 10 条具名的源码冻结断言，已由项目所有者在
`scripts/run-functional-tests.mjs` 的 `historicalFiles` / `historicalNames` 中退役，`npm test` 会跳过。
`tests/team-ui-unification-e2e.mjs` 第 38 行的失败（`.penta-detail .detail-name` 匹配到两个元素）
经对照验证在改动前同样失败，属 Penta 详情弹窗既有的标题重复渲染问题。

### 3.4 图形造型（另一个分支在做）

当前几何来自 hdkit（MIT），直线风格；官方 Jovian Archive / IHDS 风格带弧度。
维护者在另一个分支的页面重设计中处理。**换渲染器时睡眠图的迁移代价见
SLEEP-CHART-PLAN.md §6.4 的对照表**——结构、计算、词汇、三域、文字面板全部保留，
只有 `renderBodygraph` 的 `topology` 选项、`views/dream.js` 里调用绘图那一小段、
`styles/dream.css` 中与图形尺寸耦合的部分需要重做。

**新渲染器必须从第一天就支持子集拓扑**（`centerOrder` / `gates` / `pathGates` /
`pathOverrides` / `rotate`），否则睡眠图要再实现一遍裁剪逻辑。

### 3.5 术语「行运」还有两处未收拢（等维护者定）

睡眠图已经统一到共享键 `"Transit"`（`src/views/dream.js` 的 `transitTerm()` 是唯一取值点），
改词只需改 `src/locales/*/ui-transits.json` 一处。但有两件事需要维护者拍板：

1. **繁体中文的既有译法是「流日」，不是「行運」。**`src/locales/zh-Hant/ui-transits.json:31`
   写的是 `"Transit": "流日"`，而且 `tests/traditional-chinese.test.js:90` 用
   `assert.equal(t('Transits'), '流日')` 把它钉死了。睡眠图跟着全站走，所以繁中界面显示「流日」。
   若要统一成「行運」，那是一个**全站术语决策**，会同时影响行运页、时间轴页和这条测试断言，
   不应该只在睡眠图局部改。
2. **导航标签用的是复数键 `"Transits"`**（`src/locales/*/ui-static.json:6`），
   与单数键 `"Transit"` 是两个独立条目。全站改词时两处都要动。

简体「行运」、英文「Transit」已核实一致。

另外，`docs/development/SLEEP-CHART-*.md` 这两份文档写作时沿用了「天时」这个旧称，
指的是同一个概念（界面上现在叫「行运」）。文档正文没有全量替换，读到「天时」按「行运」理解。

### 3.6 timeline-e2e 在 927px 断点失败（c585cbb 引入，已修，见 §3.12）

`tests/timeline-e2e.mjs:648`（属于「852px 和 927px 布局保持紧凑吸顶头部在视口内」这条）
断言 `actual: false, expected: true` 失败，实测是 `html` 宽 936 对视口 927，横向溢出 9px。

**结论更正：这是 c585cbb（睡眠图主体提交）引入的，不是既有问题，已在本轮修复（见 §3.12）。**
本节先前把基线选成了 9702b9d（本分支自己的早期提交，已含回归），得出「既有」的错误结论——
真正的基线必须直接对 `main`（`12b9705`）验证，而 main 上 timeline-e2e 是 **20 项全过**。
教训：**判断是否回归，基线必须是要合入的目标分支，不是自己工作树的任何一个历史提交。**

另外用临时 `git worktree` 做 main 基线对照会得出假结论：新建的 worktree 缺被 gitignore 的
引擎产物，timeline 视图根本渲染不出来，测试会先在第 103 行 `waitForSelector` 超时；
正确做法是在同一个工作树里 `git checkout --detach 12b9705`（`node_modules` 与 `public/engine/`
原地保留），或直接去主工作树跑。

### 3.7 合图侧栏行可点，关系页的同位侧栏只读（有意不一致）

睡眠合图的侧栏行星行可以点开归属弹窗（报「谁携带这个闸门」），因为
`drawComparison()` 的 `detailContext` 就是合图语境，弹窗答得对。
`src/views/connection.js:434-441` 的同位侧栏是只读的，该处注释说明了理由：
关系页的详情系统属于合盘，而单人条目属于当前加载人物的本命图，接上去会答错语境。
两页的差异是各自语境下的正确选择，不是遗漏；若维护者要求视觉与交互完全拉齐，需要先决定拉向哪一边。

### 3.8 归属色是「填充级」 token，当文字色靠就地混色解决

`--hd-connection-a` / `-b` 是为图形填充调的色，直接拿来做 10px/650 的归属标签文字色，
实测 11 个 Skin 中有 9 个不达 AA（1.90–3.50:1，要求 4.5:1）。现在的做法是在
`src/styles/dream.css` 里就地混色：`color-mix(in srgb, var(--dream-source) 40%, var(--text))`，
修后实测 11 个 Skin 全部 **5.31–13.70:1**。

**更彻底的方案未做**：给 `SKIN_TOKEN_GROUPS.relationship` 补一对文本级 token
（`--hd-connection-a-text` / `-b-text`），就像行运已有的 `--hd-transit-text` 那样。
没做是因为那是共享契约，会影响关系页等其他消费者，需要单独评估。
**若将来新增 Skin，就地混色的 40% 配比需要复测**（它是当前 11 个 Skin 上实测出来的）。

`-on` 变体不能拿来代替：dark 下 `--hd-connection-a-on` 是 `#111111`，实测对比度 1.09
（深色字写在深色底上），high-contrast 下却有 17.77——同一 token 在两类 Skin 上表现相反。

### 3.9 渐变 token 不能嗂给 `color-mix()`（已修，含一处既有 bug）

`--hd-connection-both` 在所有 Skin 里都是 `repeating-linear-gradient(45deg, …)`
（`src/styles/skins/default.css:121`）。把它赋给 `--dream-channel-accent` 后，
`border-inline-start: 3px solid color-mix(in srgb, var(--dream-channel-accent) 65%, var(--dream-edge))`
**无法对渐变求值，整条声明被丢弃**，实测结果是 `border-left-style: none`、`width: 0px`、
颜色回落到 `currentColor`，hover 底色也一并没了。

两处已修，都改成甲乙两色的中点色：

- `src/styles/dream.css` 的 `.dream-channel-owner-both`（本轮新增，属自己的 bug）
- `.dream-detail-channel.companionship` 的 `--dream-detail-channel-hue`（**既有 bug**，
  关系页详情弹窗的「相伴」通道行一直在丢左边条，不是本轮引入）

**教训**：`--hd-connection-both` 只能用于 `background`（图例色块就是这么用的，正确），
不能用于任何需要单一颜色值的 `color-mix()` / `border-color` / `color`。
若以后要把「双方共有」画成双色，应该用 `border-image` 或伪元素渐变条，而不是 `border-color`。

### 3.10 合盘的内容分工（本轮定下）

- **三域面板**（光场／地球层面／噩梦领域）现在在合盘里也渲染，位置在图壳之后、
  事实块之前，与单人图「图在上、三域在下」的结构一致。用的是**同一个 `realmPanel()`**，
  只换注入的部件：行分组从「清醒人格／睡眠设计／行运」换成按人归属，
  通道状态从行运语义换成归属语义（`COMPOSITE_CHANNEL_STATUS`：both/a/b/halved/inactive）。
  颜色表归属、线型仍表设计／人格两侧，**色盲那条线索没丢**。
- **`comparisonFacts()` 只留归属事实**：两人睡眠类型 + 合计定义中心（共 3 条）。
  通道清单已全部交给三域面板，同页不再有两份；随之退役了三个键
  （`Channels complete together` / `Channels completed by one gate each` /
  `No sleep channel completes between the two designs`）。
- **返回按钮在顶部工具栏**，与「更换人选」并排（`index.html` 的 `.dream-toolbar`），
  不再是 `drawComparison()` 尾部生成的按钮。合盘页面可长达 1500px+，
  放在底部等于没有。显隐由 `setExitVisible()` 控制，与既有的 `setTimeControlVisible()`
  位置对称：合盘时「时间控件隐藏、返回显示」，单人时反之。
- **合盘通道分类只有一个来源**：`compositeChannelStates()`，三域面板与事实块都读它，
  不可能互相矛盾。

---

### 3.11 不要在同一工作树里一边跑 dev server 一边跑 `npm test`

实测踩到的坑：9998 端口跑着 vite dev server 时执行 `npm test`，得到 **621/585/29**（失败 29 项），
`npm run build:pages` 也直接报错；杀掉服务后重跑，同样的代码得到 **629/618/4**（只有那 4 个既有
 macOS `/var` 失败），`build:pages` 退出码 0。

原因是 `tests/local-server.test.js` 一类测试会自己起服务并碰共享临时路径，`build:pages` 要写 `dist/`，
两者都与运行中的 dev server 争资源。**跑 e2e 需要服务，跑 `npm test`／`build:pages` 不需要**，
两者不要同时进行；先跑完 e2e、关掉服务，再跑全量测试与构建。

### 3.12 头部导航的防溢出约束已扩展到全部桌面宽度

`src/styles.css` 里那段「导航可收缩 + 内部横向滚动」的保护原本只覆盖 641–900px
（`@media (--above-phone) and (max-width: 900px)`）。900px 以上没有这套约束，`.nav` 作为 flex item
保持默认的 `min-width: auto`，其最小内容宽度就成了头部宽度的下限。

睡眠图给导航加了第 8 项后，英文头部的最小宽度变成 **936px**，于是任何落在
**(900, 936)** 区间的视口都会把文档撑宽（927px 下溢出 9px），而 `tests/timeline-e2e.mjs:648`
正好测 927px。简体中文不溢出（8 项共 484px，最小宽度低于 900），所以这个回归只在英文界面出现。
852px 那一档之所以通过，是因为它落在旧的保护区间内，不是因为折叠成了手机菜单。

修法是把约束改成 `@media (--above-phone)`，覆盖全部桌面宽度，而不是把 900 抬到某个新值——
抬上界只是把窗口挪个位置，下次再加导航项或换语言还会撞上。实测 21 个宽度
（1440→1320，英文与简中各一轮）**全部不再溢出**，导航高度在所有桌面宽度下统一回 28px
（此前 936–1050px 区间标签会折成两行、头部变 44px）；英文仅在 1100px 以下、简中仅在 800px 以下
才真的需要内部滚动，与项目既有的 641–900px 行为一致，`src/main.js:140-143` 已有「切换视图后
把 active 导航项滚到可见」的配套逻辑。

副作用要知道：英文 1000–1100px 区间从「标签折行、全部可见」变成「单行、需横向滚动」。
滚动条是隐藏的，可发现性靠 active 项自动滚入视野；这是项目已接受的模式。

### 3.13 既有失败：`tests/review-round2-e2e.mjs`（不在门禁清单）

`review-round2-e2e.mjs` 在「327px library header keeps branding and a readable chart selector」
这条断言上失败（`selectWidth: 92`）。**已用 main 基线对照证实是既有问题**：在同一工作树里
`git checkout --detach 12b9705` 后跑同一份测试，失败断言与数值完全相同。
它测的是 327px（手机区间），而 §3.12 的改动只作用于 `min-width: 641px`，不可能影响它；
且它不在 `.github/workflows/premerge.yml` 的门禁清单里。

### 3.14 三个「页面状态串位」竞态（已修，`tests/dream-state-boundaries-e2e.mjs`）
三个都是同一类问题：异步求解完成时，页面已经不在发起它的那个状态里了，而代码在
`await` 之后才去读「当前是谁」。用户可见的后果都是**看到不属于当前状态的图**。

1. **合盘绑到后来的人物**（`startComparison` → `setDreamComparison`）。
   `await computeChart(B)` 之后才 `setDreamComparison()`，而 `forChart` 在那里才读
   `getCurrentChart()`。期间从 A 切到 C，B 就绑到了 C 的图上，页面出现「C 与 B 的合图」。
   实测已复现：`Sleep charts of Fictional C and Fictional B`。
   修法：**发起前**捕获 `origin = {personId, chart}` 与 B 的出生指纹，`await` 之后先用
   `sameMainPerson(origin)` 校验，再落盘；合盘另有 `comparisonSequence` 独立代号，
   `renderComparison()` 落图前再校验一次 `pendingComparison === comparison` 与
   `samePairIsCurrent()`。
2. **无效时刻被当成「没选时刻」→ 回落到 `Date.now()`**（`selectedTransitMoment`）。
   旧代码 `Number.isFinite(instant) ? instant : undefined` 把「用户选了不存在的墙上时间」
   和「还没选」合并成同一个值，`computeDreamChart()` 对 `undefined` 取当前时刻。
   所以 DST 跳变时刻既会显示「现在」，重入页面也会显示「现在」，且从无效改回有效
   时缓存判定也会出错。修法：三态分开（`{instant}` / `{invalid}` / `{instant: undefined}`），
   无效时**不求解**，页面画 `.dream-moment-invalid` 明确状态；`onChange` 每次都调用
   `renderDreamView()`，由它在两条路径上都 `++requestSequence`，因此无效输入也会淘汰旧的有效请求。
3. **合盘 B 没有身份**（`pendingComparison` 旧形状只有 `{chart, label}`）。
   删除或修改 B 时没有任何监听，合图继续显示 B 的旧图。修法：B 存 `personId` +
   `fingerprint`（`calculationIdentity(birthFromPerson(person))`），睡眠图页**自己**
   订阅 `onPeopleChange`（`peopleOff`，随 `setupDreamView()` 重建时释放），
   删除 → 丢弃合盘并提示；出生字段改变 → 丢弃合盘并提示重新选择；仅改名 → 保留已解的合盘、
   只换标签（`pairFrom()` 里比较全字段再决定是否保 `lastComparison`）。
   主人物自身的变更仍归 `main.js` 处理（本页跳过，避免与整页重载互相覆盖）。

测试不靠 sleep：`tests/dream-state-boundaries-e2e.mjs` 拦截 `src/lib/chartdata.js` 与
`src/lib/dream-chart.js`，插一个由测试显式放行的门，于是「求解正在飞行中」是被观测到的事实。
基线（未修）实测 9 项中 6 项失败，修后 9 项全通。
**测试里 import 页面模块必须走 `performance.getEntriesByType('resource')` 解析出的真实 URL**
（Vite 会带 `?t=` 后缀），否则拿到的是第二份模块实例，`onPeopleChange` 监听不到页面那一份的保存。

#### 3.14.1 补修：两套计数器之间的空洞（第二轮，12 项）

上一轮把合盘改成独立 `comparisonSequence` 后留下一个反向空洞，以及两处死代码：

- **单人慢解覆盖合盘**（已实证，测试第 10 项）。单人落图只看自己的 `requestSequence`
  与 `current.chart`；进入合盘会离开人物/时刻不变，所以这两项仍成立，而合盘早已画好。
  修法两道保险：进合盘时 `evictSingleDesign()` 递增 `requestSequence`，且单人落图/报错另看
  `pendingComparison`。单独撑掉任一道仍能过（冗余），两道全撑才会失败——已逐个验证。
- **`samePairIsCurrent()` 的主人物校验是死代码**（已核实）。旧签名收调用方的 `current`，
  与 `comparison.forChart` 永远相等；真实拦截靠 `invalidateDream()`。现改成自己调
  `getCurrentChart()`，并去掉参数，`renderComparison()` / `refreshDreamLanguage()` /
  `drawComparison()` 三处同步。测试第 11 项覆盖「切换主人物后旧合盘不复活」，
  该路径由 `main.js` 的 `invalidateDream()` 先兜住，所以修前也过——它锁的是行为，不是实现。
- **B 在计算期间被删/改会死在 Computing**（已实证，测试第 12 项）。`pendingComparison` 此时尚未提交，
  `onComparisonPersonChange()` 因无 pair 而早退，无法回答。修法：`startComparison()` 在 `await` 后
  重读 `getPerson(person.id)` 并比指纹，不一致就报状态并返回（`fingerprint` 变了报「出生资料已变」，
  人没了报「已不在保存的图表中」）。单独撑掉这一段，第 12 项就失败。

现状：`tests/dream-state-boundaries-e2e.mjs` 12 项全通；`dream-e2e` 53/53；
`dream-chart`/`dream-topology`/`i18n` 48 项、`localization`+`traditional-chinese` 9 项、
静态构建均通过。

### 3.15 页面内双人合盘没有转「现在」的入口（未做）
合图时时间控件被隐藏（合图不叠加行运），所以进入合图后无法改时刻；返回单人睡眠图才能改。
这是 §3.10 的设计取舍，未变。

## 4. 怎么把它跑起来

```bash
# .NET SDK 不在默认 PATH（本机在 ~/.dotnet）
export PATH="$HOME/.dotnet:$PATH" DOTNET="$HOME/.dotnet/dotnet"

# public/engine/ 是 gitignore 的构建产物。新 worktree 里需要先有它：
#   正规做法：npm run build:engine（需要 dotnet，会 publish WASM 并下载星历）
#   或从主 worktree 复制：cp -R ../../../public/engine public/engine
# 复制后如果改过根目录 THIRD_PARTY_NOTICES.md，必须同步：
#   cp THIRD_PARTY_NOTICES.md public/engine/THIRD_PARTY_NOTICES.md
# 否则 release-licensing 的通知一致性校验会失败。

# 端口：9961 被用户本机安装的 OpenHumanDesign 桌面应用占用，不是本项目预览，不可停止。
# 隔离 worktree 用 loopback 专属端口。
npx vite --host 127.0.0.1 --port 9962 --strictPort
```

浏览器 localStorage 按源隔离：9961 与 9962 是两个源，已保存的人物不互通。
想直接进睡眠图可以用深链（`view=dream` 已在 `main.js` 的 `VIEWS` 白名单里）：

```
http://127.0.0.1:9962/?d=1990-05-20&t=06:30&tz=0&name=测试&view=dream
```

---

## 5. 验证命令清单

```bash
# 结构与计算（纯逻辑，不需要引擎、不需要网络）
node --test tests/dream-topology.test.js tests/dream-chart.test.js        # 29 用例

# 多语言与本地化（部分用例需要 dotnet）
node --test tests/i18n.test.js tests/localization.test.js tests/traditional-chinese.test.js   # 21 用例

# 真实 Swiss 星历：月亮 −88° 求解、类型推导、三域（需要 dotnet + public/engine/ephe）
node dev/verify-dream-native.mjs                                          # 5 组出生数据

# 几何参数复核：门户存根、正立/旋转 viewBox、旋转中心、存根越界检查（纯几何）
node dev/measure-dream-viewbox.mjs

# 浏览器端到端（需要 dev server 在跑）
E2E_URL=http://127.0.0.1:9962 node tests/dream-e2e.mjs                     # 31 项

# 全量
npm test                                                                    # 622 用例
```

**改了 `dream-chart.js` 或 `dream-topology.js` 之后必须重跑前两条和 `verify-dream-native.mjs`。**
改了 `bodygraph.js` 之后必须重跑 `npm test`（它被所有图表页面共用）。

---

## 6. 关键文件索引

| 文件 | 职责 |
|---|---|
| `src/lib/human-design/dream-topology.js` | 结构规则：5 中心 / 15 闸门 / 6 通道 / 3 门户 / 三域 / 存根 / 旋转 / viewBox |
| `src/lib/dream-chart.js` | 月亮 −88° 求解、睡眠模型、睡眠类型、天时叠加模型 |
| `src/lib/dream-vocabulary.js` | 睡眠专属词汇访问器（**内容层新名词加在这里**） |
| `src/lib/dream-detail.js` | 详情弹窗：复用共享壳层，自持激活数据（**解读正文接入点在这里**） |
| `src/views/dream.js` | 页面：类型条、图形、激活列、三域面板、通道列表、双人合盘 |
| `src/styles/dream.css` | 样式，全部走 Skin token，0 处硬编码颜色 |
| `src/locales/{en.js,zh-CN/dream.js,zh-Hant/dream.js}` | 三语睡眠词汇 |
| `src/locales/{zh-CN,zh-Hant}/ui-dream.json` | 三语界面文案 |
| `src/lib/transit-time-control.js` | 共享时间控件（日期／时间／时区／现在／夏令时歧义偏移）；行运页与睡眠图共用 |
| `src/lib/person-picker.js` | 共享选人弹窗（搜索/单多选/新建/编辑）；团队页与睡眠图合盘共用 |
| `src/bodygraph.js` | 共享渲染器；`topology` 与 `ariaLabel` 选项、`BODYGRAPH_PAD` 导出 |
| `dev/measure-dream-viewbox.mjs` | 几何推导工具（存根、viewBox、旋转中心） |
| `dev/verify-dream-native.mjs` | 真实星历验证工具 |
| `tests/dream-topology.test.js`、`tests/dream-chart.test.js` | 单元测试 |
| `tests/dream-e2e.mjs` | 浏览器端到端 |
| `docs/development/SLEEP-CHART-PLAN.md` | 架构、决策依据、分层、已验证事实 |
| `docs/development/UI_COMPONENT_INVENTORY.md` | 公共组件登记 |
| `THIRD_PARTY_NOTICES.md` | DreamRave 术语出处与授权边界 |
