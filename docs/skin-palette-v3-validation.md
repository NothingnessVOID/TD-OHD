# Skin Palette V3 验证

前面的测试结果为已提交 V3 / Azure 修正的历史记录；黑白蓝语义与 V4 角色修改只完成人工复核，见文末。

基线为 V2 `871b196` 的后续对比度修正 `3a91e4e`，保留此前珊瑚 Transit Text 修正。开发分支：`fix/transit-source-strategy-v3`。

## 改动与边界

- 11 Skin 都有 `transitSourceMode`；仅 Delve 为 `unified-natal`，其余为 `split`。
- Sources 增加 Overlay Natal / On，canonical Token 为 92。九套新皮肤按批准的 V3 配色更新，人格、设计、行运、Picker Preview 同步。
- 普通出生图始终使用人格 / 设计和 P/D 条纹；只在存在行运模型时读取 Skin 策略。Delve 行运出生来源使用 Natal 灰、Azure 蓝行运色（在 V3 后续定向修正）。
- Integration 的上 / 下 span 与 joined path 同步；出生与行运重叠用现有 ring / hatch。行运独立模式没有出生来源条纹。
- 共享行星列保留栏目、数值与 tooltip；统一模式下两列使用 Overlay Natal。临时 Line Fixing 标记仍用 Transit Text。
- Timeline Birth 轨道和图例读取 Overlay Natal，Transit 读取 Transit，保留四项图例。轨道事件、计算、布局未改变。
- Type、Circuit、Relationship、网站表面、中心 Palette、字体、Storage V3、Picker 布局和业务算法以 V2 哈希 / token fixture 保护。
- 默认暗色 Design 主色不变，On 从白改为 `#16130F`，满足本轮小字前景对比度要求。

## 定向验证

实施完成后统一运行定向测试、构建，再做浏览器行为验证及同场景截图，结果全部通过。

行为测试包含 11 Skin 的普通出生图、Overlay、重叠 Integration、Transit-only；检查路径、圆圈、数字前景、Integration span、共享行星列、临时 fixing、图例、模型不变和跨 Skin geometry 一致。

截图使用同一出生信息与固定行运时刻，九套出生图 / 行运图 / Timeline 图窗及轨道；另生成新暖纸、Absolutely、Delve、Deep Think、珊瑚放大对照。证据输出在仓库外。

不执行年度生成 / 验证或完整 Release E2E；不合并，不部署。

## 实测结果

| 验证 | 结果 |
|---|---|
| Appearance contract / Skin presets / Appearance / Preferences / BodyGraph Integration / Transit graph / presentation | 32 passed |
| Timeline（7 个既有定向文件） | 63 passed |
| 合计 | 95 passed / 0 failed / 0 skipped |
| `npm run build` | PASS；Sharp WASM + Swiss 资源验证成功，Vite 构建成功 |
| `tests/transit-source-strategy-e2e.mjs` | PASS；11 Skin × 出生 / Overlay / 重叠 / 仅行运 |
| `npm run e2e:appearance` | PASS；1224px / 390px，切换、用户颜色、restore、persist、Palette 独立 |
| `tests/graph-window-fixing-colors-e2e.mjs` | PASS；临时 fixing 跟随 Transit Text，Gate.Line 不回归 |
| `npm run e2e:skin-presets` | PASS；11 Skin × 8 表面，三语言、Picker、关系图、颜色、缓存恢复 |
| 九套视觉对照、五套放大对照 | PASS；普通出生 / Transit Overlay / Timeline 图窗 + Tracks |

固定出生信息：2000-05-10 12:30 GMT+8。固定行运时刻：2026-03-15 12:00 GMT+8。各 Skin 的年度跨度显示均为同一份 1690 条轨道片段（已有缓存，未生成或验证年度 bundle），时间、事件、文本、片段位置完全一致。浏览器 `pageerror` 为 0。

构建保留既有的大 bundle 警告，不属于本轮 source strategy 的失败。

### 小字前景对比度

下表为浏览器最终 computed Token 的 On 对主色比值；九套 Transit Text 对页面背景也由定向单元测试检查，均 ≥ 4.5:1。

