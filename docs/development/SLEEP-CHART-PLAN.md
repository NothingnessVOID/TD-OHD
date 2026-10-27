# 睡眠图（DreamRave）实现规划与架构说明

本文记录睡眠图功能的分层架构、已完成部分、已定的取舍与剩余待办。
面向非编程背景的维护者与后续接手的 AI，因此架构部分用平实语言描述，标识符保留英文原样。

最后更新：2026-10-27（本轮：合盘入口从关系页跳转改为睡眠图页内按钮 + 共享选人弹窗；月亮弧方向结案、
求解落点定为保持第 5 层、门户存根、图形旋转 90 度、合盘语义查证）

---

## 1. 项目的七层结构

从下到上，每层归属和职责如下。

| 层 | 内容 | 归属 | 本项目是否改过 |
|---|---|---|---|
| 1 | 星历数据文件（`sepl_18.se1` / `semo_18.se1`，实际为 DE441） | Swiss Ephemeris（C 库，AstroDienst） | 否，按 manifest 锁定 SHA |
| 2 | 星历的 C# 封装 | SharpAstrology.SwissEph 0.5.1，**AGPL-3.0**，已 vendor 到 `third_party/` | **是，改了 8 个文件** |
| 3 | 人类图转换（角度 → 闸门/爻/中心/类型/权威/角色/十字） | SharpAstrology.HumanDesign 1.2.0 + Base 0.14.0，**MIT**，NuGet 引用 | 否 |
| 4 | 暴露给浏览器的薄壳，编译为 WASM | 本项目自有，`engine-wasm/Program.cs`（约 120 行） | 否 |
| 5 | JS 适配与领域逻辑 | 本项目自有，`src/lib/chart-engine/`、`src/lib/*.js` | 是（新增睡眠图逻辑） |
| 6 | 显示层：绘图、几何、皮肤、多语言 | 本项目自有 + hdkit（MIT）几何数据 | 是（绘图函数新增 topology 能力） |
| 7 | 各页面视图 | 本项目自有，`src/views/` | 是（新增 `dream.js`） |

### 第 2 层改了什么，为什么

改动清单由 `scripts/lib/engine-identity.mjs` 的 `changedFiles` 给出，共 8 个文件：
`Application/Bodies/BodyService.cs`、`BodyState.cs`、`CorrectionPipeline.cs`、
`Application/Calendar/CalendarService.cs`、`Infrastructure/Jpl/JplBodyPositionSource.cs`、
`Infrastructure/SwissEph/SwissEphBodyPositionSource.cs`、`SharpAstrology.SwissEph.csproj`、`SwissEphemerides.cs`。

目的与验证记录见 `docs/sharp-swiss-parity-fix/README.md`，修的是两个已确认的 bug：

- **Bug A：缺失 frame bias。** 原版 C 代码在周年光行差之后、岁差之前会执行 `IcrsBias()`，上游 C# 漏了这一步。
- **Bug B：UTC 儒略日被当作 UT1。** 两者相差 delta-UT1（零点几秒），对月亮这类快速天体有影响。

验证方式是用原版 Swiss C 2.10.03 独立编译作为 oracle，9 例 × 人格/设计 × 13 天体 = 234 条数值对照。
结果：设计时刻最大 UTC 差 0.161 ms，太阳经度最大残差 0.0067 mas。

**已知未修问题：** 月亮经度最大残差 20771 mas（约 20.77 角秒），README 中明确「仅记录，未修第三个问题」。
对睡眠图的影响见 §7 第 5 条。

### 88 度求解住在第 3 层

`engine-wasm/Program.cs:39` 只有一行调用：

```csharp
var designDate = eph.DesignJulianDay(birth);
```

`DesignJulianDay` 是 SharpAstrology.HumanDesign 包里的扩展方法，**写死为太阳后退 88 度**。
该包内已存在 `RootFinder`、`DesignDegDistance` 等符号，说明通用求根机制是现成的。
这一层目前只有编译好的 dll，本地没有源码。

**注意：** 以上只适用于清醒图。睡眠图的月亮 −88° **不走第 3 层**，也不走第 4 层，
而是在第 5 层用牛顿迭代向引擎反复询问月亮黄经得到，这是有意选择的最终方案，见 §4。

---

## 2. 睡眠图的领域事实（已交叉核对）

### 结构

- 保留 5 个中心：throat（喉）、g（自我）、spleen（直觉）、sacral（骶骨）、root（根部）。
  下线的是 head、ajna、heart（意志力）、solar（情绪）。
- 保留 15 个闸门：`1 5 8 12 15 19 20 27 28 38 42 50 53 57 62`。
- 保留 6 条通道：`1-8`、`5-15`、`20-57`、`27-50`、`28-38`、`42-53`。
- 3 个门户（不属于任何保留通道）：`62`（光场）、`12`（地球层面）、`19`（噩梦领域）。
  三者仍各画一条 51.2 单位长的短存根，不画完整半通道，见 §6.2。

以上全部由 `DREAM_CHANNELS = CHANNELS.filter(...)` 从第 3 层的标准目录**推导**得出，不是另抄一份清单，
因此与清醒图共用同一批对象引用，不会分叉。

