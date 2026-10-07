# Skin Palette V2 验证

基线：`feature/skin-presets-v1` / `fad5031d8ddcbe147c6aea5ce0d55ebfddf6b97a`。
工作分支：`fix/skin-palette-v2`。主分支与生产环境不参与本轮。

## 交付

- 九套完整 Palette V2，各自覆盖 90 个 canonical Token，主色和 Transit on/text/soft 与用户附件逐项一致。
- Registry 只更新预览数值；时间轴主 Signal 直接使用 `--hd-transit`，移除固定蓝灰锚点。
- Type / Circuit / Relationship mechanics 降低彩度；Circuit soft 6–12% 浅背景，关系 core 为每套独立计算后固化的中性高光。
- Both 仍为 A/B stripe / gradient；不添加第三种关系主色。
- 七套网站基础 Token 全部与 V1 一致。Absolutely / Deep Think 只改批准的 Accent bundle、Focus 和对应 selection/detail/defined-fill 语义。
- 默认两套、Center Palette、字体、Storage V3、Picker 布局、BodyGraph renderer、关系算法、Penta 均有保留检查。

## 定向测试

全部九套修改完成后统一执行；没有逐套跑测试。

| 检查 | 结果 |
|---|---|
| Skin Presets / Appearance contract / preferences / derived chart analysis | 19 passed，0 failed，0 skipped |
| Appearance / BodyGraph Integration | 8 passed，0 failed，0 skipped |
| `npm run test:timeline` | 63 passed，0 failed，0 skipped |
| `npm run e2e:appearance` | skin linkage 与 controls（1224 / 390）全部通过 |
| `npm run e2e:skin-presets` | 11 Skin × 8 surfaces；关系绘制、五项 override、恢复、重载、中心独立、字体保留、语言、键盘、mobile / shortcut 全部通过 |
| `npm run build` | passed，保留原有大 chunk 警告 |
| 浏览器 pageerror | 0 |

使用现有本机 Chrome；引擎构建使用临时 .NET 10.0.401 路径 `/tmp/td-ohd-skin-presets-sdk/dotnet`。未安装到全局。
不运行完整 Release E2E，不运行年度生成 / 验证。

## 可比较的视觉证据

九套均使用：

- 出生图：2000-05-10 12:30 GMT+8。
- 关系图：该出生图 + 1985-03-20 08:00 UTC，覆盖四种关系机制。
- Timeline：2025-03-15 00:00 至 2026-03-16 00:00（GMT+8），选择 2026-03-15 12:00，过去一年。
- 1224 × 900 viewport；截图前移除测试环境中的动画 / hover 干扰，远程字体不加载，字体设置未改变。
- 每套 1,690 个时间条，比较所有 source / left / width / text 与 start / end / selected 完全一致；普通 transit bar 实际 background / foreground 与 Signal / On Token 一致。

证据保存在本机 `outputs/TD-OHD-Skin-Palette-V2/`（当前本地环境工作区），包含九套同 Timeline、出生图、关系图的独立截图，三张 3×3 对照图，Picker desktop / mobile 和可点击原图的 `comparison.html`。截图没有加入源码仓库。

视觉检查：

| Skin | Timeline / Signal 观察 |
|---|---|
| 素白 | 深青绿条，与钢蓝 UI 分工明确 |
| 草香 | 森林绿条，页面灰绿，辅助陶土色 |
| 沉思 | 灰紫条，从雾灰蓝环境中突出 |
| Absolutely | 奶油暖灰 + Orange，Design 改为冷灰辅助 |
| Delve | 浅灰结构 + 黑条，未使用蓝色重点 |
| Deep Think | 鲜明蓝条，九套中主要的蓝色 Skin |
| 新暖纸 | 青灰蓝 UI + 朱砂条，纸面与印章关系清楚 |
| 青夜 | 深青夜 + 暖玫瑰条，第一重点不再为 Cyan |
| 珊瑚 | 墨蓝 UI + 珊瑚朱条，行运没有再次变蓝 |

九套时间轴主 Signal 不再大量趋同蓝灰。Type / Circuit 用于小面积辅助标识，soft 不形成大彩块；关系 A/B 在图中可区分，整体比 V1 克制。相近的灰绿 / 陶土关系色是按附件采用的辅助身份色，关系页辨识度主要还来自 surface 与背景，而不是把关系色再提高到行运强度。
出生图没有 Transit，因此不添加 Signal 来制造辨识度。九中心配色保持独立，未做协调性改色。

## 明确保留的对比度例外与人工检查建议

这两组数值由附件明确指定。测试逐项锁定批准 HEX，另将其实际对比度作为明确例外记录；其余前景仍要求 4.5:1。

| Skin / 场景 | 批准前景 | 背景 | 对比度 | 结论 |
|---|---|---|---:|---|
| 草香 Transit bar On | `#10251A` | `#3F8D5E` | 3.98:1 | 低于普通小字 4.5:1，后续建议人工决定是否使用更深 foreground |
| 珊瑚 Transit Text | `#C45D49` | `#FDF6EC` | 3.91:1 | 低于普通小字 4.5:1，后续建议人工决定是否压暗文字色 |

其余来源 On、独立关系 On、A/B 共用 Both On 及其余 Transit Text 都达到 4.5:1。当前不擅自改变上述批准值。

## 完整修改文件

- `docs/SKIN-PRESETS.md`
- `docs/skin-palette-v2-validation.md`
- `src/features/transit-timeline/timeline.css`
- `src/lib/skin-registry.js`
- `src/styles/skins/high-contrast.css`
- `src/styles/skins/grass-aroma.css`
- `src/styles/skins/contemplation.css`
- `src/styles/skins/absolutely.css`
- `src/styles/skins/delve.css`
- `src/styles/skins/deep-think.css`
- `src/styles/skins/new-warm-paper.css`
- `src/styles/skins/midnight-contrast.css`
- `src/styles/skins/coral.css`
- `tests/appearance-skin-e2e.mjs`
- `tests/fixtures/skin-presets-approved.json`
- `tests/fixtures/skin-palette-v2-boundaries.json`
- `tests/skin-presets-e2e.mjs`
- `tests/skin-presets.test.js`

## 范围确认

未更改九中心、字体、计算、Knowledge、关系算法、Penta、Worker 源码、SEO / OG / OAuth、分享链接结构。
未 merge；未 deploy；未更新本机正式 8787 安装。