| Skin | Personality On | Design On | Transit On | Overlay Natal On |
|---|---:|---:|---:|---:|
| `default-light` | 13.77:1 | 5.44:1 | 13.60:1 | 5.74:1 |
| `default-dark` | 13.56:1 | 4.85:1 | 13.60:1 | 6.41:1 |
| `high-contrast` | 15.62:1 | 5.12:1 | 5.80:1 | 4.85:1 |
| `grass-aroma` | 10.83:1 | 4.77:1 | 5.15:1 | 4.67:1 |
| `contemplation` | 11.99:1 | 4.74:1 | 6.06:1 | 5.15:1 |
| `absolutely` | 18.43:1 | 4.75:1 | 5.84:1 | 5.35:1 |
| `delve` | 17.40:1 | 5.02:1 | 4.55:1 | 5.02:1 |
| `deep-think` | 14.35:1 | 5.01:1 | 5.17:1 | 4.94:1 |
| `new-warm-paper` | 15.01:1 | 8.48:1 | 4.57:1 | 5.21:1 |
| `midnight-contrast` | 17.70:1 | 7.46:1 | 8.95:1 | 9.35:1 |
| `coral` | 13.44:1 | 5.70:1 | 6.78:1 | 4.65:1 |

### 截图与视觉判断

截图证据：`outputs/TD-OHD-Skin-Palette-V3/`，位于本机任务目录，未加入 Git。包含九套出生 / 行运 / Timeline 原图、三张总对照、五张放大对照、三语言 Picker 与两份浏览器结构记录。测试入口在仓库中，可重新生成原图。

- 新暖纸：墨色 / 朱砂 / 青灰蓝恢复，出生图与行运来源清晰。
- Absolutely：墨黑 / 暖灰褐 / 橙，保留橙灰配色气质。
- Deep Think：蓝黑 / 暖红 / 蓝；Transit 仍有明确蓝色身份。
- 珊瑚：墨蓝 / 灰青 / 珊瑚朱，三来源没有混成同色。
- Delve：出生图黑 / 灰及 P-D 条纹；行运视图 Natal 灰 / Transit Azure 蓝及重叠 ring / hatch。此前提交 `034fa1b` 的灰 / 黑截图保留为历史证据，最新对照见下节。
- 素白、草香、沉思、青夜：三来源在本次同场景截图中可区分，暂不建议改为 unified-natal。中心颜色保留原 Classic，不属于来源色改动。

### 仍保留的边界

Worker / OG / 服务端分享输出、Center Palette 适配和用户自定义颜色造成的对比度变化留在各自既有边界；没有以 V3 名义修改这些表面或 Storage。附加的 token 哈希测试锁定 V2 网站表面及相关算法文件。没有运行完整 Release E2E 或年度验证，没有合并 main，没有部署。


## Delve Azure Accent 定向修正

基线：`034fa1b9814f471ed74cf142f56cc81881e06247`，继续在 `fix/transit-source-strategy-v3`。

Delve 保留白 / 灰 / 黑的结构表面及 `unified-natal`，仅将 UI Accent、Focus、Selection、Detail Border、通用 defined-fill 与 Transit Signal 改为 Azure `#2E75D4`；strong / hover / Transit Text 为 `#245FAE`。这是 OpenAI / ChatGPT product-inspired blue accent，不能称为官方品牌色。

普通出生图继续 Personality `#1A1A1A`、Design `#6F6F6F`；行运视图 Natal `#6F6F6F`、Transit `#2E75D4`，Completed / Both 保留灰蓝组合。白字对 Azure 主色实测 **4.55395:1**，符合 4.5:1；92 canonical Token 完整。

`--hd-defined-fill` 在现行中心 renderer 中未用作九中心实际填色，只有旧兼容 alias；同步该强调 token 不会替换中心 Palette。九中心 edge/core、Type / Circuit / Relationship、字体、存储、Deep Think 及 `transitSourceMode` 配置均不变。

### 验证与截图

- Skin presets / Delve 定向检查：8 passed。
- Timeline 定向检查：63 passed。初次终端没有找到 `dotnet`，补充既有 SDK 路径后通过；没有更改引擎。
- Transit source strategy 浏览器检查：11 Skin 的出生 / Overlay / 重叠 / 仅行运、Integration、前景、行星列、图例及 geometry 通过。
- Delve / Deep Think 实页检查：出生图、Transit、Timeline、Picker、灰蓝 Completed / Both 图例和中心保持通过；浏览器 pageerror 为 0。
- Build：PASS；保留既有大 bundle 提示。未跑全部 Skin 大量截图、完整 Release E2E 或年度验证。

在两套皮肤连续切换的对照中，发现隐藏 Timeline 的 SVG paint cache 未被 Appearance refresh 失效，重新进入时可能保留上一套 Skin 的路径颜色。仅调整 `refresh()`：无论是否可见都清空 paint key，可见时才重新渲染。没有改时间轴结构、计算缓存、来源模式或事件计算。实页测试覆盖 Delve → Deep Think 切换后重新进入 Timeline，并等待正确策略及路径色。