### 三个夜间场域（每域 5 门 + 1 门户）

| 场域 | 门户 | 闸门 | 编程来源 |
|---|---|---|---|
| Light Field 光场 | 62 | 62, 20, 57, 8, 1 | 人格水晶（意识侧） |
| Earth Plane 地球层面 | 12 | 12, 27, 50, 5, 15 | 集体场（地球上醒着的人） |
| Demon Realm 噩梦领域 | 19 | 19, 53, 42, 38, 28 | 设计水晶（身体／潜意识侧） |

### 15 个梦境闸门名与 6 个梦境爻主题

闸门名：62 Love 爱、20 Sight 看见、57 Attunement 调频、8 Darkness 黑暗、1 Joy 喜悦、
12 Mutation 变异、27 Yearning 渴望、50 Sex 性、5 Time 时间、15 Chaos 混沌、
19 Environments 环境、53 Flight 飞离、42 Dying 死亡、38 Aggression 攻击、28 Fear 恐惧。

爻主题：1 Secrets 秘密、2 Possession 占有、3 Turmoil 动荡、4 Obsession 痴迷、5 Fantasy 幻想、6 Vision 愿景。

显示格式为「闸门.爻 梦境名 · 爻主题」，例如 `5.4 时间 · 痴迷`。
来源为 Ra Uru Hu 的 DreamRave（Night Forces）体系，交叉核对 jovianarchive.com
"Understanding Dreams with Human Design" 与两份独立闸门清单；术语出处记录在 `THIRD_PARTY_NOTICES.md`。
**只使用简短结构术语与名称，未复制任何受版权保护的解读正文。**

### 睡眠类型只有三种

- 无任何定义 → Reflector 反映者
- 有定义且骶骨未定义 → Projector 投射者
- 骶骨已定义 → Generator 生产者

**显示者（Manifestor）与显示生产者（MG）在结构上不可能出现**：
喉中心在睡眠拓扑里只连自我中心（1-8）和直觉中心（20-57），两者都不是马达，
因此「喉—马达」通道永远无法完成。该结论已写成测试（`tests/dream-topology.test.js`），
马达清单从 `CENTERS[k].motor === true` 动态取，不硬编码。

统计上约 67% 的人在睡眠中是 Reflector。

---

## 3. 计算方式

| | 清醒图 | 睡眠图 |
|---|---|---|
| 人格侧（黑／意识） | 出生时刻 | **完全相同**，出生时刻 |
| 设计侧（红／潜意识） | 太阳后退 88°（约出生前 3 个月） | **月亮**后退 88°（约出生前 6–7 天） |

即：只把设计侧的太阳弧换成月亮弧，人格侧原样保留，然后**单人图始终叠加当下天时**。
两人合盘是例外：合盘不叠加天时（老师的原话与资料查证都支持这一做法，见 §6.3）。

### 来源与可信度分级

- **官方（Jovian Archive）**："The DreamRave chart is calculated from your birth data, however based on
  your birth time for the Personality activations—and 88 degrees of the moon, which reveals your
  Design activations."（https://jovianarchive.com/pages/understanding-dreams-with-human-design）
  官方明确了「人格侧用出生时刻、设计侧用月亮 88 度」，**但未说明方向是往前还是往后**。
- **方向（出生之前）：已由项目维护者确认。** 项目维护者（北染的辰）已明确回答：**月亮回溯 88 度，即设计时刻在出生之前**。
  第三方来源与实测同时支持该方向：人类图中 88° 一律是回溯（官方 Mechanics of Death 页与 Ra 逐字稿均为
  "going back / before birth"）；thehumandesignsystem.com 明写 "88 degrees of its own arc **before** birth,
  about a week, six or seven days"；hdnavigator.ru 写作 "**-88 degrees** of the lunar arc"。
  三者与实测同向，因此不再作为推定项，而作为已确认事实。
- **实测支持**：用真实 Swiss 星历跑 5 组出生数据，设计时刻落在出生前 6.00 / 6.47 / 6.84 / 7.21 / 7.24 天，
  与「六七天」独立吻合；月亮近地点快、远地点慢，因此该区间本身会浮动（理论极值约 5.75–7.52 天）。
- **本项目既有记录**：`docs/RESEARCH.md:600` 在本功能开发前即写有
  "DreamRave / Sleep chart (5 centers, 15 gates, 88°-of-Moon-movement calc)"。

**已确认：** 设计侧取「出生之前的月亮 −88°」。本文档上一版在此处挂的「方向待确认」已结案。
Ra 的 DreamRave 课程逐字稿中另有一句 "The Design is 88 degrees, this is about 8 degrees. It's very, very different."
原文抓不到（HTTP 403），上下文不明。这句**不再阻塞任何实现**，只作为低优先级备注，
仅在老师后续讲到此句时复核（见 §7 第 2 条）。

### 精度说明

第 5 层的求解**不做任何天文计算**。它只反复向引擎询问「T 时刻月亮黄经是多少」，
用牛顿迭代逼近「本命月亮 − 88°」，所有角度、闸门、爻均由引擎给出。

