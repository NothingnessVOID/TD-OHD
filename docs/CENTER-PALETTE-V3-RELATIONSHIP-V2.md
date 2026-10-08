# Center Palette V3 / Relationship Visual V2

本轮继续未提交工作区，使用用户指定的最终色值、名称、默认配套与视觉规则。历史 V2 文档保留，本文件记录当前规则。

## 中心配色

正式九套为 classic、chakra、jewel、mineral、ink、porcelain、botanical、paper、night-bloom。`src/lib/center-palette-registry.js` 登记 edge、foreground、render 与 core 比例；各 Palette CSS 提供九中心 edge/core/on 共 27 个 Token。

Classic / Chakra 使用 92% edge + 8% white，Porcelain 使用 95% edge + 5% white。三者保持 radial 几何 cx=0.5、cy=0.36、r=0.78。其他六套直接 SVG 纯色填充，不建立径向渐变。Ink 在暗色 Skin 下使用批准的 #96938E / #111111，其余配色不自动改色。

未激活闸门位于有定义中心时读取 Center On；未定义中心继续读取 inactive On。P/D/Transit/Both 等实际来源继续读取来源 On，中心配色不覆盖来源语义色。关系合图的未激活闸门读取所属中心的 Relationship On。

## Skin 默认配套与 Relationship 批准值

| Skin | 默认 Center | Person A | Person B | Created | On |
|---|---|---|---|---|---|
| default-light / Amber Dawn | mineral | #3D7C76 | #A85C50 | #806B42 | #FFFFFF |
| default-dark / Amber Dusk | mineral | #75B1A7 | #D49280 | #C5A75F | #111111 |
| high-contrast | classic | #315B70 | #A44D46 | #816C3B | #FFFFFF |
| grass-aroma | botanical | #3F755F | #A95F50 | #7E7641 | #FFFFFF |
| contemplation | porcelain | #587586 | #90626B | #716B54 | #FFFFFF |
| absolutely | mineral | #566D66 | #A6543F | #7F6948 | #FFFFFF |
| delve | ink | #1F4F85 | #8D555A | #4B4B4B | #FFFFFF |
| deep-think | jewel | #394FC5 | #A45159 | #66559A | #FFFFFF |
| new-warm-paper | paper | #4B7188 | #8B2C1F | #806B45 | #FFFFFF |
| midnight-contrast | night-bloom | #7FA7B8 | #E6B1C4 | #B9A77A | #111111 |
| coral | chakra | #1A3049 | #B45343 | #617C6C | #FFFFFF |

## 跟随与手动选择

`centerPaletteMode` 为 `skin-default` 或 `manual`。首次无保存选择时跟随 Skin；旧已保存的 Palette 迁入 manual，保持用户选择。当前 v3 存储增加模式和 manualCenterPalette，不删除旧存储或业务数据。

Picker 第一张「随皮肤 / 隨皮膚 / Match Skin」动态预览当前 Skin 默认 Palette，不注册为 Palette。Root 的 data-center-palette / data-hd-skin 永远为解析后的实际 Palette ID。

手动点击任意 Palette 后切换 Skin 不改变该 Palette；再次点击随皮肤恢复当前 Skin 默认。Reset Appearance 固定回到 Amber Dawn、manual Skin、skin-default Center、Mineral，清空全部 Skin 颜色 override 和独立字号偏好，恢复 22px；字体、人物与语言保持。

## 关系合图视觉语法

- A / B 中心纯色，Both 中心 A/B 硬切对角分区，Created 中心使用批准的独立纯色。
- Both 闸门和 Companionship 通道使用等宽 45° A/B 条纹，不产生第三种混合颜色。
- Electromagnetic 两端保留各自 A/B 来源；小型机制 marker 使用 Created。
- Compromise / Dominance 完整通道使用完整拥有者的纯色，列表 marker 使用同一拥有者颜色；闸门仍保留真实归属。
- Legend 为 A、B、Both、关系中新定义。机制卡片保持 Skin Surface。
- 旧四机制 Token 仅兼容映射。Team 仍读取的旧 `--hd-electromagnetic` 色值明确保留，Relationship 不再读取它，避免影响 Team。
- Integration 共享路径仍沿用原几何结构，重叠来源采用 A/B 条纹；未重写合图算法或通道分类。

## 人工检查记录

在 5212 预览完成十一套默认配套切换、手动 Jewel 保持、重新随皮肤、Reset、刷新恢复检查。查看九套中心配色在配套 Skin 下的图表；检查 Solid 无 radialGradient、批准的 Center On 和 Source On。

在 Amber Dawn、Delve、New Warm Paper、Midnight Contrast、Coral 五套 Skin 下查看实际关系合图的 A/B、Both 中心、妥协/支配通道和 marker。使用实际相同出生图确认 Companionship，使用另一出生图确认 Electromagnetic 两端来源。

Created 在固定 renderer 人工夹具中查看，夹具同时覆盖四种机制、Both 硬切、共有闸门与关系前景；夹具使用正式 renderer，未修改计算。临时 HTML 和临时浏览器页已移除。

简体、繁体、English 的 Picker 名称与第二行均人工打开确认。行运图正常显示；Amber Dawn BodyGraph Transit 仍为 #2D929F，Timeline Transit 仍为 #2F6870。

截图和 DOM/CSS 人工记录位于本机 outputs/TD-OHD-Center-Palette-V3（仓库外）。未发现阻断本轮预览的问题；这不是完整 Release 验收。未定义中心仍沿用原 inactive 前景，本轮没有改其 Token。完整测试与构建按要求未运行；未提交、推送、合并或部署。
