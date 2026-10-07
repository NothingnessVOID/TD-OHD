# Skin Palette V3 验证

基线为 V2 `871b196` 的后续对比度修正 `3a91e4e`，保留此前珊瑚 Transit Text 修正。开发分支：`fix/transit-source-strategy-v3`。

## 改动与边界

- 11 Skin 都有 `transitSourceMode`；仅 Delve 为 `unified-natal`，其余为 `split`。
- Sources 增加 Overlay Natal / On，canonical Token 为 92。九套新皮肤按批准的 V3 配色更新，人格、设计、行运、Picker Preview 同步。
- 普通出生图始终使用人格 / 设计和 P/D 条纹；只在存在行运模型时读取 Skin 策略。Delve 行运出生来源使用 Natal 灰、行运黑。
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
| `delve` | 17.40:1 | 5.02:1 | 18.88:1 | 5.02:1 |
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
- Delve：出生图黑 / 灰及 P-D 条纹；行运视图 Natal 灰 / Transit 黑及重叠 ring / hatch。
- 素白、草香、沉思、青夜：三来源在本次同场景截图中可区分，暂不建议改为 unified-natal。中心颜色保留原 Classic，不属于来源色改动。

### 仍保留的边界

Worker / OG / 服务端分享输出、Center Palette 适配和用户自定义颜色造成的对比度变化留在各自既有边界；没有以 V3 名义修改这些表面或 Storage。附加的 token 哈希测试锁定 V2 网站表面及相关算法文件。没有运行完整 Release E2E 或年度验证，没有合并 main，没有部署。