- 实测收敛残差：**0.26 毫角秒**，7–10 次迭代。
- 对比：引擎自身对月亮的已知残差为 20771 毫角秒。求解误差比引擎误差小约八万倍，不构成精度瓶颈。
- 代价是「要问引擎 7–10 次」，每次为毫秒级 WASM 调用，且每人只算一次后缓存。
  这是**架构优雅性问题，不是精度问题**；即使如此，它也不构成迁移的理由，取舍见 §4。

---

## 4. 月亮求解的落点：保持第 5 层（不迁移）

### 结论

**月亮求解继续住在第 5 层的 `src/lib/dream-chart.js`，`solveLunarArcInstant` 是有意选择的最终方案，不是待偿还的技术债。**
位置 C 与位置 A 都不做。

理由：

- **精度完全无损。** 第 5 层的求解不含任何天文计算，只反复询问引擎「T 时刻月亮黄经」，
  用牛顿迭代逼近目标；所有角度、闸门、爻均由引擎给出。实测收敛残差 **0.26 毫角秒**，
  比引擎自身对月亮的已知残差 **20771 毫角秒**小约八万倍（见 §3 精度说明）。
- **性能非问题。** 7–10 次毫秒级 WASM 调用，每人只算一次后缓存。
- **位置 C 的唯一收益是「代码住的位置更合理」**，用户完全不可见，不值得 4–5 小时 + 重编 WASM
  + 改 native client + 重写测试的成本。

`dream-chart.js` 里保留可注入的 `snapshotAt`，因此单测不加载 WASM、不联网，也不影响将来替换实现。

### 位置 C（第 4 层 `engine-wasm/Program.cs`）：不采纳

原方案是在本项目自有的 WASM 薄壳里新增 `CalculateDreamChart(utc)`，与 `CalculateBirthChart(utc)` 并列，
一次调用直接返回月亮 −88° 的两侧结果。

**补充一条关键事实：** `scripts/lib/engine-identity.mjs` 的签名 hash 输入**不包含** `engine-wasm/Program.cs`，
只包含 `third_party/SharpAstrology.SwissEph/**`（`*.cs` / `*.csproj`）、`engine-core/TransitCore.cs`、
`src/lib/transit-time.js`、年度算法源码与星历 manifest。
也就是说位置 C 本来也不会动引擎签名（4 个测试里的签名 `59b90e629033cc7faf95`、
`public/transit-data/` 下 33 个年度数据文件、浏览器缓存均不受影响）。
但它仍然不值得做：收益只是文件位置更贴近引擎，代价是重编 WASM、给 `sharp-native-client.mjs`
加请求类型、改 `sharp-provider.js` 契约、并重写 `tests/dream-chart.test.js` 中现有的求解用例。

### 位置 A（第 3 层 SharpAstrology.HumanDesign，MIT，NuGet）：不采纳，保留实施清单

概念上最正确的家：在 `DesignJulianDay` 旁边加 `DreamDesignJulianDay`，并给上游
CReizner/SharpAstrology 提 PR（MIT 协议，允许）。本轮不做，但把完整清单留在此处供将来参考：

1. 该包目前是 NuGet 引用，本地无源码，需先 vendor 进来，套用第 2 层已有的
   `upstream-files.json` / `patch-manifest.json` / oracle 对照流程。
2. 改 vendor 源码会改变 `patchedSourceSha256` → **引擎签名变化**，连带：
   - 4 个测试文件里的签名字面量更新（分钟级）
   - `writeEngineIdentity()` 重新生成 `engine-identity.js`、`annual-signature.js`、`patch-manifest.json`（分钟级）
   - **`public/transit-data/` 下 33 个被 git 追踪的年度数据文件重新生成**
     （`npm run generate:annual -- --all` 后 `verify:annual`）。
     年度数据按 60 秒步长扫全年（525,600 时刻 × 13 天体 × 33 文件），**耗时未实测**，需先测。
     路径中含签名，因此必须重生成而非改名。
   - 浏览器端图表缓存失效一次（无实质影响）
3. 需要 .NET 10 SDK（Windows 开发机已具备；本机在 `~/.dotnet`）。
4. 完成后向上游提 PR。

### 位置 B（第 2 层星历层）：不做

第 2 层是星历层，88° 求解不属于该层职责；且其协议为 AGPL-3.0，改动义务更重。

### 回头重做的触发条件

只有两种情况值得重新考虑，其余情况一律不动：

1. 将来因其他原因需要 vendor 第 3 层时，顺手把月亮弧做进去，边际成本接近零。
2. 睡眠图需要通过 MCP 接口暴露给外部程序消费时，计算做在引擎侧更干净。

---

## 5. 已完成与待办

### 已完成（验证状态见下方）