最新截图：本机任务目录 `outputs/TD-OHD-Delve-Azure/Delve-vs-Deep-Think.png`，六个同场景对照及原图在仓库外。视觉核对：Delve 灰 / Azure 两来源，Deep Think 蓝黑 / 暖红 / Indigo 三来源，两个蓝色与整体配色均可区分。旧 V3 灰 / 黑截图保留为历史记录。

未 merge main，未 deploy。


## Delve 黑白蓝语义与 Reliability 收口（V4 前工作区快照）

基线：`685d33a4a5bd253b46dfae5363361e419bf2c365`。保持 `unified-natal`，没有修改来源逻辑、计算、中心、字体、Storage、Relationship、Penta、Knowledge、Share 或 Worker。

- Site Accent `#111111`，strong / hover `#000000`，soft `rgba(0,0,0,0.05)`；Focus / Selection 仍为 Azure `#2E75D4`。defined-fill / Detail border 恢复黑色 `#111111`。
- 普通出生图 Personality `#1A1A1A` / Design `#6F6F6F` 不变；行运图 Natal `#6F6F6F` / Transit `#2E75D4` 不变。
- 新增 `--hd-timeline-transit`，Delve 为 `#1F4F85`，其余十套为 `var(--hd-transit)`。仅轨道、图例及既有轨道派生表面读取该 Token，图窗 BodyGraph 继续读取 Azure Transit。
- Reliability 不再使用 `reliability-soft`。完全稳定为 solid（Success），有 shifts 为 info（Info），未知出生时间为 caution（Caution）。原条件计算与文案不变。
- Canonical 共 **96**：site 34、graph 22、sources 12、types 5、circuits 8、relationship 15。所有 Skin 显式提供新增 Info / Info Soft / Caution。

### 实页人工复核

使用本轮本地预览 `http://127.0.0.1:5212/` 的隔离浏览器上下文截图，查看实际页面及其计算后的样式；没有写入用户浏览器设置。

| 画面 | 实际结果 |
|---|---|
| 首页 | 黑白灰结构，黑色重点，Info 极浅蓝底 |
| 出生图（2000-05-10 12:30 GMT+8） | 黑 / 灰来源，Classic 中心保持 |
| 行运图（2026-03-15 12:00 GMT+8） | unified-natal，灰 / Azure 蓝 |
| Timeline（过去一年） | 出生条 `rgb(111,111,111)`；行运条 `rgb(31,79,133)`；Completed / Both 灰墨蓝组合 |
| Solid（1985-03-20 08:00 GMT+8） | Dot `#5C8A68`，Background `#F1F6F2` |
| Info（2000-05-10 12:30 GMT+8） | Dot `#2E75D4`，Background `#EEF4FC` |
| Caution（1990-01-01，时间未知） | Dot `#A36F2B`，Background `#FAF5EA` |
| 独立状态语义 | 检查页临时将 Accent 改为紫色，Info Dot / Background 仍蓝 / 浅蓝；恢复后截图 |

浏览器 pageerror：0。截图和样式记录保存到仓库外：`/Users/abyssldx/Documents/ChatGPT/本地环境相关/outputs/TD-OHD-Delve-Semantics/`。

本轮**未运行 unit / E2E / build / annual / Release 验证**。已有断言与颜色 fixture 已同步；新增状态契约检查已准备，留到颜色确认后的统一验证。未 merge、未 deploy。本轮修改留在当前任务分支工作区，未提交或推送。

### 本轮修改文件

- `docs/SKIN-PRESETS.md`
- `docs/SKIN-SYSTEM.md`
- `docs/skin-palette-v3-validation.md`
- `src/features/transit-timeline/timeline.css`
- `src/lib/skin-registry.js`
- `src/styles.css`
- `src/styles/skins/absolutely.css`
- `src/styles/skins/contemplation.css`
- `src/styles/skins/coral.css`
- `src/styles/skins/deep-think.css`
- `src/styles/skins/default.css`
- `src/styles/skins/delve.css`
- `src/styles/skins/grass-aroma.css`
- `src/styles/skins/high-contrast.css`
- `src/styles/skins/midnight-contrast.css`
- `src/styles/skins/new-warm-paper.css`
- `src/views/chart.js`
- `tests/appearance-contract.test.js`
- `tests/delve-blue-accent-e2e.mjs`
- `tests/fixtures/skin-palette-v3-boundaries.json`
- `tests/fixtures/skin-presets-approved.json`
- `tests/skin-presets-e2e.mjs`
- `tests/skin-presets.test.js`
- `tests/transit-source-strategy-e2e.mjs`


## Skin Color Role V4（当前未提交工作区）

