# Center Palette V2：六套中心配色与共享 Picker

状态：当前工作区预览，待用户审阅。未提交、未推送、未合并、未部署；未运行完整测试或 build。

## 独立边界

Skin 继续控制网站、Personality / Design / Transit、Timeline 和 Relationship 等语义颜色。Center Palette 只控制九中心的九个 edge 与九个 core，任意 Skin 可搭配任意 Center Palette，Font 仍独立。本轮不改 `bodygraph.js`，不改渐变几何或计算。

`src/lib/center-palette-registry.js` 是独立正式入口：`CENTER_PALETTES`、`CENTER_KEYS`、`CENTER_PALETTE_TOKENS`、`getCenterPalette()`。记录包含 `id/name/tagline/preview/signature/cssSource`，以及 Picker 暗色预览所需的 `darkEdgeRatio/darkEdge`。`preview` 按固定九中心顺序保存 light edge。`skin-registry.js` 仅兼容转导出，Skin 列表不包含 Center Palette。

## Light edge

| Center | classic | chakra | jewel | mineral | ink | porcelain |
|---|---|---|---|---|---|---|
| head | #D9BC55 | #8F79AE | #6E3FA0 | #C2A34B | #4B4A47 | #B7A7C9 |
| ajna | #8FAF72 | #6675A8 | #384D9B | #7E9272 | #4B4A47 | #A7B0CE |
| throat | #B88957 | #5E91B0 | #1F6F9A | #9B7B61 | #4B4A47 | #9DBDD0 |
| g | #D9BC55 | #6F9E86 | #2E7D64 | #B59B66 | #4B4A47 | #A8C4B4 |
| heart | #C65B51 | #65946E | #3E7B48 | #A95B4C | #4B4A47 | #A7BEA8 |
| spleen | #B88957 | #A89C56 | #7D7A2E | #8A7A55 | #4B4A47 | #C8C49B |
| solar | #B88957 | #C6A84E | #A46B16 | #A87643 | #4B4A47 | #D6C28B |
| sacral | #C65B51 | #C98354 | #A44D1E | #B25D3B | #4B4A47 | #D7A98A |
| root | #B88957 | #B8645A | #8E3030 | #765849 | #4B4A47 | #C9958F |

## Dark edge 与统一渐变

- Classic / Chakra / Mineral：原 edge 90% + white 10%。
- Jewel：原 edge 94% + white 6%，保持浓郁深色。
- Ink：九中心统一 `#96938E`，不沿用 light 的 `#4B4A47`。
- Porcelain：原 edge 96% + white 4%。
- 所有 Light core：`color-mix(in srgb, var(--hd-center-<id>) 84%, white)`。
- 所有 Dark core：`color-mix(in srgb, var(--hd-center-<id>) 93%, white)`；输入为已补偿后的 Dark edge。
- 渐变几何保持 `cx=0.5 / cy=0.36 / r=0.78`。

`base.css` 统一定义 core；六个独立 CSS 只定义 edge。旧 Classic 默认选择、Chakra 的 `data-hd-skin` fallback 继续有效。

## Picker 与存储

Skin 与 Center Palette 共用 `.appearance-choice-card/name/mode/check` 的布局、间距、圆角、hover、focus 和选中勾。保留原 Skin class，以兼容已有 selector 与 Auto 的明暗分割预览。

桌面三列、手机两列。Center Palette 使用 12px 方块、2px 圆角、4px 间距的 3×3 九宫格；顺序为 Head/Ajna/Throat，G/Heart/Spleen，Solar/Sacral/Root。预览与真正中心 edge 使用同样的明暗规则，第二行有独立 palette signature。

小字 signature 按当前 mode 的 palette signature 45% 与普通 text 55% 混合，保证浅瓷彩与深宝石在明暗卡片上均能阅读；不绑定当前 Skin Accent，不改图表中心色值。选中边框仍复用现有 Accent。

沿用 `td-ohd-appearance-v3`，`centerPalette` 仍只存 ID。Classic/Chakra 旧值仍可解析，新增四个 ID 不需要迁移。没有逐中心自定义，也没有修改现有 Skin override 和 gateNumberSize 逻辑。

## 实际页面查看记录

使用实际出生图 `2000-05-10 12:30 UTC+8`，以及真实行运页面。下表每组都查看出生图和行运图，合计 16 组、32 张图表截图。出生图有六个有定义中心；当前行运补全情绪中心，九宫格预览另外覆盖全部九个 edge。未声称用一张全定义图检查了全部九个中心。

| Palette | Skin |
|---|---|
| Classic | Amber Dawn、Amber Dusk |
| Chakra | High Contrast、Midnight Contrast |
| Jewel | Delve、Midnight Contrast、Deep Think |
| Mineral | New Warm Paper、Absolutely、Coral |
| Ink | Delve、High Contrast、Amber Dawn |
| Porcelain | Contemplation、New Warm Paper、Midnight Contrast |

另在 Midnight Contrast 下选 Ink、刷新页面，确认选择保留，edge 为 `#96938E`。检查 1224px 三列、390px 两列，无页面横向溢出；六张卡各有九个预览块。简体、繁体、English 通过实际语言菜单确认；Skin 原十一张卡与 Auto 均保留。恢复当前 Skin 后选中的 Center Palette 保留。浏览器查看时没有 error 级 console 日志。

截图位于工作区外：`/Users/abyssldx/Documents/ChatGPT/本地环境相关/outputs/TD-OHD-Center-Palette-V2/`。

## 视觉判断与待审阅点

- Classic：传统分组清楚，较旧色更沉稳；较小 core/edge 差异使高光更克制。
- Chakra：完整光谱辨识清楚，明暗组合稳定。
- Jewel：浓郁且不荧光，与 Porcelain 区别明显；Midnight Contrast 下蓝紫中心与表面距离较小。深底中心里的部分未激活闸门数字对比偏弱，需要未来专门审阅文字规则。
- Mineral：暖纸、Absolutely、Coral 都协调，暖土色有层次；与 Classic 的区别较细，但不是同一套配色。
- Ink：形状和布局成为主要识别线索，Delve 行运的蓝色突出；Light 深色中心中未激活数字偏弱，普通出生图的黑灰通道与中心色之间视觉距离也较小。Dark 已使用更亮 edge。
- Porcelain：柔和但仍能识别色相，深色 Skin 下与图表背景分离清楚；浅色 Skin 下比 Jewel 更轻，部分淡色中心边界依靠原有 stroke。

当前倾向：Classic/Mineral 作为稳妥选择，Jewel/Porcelain 作为最明确的深浅两端，Ink 作为单色选项。六套全部保留，暂不建议直接删除；Ink/Jewel 的文字对比风险先登记，本轮不改 BodyGraph 的文字、gate circle、opacity 或 Skin 中性颜色。

## 验证边界

本轮只做实际 UI 操作、页面截图及 DOM 观察，没有运行 unit / E2E / responsive suite / build。上述截图范围是本轮人工查看记录，不替代最终 Release Gate。后续统一验收时需要更新历史两套 Palette、旧 edge/core 精确值对应的 fixture，再运行相关测试。

## 后续 Appearance Reset 更新

上文“恢复当前 Skin 后 Center Palette 保留”是 V2 初次人工查看时的历史行为。最新 Footer 已按追加需求改为“恢复默认外观”：固定 Amber Dawn / manual / Classic，清空全部 Skin overrides 与 Appearance preferences。六套 Center Palette 的数值、Registry 和九宫格保持不变，见 [APPEARANCE-RESET-AMBER-DAWN.md](APPEARANCE-RESET-AMBER-DAWN.md)。