| 文件 | 作用 |
|---|---|
| `src/lib/human-design/dream-topology.js` | 5 中心 / 15 闸门 / 6 通道 / 3 门户 / 三域划分 / 门户存根 / 旋转与实测 viewBox |
| `src/lib/dream-chart.js` | 月亮 −88° 求解、睡眠模型、睡眠类型、天时叠加模型 |
| `src/lib/dream-vocabulary.js` | 睡眠专属词汇访问器，沿用 `vocabulary.js` 的 `display(field)` 模式 |
| `src/locales/{en.js,zh-CN/dream.js,zh-Hant/dream.js}` | 三语睡眠词汇，已验证 key 完全对齐 |
| `src/locales/{zh-CN,zh-Hant}/ui-dream.json` | 三语界面文案，54 键，两套 key 集合完全一致 |
| `src/lib/dream-detail.js` | 睡眠图详情弹窗控制器；复用共享壳层与解读组件，自持激活数据（见 §6.5） |
| `src/lib/skin-registry.js` | 新增共享 `compositePalette()`，关系页与睡眠合盘共用一套归属色，不再各自推导 |
| `src/views/dream.js` | 睡眠图页面；详情四入口、场域通道列表、composite 合盘；**合盘入口在本页内**：按钮 → 共享选人弹窗 → `computeChart` 算第二个人的清醒图 → 双人睡眠合盘（见 §6.3）；横向画布宽高比由 `DREAM_VIEW_BOX` 与 `BODYGRAPH_PAD` 自动推导，`idealWidth` 从 440 调为 720 |
| `src/styles/dream.css` | 样式，1029 行，0 处硬编码颜色，全部走 Skin token |
| `src/bodygraph.js` | 新增 `topology` 与 `ariaLabel` 选项、`topology.rotate` / `rotateCenter` / `pathOverrides` 支持、导出 `BODYGRAPH_PAD`；**不传即原行为** |
| `index.html` / `src/main.js` | 导航、页面容器、视图注册、语言与换肤刷新、换人失效；`#dream-toolbar` 里的 `#dream-compare`（与另一个人合图）；`ohd-dream-navigation` 监听已删 |
| `tests/dream-topology.test.js`、`tests/dream-chart.test.js` | 29 个用例（含存根与旋转），全绿 |
| `tests/dream-e2e.mjs` | 真实浏览器 e2e，**36 项全过**；断言含存根路径、旋转 viewBox、详情弹窗不泄漏清醒设计、睡眠页内的合盘入口与整套合盘断言 |
| `dev/measure-dream-viewbox.mjs` | 已扩展：同时输出存根路径、正立 viewBox、旋转后 viewBox、旋转中心、存根与被移除中心的相交检查 |
| `dev/verify-dream-native.mjs` | 真实星历验证工具 |
| `docs/development/SLEEP-CHART-PLAN.md` | 本文档 |
| `docs/development/UI_COMPONENT_INVENTORY.md`、`THIRD_PARTY_NOTICES.md` | 组件登记与术语出处 |

验证结果：

- 真实 Swiss 星历，5 组出生数据，全部检查通过（`dev/verify-dream-native.mjs`）。
- 单元测试 **29/29 通过**（`node --test tests/dream-topology.test.js tests/dream-chart.test.js`），
  含存根长度/方向/不越界、旋转中心、viewBox 转置面积守恒等断言，并经变异测试验证非空转。
- 真实浏览器 e2e **36 项全过**（`E2E_URL=… node tests/dream-e2e.mjs`，1380×1000 与 390×844）：
  5 中心、15 闸门、门户存根（含直接比对 `DREAM_PORTAL_STUBS` 的 `d`）、四分之一旋转且闸门数字正向、
  viewBox `-233.67 528.05 1010.13 590.3`、画布 720×421、类型条、三域与门户、激活列只含梦境闸门、
  天时叠加与时刻、溯源行、悬停联动、**闸门/通道详情弹窗**、
  **弹窗只显示睡眠激活（清醒设计侧泄漏的回归防护）**、语言切换、全部 Skin、暗色主题、
  手机视口零横向溢出、**睡眠页内的合盘入口（选人弹窗 → 合盘）**、合盘归属弹窗、合盘无天时、
  合盘内切换语言、退出合盘、时间未知的合盘对象、合盘对象出生资料不全时的行内报错、换人清除旧合盘、全程零报错。
- 全量功能测试 `npm test`：**622 用例，611 通过，4 失败**。4 个失败全在
  `tests/local-private-path.test.js` 与 `tests/local-server.test.js`，报错为
  `Unsafe private path: /var`，属 macOS 上本地桌面服务的私有路径/junction/umask 检查（junction 为
  Windows 概念），**与本功能无关且为既有失败**——本项目未改动 `local-server.mjs`、私有路径或 SQLite 任何代码。
- `npx vite build --mode static` 通过。

### 关于 release-increment 源清单门禁（既有状态，非本轮引入）

`tests/release-licensing.test.js` 的 `synced frontend and Knowledge build preserves both reviewed
source parents and notices` 会失败：`tests/helpers/release-increment-projection.js` 把
`incrementHead` 钉在 commit `8475a4a`（2026-10-10），而 HEAD 已是 2026-10-26，期间合入的 24 个文件
（`src/lib/graph-shell.js`、`graph-fit.js`、`src/styles/ui-system.css`、整个 `src/lib/wa/*`、
`src/views/wa-*.js`、`scripts/run-functional-tests.mjs` 等）都不在该清单内。

