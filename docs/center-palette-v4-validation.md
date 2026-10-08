# Center Palette V4 检查记录

## 变更范围

- 石墨：内部 ID `ink` 保留，三语言名称 Graphite / 石墨 / 石墨；Light Edge `#3F3F3F`，Dark Edge `#96938E` 保持。
- Classic：指定四色更新；径向亮芯为 Edge 78% + White 22%。
- Jewel：指定九色与黑白字映射更新；启用径向亮芯 Edge 82% + White 18%。
- Botanical、Paper：指定九色更新，全部深字，保持纯色。
- Mineral：Edge、On、纯色设置均未修改。
- Chakra、Porcelain、Night Bloom 配色文件未修改。
- 定义中心的未激活闸门使用 Edge 78% + White/Black 22% 的不透明圆底。Composite、已激活闸门、未定义中心继续原规则。

## 实际 SVG 对比度

临时检查页面调用生产 `renderBodygraph()`，构造九个已定义中心及 64 个未激活闸门。通过浏览器读取 SVG circle/text 的 computed fill，按实际 sRGB 混色结果计算相对亮度与对比度。九套配色共检查 576 个数字。检查页面完成后删除，没有加入提交。

| Palette（Light） | 最低对比度 |
| --- | ---: |
| classic | 7.42:1 |
| chakra | 6.44:1 |
| jewel | 6.60:1 |
| mineral | 6.56:1 |
| ink | 12.98:1 |
| porcelain | 9.27:1 |
| botanical | 7.80:1 |
| paper | 7.30:1 |
| night-bloom | 7.32:1 |

所有结果超过 4.5:1，并达到 6:1 目标。浏览器实际接受 `color-mix()` SVG fill，无需 RGB fallback。本记录只证明当前本机浏览器的渲染。

## 人工查看

- 出生图：Delve + 石墨、High Contrast + Classic、Deep Think + Jewel、Grass Aroma + Botanical、New Warm Paper + Paper、Amber Dawn + Mineral。
- 行运：Deep Think + Jewel；检查来源激活、定义中心未激活数字与未定义中心。
- 时间轴内嵌图：Deep Think + Jewel、Amber Dusk + 石墨、Midnight Contrast + Night Bloom。
- Classic / Jewel 径向渐变生效；solid 配色没有改为渐变。未更改 radialGradient 几何参数。
- Picker 三语言名称及 registry / CSS 映射已同步；总数仍为九套。
- Relationship center ownership 分支继续独立于 Center Palette；圆底新规则显式排除 Composite。

按本轮要求未运行完整测试或 build；未 merge、未 deploy。