本轮沿用全部上一轮修改，没有 reset / checkout / 回退。九套 Theme Accent、BodyGraph Transit、Timeline Transit 的最终矩阵见 `SKIN-PRESETS.md`；Canonical 保持 96。默认两套的 Timeline alias、Reliability 三状态、Personality / Design、Type / Circuit / Relationship、九中心、字体和所有计算保持。

### 人工视觉判断

使用 5212 实际页面：每套都打开普通出生图、Transit BodyGraph、Timeline 图窗、Timeline Tracks，保存九套同一出生信息 / 同一时刻 / 同一过去一年范围的截图。按三套一组生成对照，另有新暖纸四场景放大图。

- 新暖纸：出生图的墨与朱砂不变。`#4A94B2` 在通道、闸门 ring 与 Timeline 图窗里更清亮；右侧轨道 `#537D96` 明显更沉静。保持暖纸底，没有把页面大面积改成亮蓝。
- 草香：BodyGraph `#5AA486` 比轨道 `#4D9179` 更清亮，仍为植物绿色系；没有出现高亮薄荷绿的视觉。
- 沉思：BodyGraph `#6F9DB2` 的小面积行运路径更容易辨认，轨道 `#7E99A8` 继续呈灰雾蓝；没有变成鲜艳科技蓝。
- Delve：页面黑，出生黑 / 灰，图窗灰 / Azure，轨道灰 / Navy；与 Deep Think 的 Royal / Indigo 可以区分。
- Absolutely：图窗橙与轨道深橙保持同系；旧深色前景在新轨道上约 4.32:1，改为 `#100B08` 后约 4.64:1。只改这一套共享 Transit On，其余八套 On / Text / Soft 未变，没有新增 Timeline 前景 Token。
- 素白：钢蓝与更沉钢蓝可区分；青夜：亮玫瑰与深玫瑰可区分；珊瑚：朱色 Signal 与墨蓝结构保持分离。当前同场景检查没有发现其他 Skin 的 Signal 明显过暗或刺眼。

这些判断来自当前截图场景，颜色尚待用户确认；不代表全场景回归验收。

### 实际轨道色与证据

| Skin | Theme Accent | BodyGraph Transit | Timeline Transit | 实际轨道色 |
|---|---|---|---|---|
| `high-contrast` | `#3A6B85` | `#3A6B85` | `#315B70` | `rgb(49, 91, 112)` |
| `grass-aroma` | `#5BA88C` | `#5AA486` | `#4D9179` | `rgb(77, 145, 121)` |
| `contemplation` | `#7E99A8` | `#6F9DB2` | `#7E99A8` | `rgb(126, 153, 168)` |
| `absolutely` | `#D97757` | `#D97757` | `#B96449` | `rgb(185, 100, 73)` |
| `delve` | `#111111` | `#2E75D4` | `#1F4F85` | `rgb(31, 79, 133)` |
| `deep-think` | `#4D6BFE` | `#4660E5` | `#394FC5` | `rgb(57, 79, 197)` |
| `new-warm-paper` | `#537D96` | `#4A94B2` | `#537D96` | `rgb(83, 125, 150)` |
| `midnight-contrast` | `#E6B1C4` | `#E6B1C4` | `#C98FA5` | `rgb(201, 143, 165)` |
| `coral` | `#1A3049` | `#F37E63` | `#D5634E` | `rgb(213, 99, 78)` |

浏览器 pageerror：0。Registry preview 的 Transit 跟随 BodyGraph 主色；源码中的 `transitSourceMode` 未变。

证据目录：`/Users/abyssldx/Documents/ChatGPT/本地环境相关/outputs/TD-OHD-Skin-Color-Role-V4/`。

- `index.html`：九套完整对照。
- `comparison-1.png`：素白 / 草香 / 沉思。
- `comparison-2.png`：Absolutely / Delve / Deep Think。
- `comparison-3.png`：新暖纸 / 青夜 / 珊瑚。
- `new-warm-paper-enlarged.png`：新暖纸单独放大，含出生 / 行运 / Timeline 图窗 / Tracks。
- 各 Skin 的 `*-birth.png` / `*-transit.png` / `*-timeline.png` / `*-timeline-graph.png` / `*-tracks.png` / `*-picker.png`：原图。
- `manual-review.json`：实际 Token、轨道 / 图窗颜色与页面错误记录。

本轮更新源码、文档与后续断言 / fixture，**没有运行 unit / E2E / build / annual / Release 验证**。前文旧轮次通过记录保持历史状态；当前颜色确定后再统一运行定向验证。

所有改动仍为本文“本轮修改文件”清单中的 24 个文件；没有把截图、临时脚本或构建产物加入仓库。未 commit / push，未 merge，未 deploy。