**已用 git 证实这是既有失败**：在完全干净的 HEAD（零个 dream 文件）上运行同一校验，同样失败，
且未登记文件正是那 24 个。本功能新增的 10 个文件会追加到该清单，但不是失败的成因。

**该断言已被项目所有者主动退役**：其测试名列于 `scripts/run-functional-tests.mjs:26` 的
`historicalNames`，`npm test` 会用 `--test-skip-pattern` 跳过它，注释写明
「The owner retired them as release gates; keep the files for historical review」。
因此它不构成发布阻塞。**不得**通过改写钉死的 `manifestDigest` 或清单文件来「修复」它——那等于伪造审阅批准。
是否重新生成一份新的已审阅增量清单，属发布治理决策，需由维护者另行发起。

另：`validateDistribution` 要求 `dist/engine/THIRD_PARTY_NOTICES.md` 与仓库根同名文件逐字节一致。
`public/engine/` 由 `npm run build:engine` 从根目录复制该文件；若手工复制过 `public/engine/`
或改动过根通知文件，需重新同步（`cp THIRD_PARTY_NOTICES.md public/engine/`）并重建 `dist`，
否则 `required full notices are copied into the actual static distribution` 会失败。本轮已按此同步。

### 待办

本轮 §6.1 旋转、§6.2 门户存根、§6.3 合盘 composite、§6.5 点击详情**均已完成并验证**。
剩余：

1. **用户验收**：图形横向版式、门户存根长度、三域面板、详情弹窗内容、合盘呈现
2. **共享选人弹窗已落地**：`src/lib/person-picker.js` + `src/styles/person-picker.css` + `ui-picker.json`
   已在工作区，`views/dream.js` 用静态 import，team 同步迁移。`tests/dream-e2e.mjs` 的合盘段
   已在静态构建产物上跑通（36/36）。注意：两个实例同时写这个 worktree 时，dev server 的 HMR
   会在测试中触发整页 reload；验收合盘段请用静态构建（`npx vite build --mode static` + 静态服务器）跑。
3. **提交**当前分支（尚未 commit）；是否推送远端、何时并入 `dev/windows-development` 待维护者指示
4. **内容层**：老师后续给出的梦境通道定义、天时通道定义、15 闸门完整解读与爻描述（见 §7）
5. **DreamRave 合盘链接分类**是否存在，待查证（见 §6.3）

---

## 6. 图形与合盘：本轮决策与实现状态

6.1、6.2、6.3、6.5 已实现并经真实浏览器验证；6.4 明确不做。
本节编号：6.1 旋转、6.2 门户存根、6.3 合盘、6.4 渲染器造型、6.5 点击详情。

### 6.1 图形顺时针旋转 90 度（横向）——已实现

需求：图形整体顺时针转 90 度变横向，**闸门数字与所有文字保持水平可读**（不跟着躺倒）。

**版式依据：** 用户提供的参考 App 截图（HumanDesignApp.com）的版式正好就是标准人类图顺时针旋转 90 度的结果——
喉中心在右、根中心在左、直觉中心在上、骶骨与自我居中。因此这个旋转同时满足了排版需求和与权威实现版式一致。

实现事实（已在真实浏览器验证）：

- `src/lib/human-design/dream-topology.js` 新增 `DREAM_ROTATION = 90`、
  `DREAM_ROTATION_CENTER = { x: 271.4, y: 823.205 }`（= 正立内容盒外扩 `BODYGRAPH_PAD = 16` 后的中心）。
- `DREAM_VIEW_BOX` 已从正立内容盒 `{x:8.25, y:350.14, w:526.3, h:946.13}`（渲染时再外扩 16）
  改为旋转后的 `{x:-217.67, y:544.05, w:978.13, h:558.3}`。
- `src/bodygraph.js` 新增 `topology.rotate` 与 `topology.rotateCenter` 支持：几何三个分组包进一个
  `<g transform="rotate(90 cx cy)">`，defs / pattern / tooltip 留在页面坐标系；
  **闸门数字单独加 `rotate(-90 tx ty)` 反向旋转，保持水平可读**。
- `src/bodygraph.js` 导出 `BODYGRAPH_PAD = 16`（此前是渲染器内部私有常量），供宿主推导画布宽高比。
- 渲染器最终输出的 viewBox 为 `-233.67 528.05 1010.13 590.3`（= 拓扑 viewBox 外扩 16）。
- 闸门圆、中心形状、通道路径、点击热区都在被旋转的组内，指针事件与高亮自动跟随，无需额外处理。
- `src/views/dream.js` 的 `DREAM_GRAPH_ASPECT` 由 `DREAM_VIEW_BOX` 与 `BODYGRAPH_PAD` 自动推导，
  `observeGraphShell` 的 `idealWidth` 从 440 调整为 720（横向图更宽）。

实测（1440×1000 视口）：

- SVG 720×421（横向，宽高比 1.71）。
- 五个中心屏幕坐标：throat cx=930 / g cx=777 / sacral cx=557 / root cx=399（四者同在 cy=639 水平带），
  spleen cy=401 在上方——方位与预期完全一致。
- 15 个闸门数字 bbox 均为高大于宽（两位数 16×19），证明文字正向。
- 390×844 手机视口横向溢出 0px。

未验证：旋转后的全部 Skin 逐个视觉走查、旋转与存根之后的全量 e2e 重跑、横向图下三域面板的排布是否需调整（见 §7 第 4 条）。

### 6.2 门户存根（portal stubs）——已实现

三个门户闸门（12、19、62）在清醒图里各有通道，但通道另一端都在被砍掉的中心里：
12→22 和 19→49 在情绪中心（solar），62→17 在逻辑中心（ajna）。
若保留全长半通道路径，会有长线悬在空白区（12 号原长 285.6 单位、19 号原长 156.5 单位）。

用户决定：**保留这三根线，但截短成存根**，只留一个「口子」，长度对齐 62 号闸门原本就有的 51.2 单位。

实现事实（已验证）：

- `src/lib/human-design/dream-topology.js` 新增 `DREAM_PORTAL_STUB_LENGTH = 51.2`、
  `DREAM_PORTAL_STUBS`（含 12 和 19 两条路径）、`DREAM_TOPOLOGY.pathOverrides`。
- 62 号不需要 override，它的清醒路径本身就是 51.2 单位。
- 存根保留原路径的方向和目录标准的 17.4 单位条宽，只改长度。
- 存根由 `dev/measure-dream-viewbox.mjs` 从静态几何推导（脚本已扩展，会同时输出存根路径、正立 viewBox、
  旋转后 viewBox、旋转中心、以及存根与被移除中心的相交检查），属可复现的测量而非手填常量。
- `src/bodygraph.js` 新增 `topology.pathOverrides`（gate → path data），用于门户存根。
- `DREAM_PATH_GATES` 语义变更：从「12 个（15 减 3 门户）」变为「全部 15 个」。
- 已知且可接受：62 号存根与 ajna 中心形状有约 5 单位重叠（ajna 不绘制，视觉上无影响）；
  12 和 19 的存根与四个被移除中心均不相交。

### 6.3 合盘睡眠图 composite——已实现

本节记录已定语义与实现决定；**代码已实现并经 e2e 验证**（见 §5 与 §6.5）。

**入口：在睡眠图页面内，不在关系页。**

用户明确要求：「你不要从那个关系界面里面加个按钮跳转到这个睡眠合图。你应该是直接在睡眠图这个页面里面增加这个功能啊，就是双人合图的功能。」因此：

- 入口是 `#dream-view` 工具栏里 `#dream-refresh`（刷新天时）旁边的一个按钮，文案 key 为
  `Compare with another person`（简中「与另一个人合图」/ 繁中「與另一個人合圖」）。
  已进入合盘时同一按钮变成 `Change the other person`（简中「更换人选」/ 繁中「更換人選」）。
- 点击后调 `openPersonPicker({ multiple: false, exclude: [当前人物id], onCommit, onCancel })`，
  单选模式点行即提交，没有确认按钮。
- `onCommit` 里用 `getPerson(id)` → `birthFromPerson(person)` → `computeChart(birth)` 得到第二个人的
  **清醒图**，再把 `{ chart, label }` 交给页面自己的合盘状态并重绘。
- 计算期间 `#dream-status` 显示「正在计算睡眠图……」「正在计算两张睡眠图……」；失败（例如出生资料不完整）
  同样只在 `#dream-status` 报错，**不弹新对话框**。
- 「当前人物」的稳定来源：`getCurrentChart()?.birth?.id`。`views/chart.js` 的 `current` 就是
  `main.js` 里 `loadBirth()` 算出的那个 `{ birth, chart, geneKeys }`，`birth.id` 是人物库 id；
  访客／手输场景没有 id，此时 `exclude` 为空，弹窗列出全部人物（见 §6.3.1）。
- 合盘只对「产生它的那张图」有效：`pendingComparison` 里记下 `forChart`，页面重新渲染时若
  当前图已换人，旧合盘被丢弃（`invalidateDream` 同样清空），不会留着上一对的合盘。

**已撤掉的旧链路：** `src/views/connection.js` 的 `#conn-view-dreams` 按钮与点击绑定、
`import { setDreamComparison }`、以及 `src/main.js` 里 `ohd-dream-navigation` 事件监听全部删除。
`setDreamComparison` / `clearDreamComparison` 仍在 `views/dream.js` 内部使用（前者是页面内
`onCommit` 落状态的地方），但已不再导出。

#### 6.3.1 共享选人弹窗的复用决策

用户要求复用团队页的选人弹窗。团队页原来的选择界面写在 `src/views/team.js` 内部，
不能直接跨页调用，因此抽成共享模块 `src/lib/person-picker.js`（由并行实例实施），
`team.js` 同步迁移到它。接口契约已冻结：

```js
import { openPersonPicker } from '../lib/person-picker.js';
openPersonPicker({ title, multiple: false, exclude: [currentPersonId], onCommit: ids => {}, onCancel: () => {} });
```

`views/dream.js` 静态 `import { openPersonPicker } from '../lib/person-picker.js'`。
单选模式点行即提交，所以页面拿到的 `onCommit` 不需要确认按钮；提交后对话框关闭，进度与错误都由
`#dream-status` 接管。模块缺席时的「暂时还无法选择另一个人。」兜底文案已随静态 import 删除。

**时间未知的人**：不新增规则。`birthFromPerson` 保留 `timeUnknown`，引擎侧
（`sharp-provider.js` 的 `effectiveTime`）对 `timeUnknown` 一律取 `12:00`，与本命图完全同一条路径；
合盘页只负责把人物资料交给 `computeChart`，不另做时间估计。

**访客／手输场景**：`getSharedGuest()` 只在 `main.js` 的分享链接流程里写入 `currentData`，
不进人物库，因此拿不到人物 id；此时 `exclude` 为空、列表展示全部人物，合盘对象来自人物库。
访客本身作为 A 方时没有稳定 id，这是可接受的：合盘对象始终是一个已保存的人。

**资料查证结论：**

- **公开资料中不存在 DreamRave 专属的合盘／连接理论。** 官方 DreamRave 课程（Night Forces I / II、
  DreamRave Analyst Certification）聚焦个人睡眠图分析与三个夜间场域，且 Ra 反复强调
  「独自睡、不要睡在他人气场内」，因此「两人梦境合盘」在官方体系中并非重点。
- 四种链接动态（电磁 electromagnetic / 主导 dominance / 妥协 compromise / 陪伴 companionship）
  是两张图叠加后的**机械结果**，不是清醒图专属理论，对任何闸门集合都成立。
  因此在梦境拓扑上复用现有 composite 机制在力学上是成立的。

**实现决定：**

- 复用 `renderBodygraph` 既有的 `composite` 选项与既有配色语义（A 色 / B 色 / 双方都有走斜纹 /
  关系中新定义走 bridged 色）。
- **不叠加天时**。
- **只陈述结构性事实**：各自睡眠类型、合起来定义的中心、完成的梦境通道、两人各出一半拼成的通道。
- **不写任何梦境语境下的关系含义解读**，也不新增梦境专属的链接类型判断。
  项目明确禁止 arbitrary compatibility scores。
- 老师原话「这个合盘的梦境图是原来设计啊，不用加入天时」与此一致。

**待办：** 若老师后续给出 DreamRave 专属的合盘说法，通过内容层接入，不改结构。

### 6.4 渲染器造型（本次不做）

当前几何来自 hdkit（MIT），为直线风格；官方 Jovian Archive / IHDS 风格带弧度。
用户将在另一个分支的页面重设计中处理，本次睡眠图沿用现有几何，只求功能正确，不追求美观。

**分层隔离已保证迁移代价可控。** 若将来更换渲染器：

| 保留（一行不改） | 需重做 |
|---|---|
| `dream-topology.js` 结构规则 | `renderBodygraph` 的 `topology` 选项 |
| `dream-chart.js` 计算与类型判定 | `views/dream.js` 中调用绘图的那一小段 |
| `dream-vocabulary.js` 与三语词汇 | `styles/dream.css` 中与图形尺寸耦合的部分 |
| 三域分组、门户规则与存根长度、天时叠加模型 | |
| 类型条、场域面板、激活列等文字面板 | |
| `dream-detail.js` 的数据组装与梦境专属事实 | 其对共享弹窗壳层的调用方式 |

---

### 6.5 点击详情弹窗——已实现，含一次关键的架构判断

需求：闸门、通道、中心都能点开，弹窗要显示**这个闸门是被哪些行星激活的**，与本命图体验一致。

#### 为什么不直接复用 `showTransitDetail`

最省事的做法是把梦境模型交给 `views/chart.js` 导出的 `showTransitDetail(kind, id, context)`，
因为 `buildDreamTransitGraph()` 的字段名刻意与 `buildTransitGraph()` 对齐，`transitGates` / `model`
那部分确实可以直接用。

**但这条路会显示错误数据。** `src/views/chart.js:607-612` 的 `showGateDetail` 直接遍历
`chart.gates.design` / `chart.gates.personality`，而这个 `chart` 取自 chart.js 自己的模块级
`current.chart`——也就是**清醒图**，不接受外部注入。`renderLens()`（同文件 :655 附近）同样读
`current.chart` 来决定高亮哪几爻。

实测对照（1990-05-20 06:30 UTC，第 1 闸门）：

| | 第 1 闸门的爻 |
|---|---|
| 清醒图设计侧（太阳 −88°） | 冥王星 **1.5** |
| 睡眠设计侧（月亮 −88°） | 冥王星 **1.4** |

复用共享弹窗会把 1.5 当成睡眠设计展示，并挂上 “Birth activations” 的文案。这正是
AGENTS.md §6「数据上下文明确」禁止的情形（原文举例：Penta 闸门详情不能隐式读取当前出生图人物的激活数据）。

#### 实际做法

新增 `src/lib/dream-detail.js`：**复用共享的弹窗壳层与内容组件，但自持激活数据。**

- 复用：`detail-dialog.js`（`prepareDetailDialog` / `openDetailDialog` / 焦点陷阱 / Escape / 手机 sheet 高度）、
  `object-detail-heading.js`（`renderGateDetailHeading` / `renderChannelDetailHeading` / `renderDetailNavigation`）、
  `shared-object-details.js`（`renderSharedGateReading` 的解读正文与传统切换、`bindSharedObjectDetails` 的事件委托）。
  **解读正文仍是清醒图那一套**，符合老师「描述用清醒时候的这些描述」的要求。
- 自持：三个来源（清醒人格 / 睡眠设计 / 天时）的行星与爻，全部取自传入的 dream 模型，
  绝不回读 chart.js 的 `current`。
- 梦境专属事实：所属场域（光场/地球层面/噩梦领域）、梦境闸门名、当前爻的梦境主题、门户标记。
  这些是共享弹窗没有槽位的内容，放在本模块自己的 tag 行与主题条里，**不 fork 共享弹窗、也不往其中塞梦境分支**。
- 控制器跨重绘存活：`detail.update({...})` 让语言/换肤重绘时保持同一个 DOM 实例与打开状态，
  否则 `detail-dialog.js` 会持有一个已脱离文档的引用。带真实 history 的返回按钮。
- 四个入口共用同一张表：图上闸门点击（`onGateClick` / `onCenterClick`）、激活列的行、
  场域面板的闸门号、场域面板的通道行。

合盘模式下同一控制器切换语义：不显示三来源激活，改为显示归属（`api.gateOwner` / `api.channelDynamic`），
即「由 A / 由 B / 双方都有 / 双方都没有」。

**回归防护已写入 e2e**：`the gate sheet shows sleep activations only, never the waking design`
把弹窗内出现的所有 `闸门.爻` 与页面上睡眠激活列 + 天时 chips 的集合做比对，
任何不属于睡眠设计的激活都会让用例失败。这条断言专门盯住上面那个 1.5 / 1.4 的错误。

---

## 7. 遗留问题

1. **月亮 −88° 的方向：已确认。** 项目维护者已明确回答「月亮回溯 88 度，设计时刻在出生之前」，
   第三方来源与实测同向。不再列为疑点，见 §3。
2. **Ra 逐字稿中一句读不到全文（低优先级备注）**："The Design is 88 degrees, this is about 8 degrees.
   It's very, very different." 原文 HTTP 403，上下文不明。方向已确认，**这句不再阻塞任何实现**，
   仅在老师后续讲到此句时复核。
3. **内容层待补**：老师提到「梦境图的通道有另一个定义」「天时激活的通道也是另一个定义」
   「15 个闸门会重新定义作用，名字不一样」「爻数会转成另一种爻数的描述」，
   并说「后续等开讲的时候统一讲」。目前已填入门户名与爻主题（公开资料可核实部分），
   完整描述留了接入位未填，等资料。接入路径应走 `src/lib/knowledge/` 内容层，
   参照 Penta 的模式，但**不得**复用 Penta 专属的审核策略；新增文本在确有审核证据前
   不应标记为 reviewed / verified（见 `src/lib/knowledge/schema.js` 的 `REVIEW_STATUSES`）。
   `schema.js` 的 `OBJECT_TYPES` 目前不含 dream，接入时需新增独立 objectType 与稳定 ID 规则。
4. **横向图后的版面重排未验证**：图已从纵向变为横向（渲染输出宽高比约 1.71），但三域面板仍在图下，
   用 `auto-fit` 的 `minmax(240px, 1fr)` 网格自动分列。横向图更宽更矮，三域面板是否应改到图的右侧，
   尚未定稿也未实测；也未逐个走查全部 Skin 在横向下的视觉效果。
5. **月亮 20.77 角秒残差的影响**：这是第 2 层已知未修的第三个问题，非睡眠图新增风险。
   20.77 角秒 ≈ 0.0058 度，而一个爻宽 0.9375 度，正常情况下不影响爻的判定；
   仅当出生数据恰好落在爻边界 0.006 度以内时理论上有极小概率翻转。清醒图面临同样情况。
6. **e2e 已全绿**（36 项）：早期三个选择器问题（语言、皮肤、modal）已修，见 §5。
   合盘段依赖 `src/lib/person-picker.js`，已在静态构建产物上完整跑通。
7. **本分支尚未 commit / push**。当前分支 `hana/15-0-09-15`，非 main。
   按 AGENTS.md，共享开发分支为 `dev/windows-development`，合并需另行授权。

---

## 8. 开发环境备注

- 9961 端口被本机安装的 OpenHumanDesign 桌面应用占用
  （`~/Library/Application Support/OpenHumanDesign/app/local/server.mjs`），**不是**本项目的预览，不可停止。
  隔离 worktree 按 AGENTS.md 规则使用 loopback 专属端口，本次为 `127.0.0.1:9962`。
- `public/engine/` 已被 `.gitignore` 忽略。本 worktree 的引擎资产是从主 worktree 复制而来。
- .NET SDK 在本机位于 `~/.dotnet/dotnet`（10.0.401），不在默认 PATH 中。
  跑引擎相关脚本需 `export DOTNET=~/.dotnet/dotnet`。
- `npm run dev` 会先跑 `build:engine`（需要 dotnet）。若只想跑前端，
  可直接 `npx vite --host 127.0.0.1 --port <port>`，前提是 `public/engine/` 已存在。
