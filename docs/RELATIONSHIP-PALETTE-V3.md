# Relationship Palette V3

本轮只调整 Skin 配色与 Connection 按钮、Circuit Badge 样式。计算、关系机制、Center Palette、Timeline、普通出生图和行运来源色不变。

## Relationship

| Skin | A | B | Created |
|---|---|---|---|
| Amber Dawn | #87B1AD | #D79A8E | #C3AD80 |
| High Contrast | #91B3C4 | #D8A39D | #C5B984 |
| Grass Aroma | #91BFAE | #D8A795 | #BFC18A |
| Contemplation | #A1B9C6 | #CEADB4 | #C3BDA7 |
| Absolutely | #A8BBB4 | #E0A08A | #C7B28F |
| Delve | #A9C3DF | #D6B2B5 | #C4C4C4 |
| Deep Think | #A9B7FF | #DFAEB4 | #C5C0E8 |
| New Warm Paper | #A5BCC9 | #D19A91 | #C5B38C |
| Coral | #A7B8C8 | #F0A28D | #B6C5B5 |
| Amber Dusk (不变) | #75B1A7 | #D49280 | #C5A75F |
| Midnight Contrast (不变) | #7FA7B8 | #E6B1C4 | #B9A77A |

十一套 A / B / Created / Both 前景均为 #111111。Core 沿用主色；Both 通道保留双色条纹，Both 中心保留硬边对角分割；Created 为纯色。没有新增渐变或机制颜色。

## Connection 主按钮

作用域仅 `.connection-form .btn-primary`，字重 600，原尺寸保持。

- Light：背景 Accent 45% 与 elevated 混合；文字 text；边框 Accent 55% 与 border 混合；hover 背景 Accent 55% 与 elevated 混合，文字仍为 text。
- Dark：背景 accent、文字 accent-on；边框 Accent 65% 与 border 混合；hover 使用 accent-hover、accent-on。
- 全局 Primary Button 不变，没有新增阴影。

## Circuit

| 类别 | Light 前景 / 背景 | Dark 前景 / 背景 |
|---|---|---|
| Individual | #7A2F99 / #F0E6F6 | #C28BE0 / #2A1D32 |
| Tribal | #A82E24 / #FCE4E4 | #E98075 / #2A1515 |
| Collective | #1C6695 / #E4F0FC | #6BB8E8 / #152030 |
| Integration | #18773F / #E4F6EC | #65C98A / #152A1D |

所有 Skin 沿用现有八个 Circuit Token，按明暗使用上述固定语义色。Badge 字重为 700，原 10px / 2px 6px / 3px 尺寸保持，没有透明文字、opacity 或混色模式。

Channel 的父级和子级 Badge 仍共同继承 Group class。整合通道属于 Individual，因此 Channel 中该子级标签仍使用 Individual 紫色；独立 integration class 使用绿色。分类和 renderer 未修改。

## 人工检查

十一套 Skin 逐一查看 Relationship Composite、Connection 按钮及 hover、出生图通道列表、Channel Detail、Relationship Channel List。实页确认色块减轻、来源可区分、黑色数字可读，三个 Badge 入口颜色一致。

实页样本覆盖 Compromise / Dominance 和 Both 中心；额外使用现有 BodyGraph renderer 的固定结构样本查看 A / Both / Created 中心及四类 Badge。该临时页面禁用自身入场动画以取得稳定截图，检查后已删除；生产 renderer 未改。两套 Dark Relationship Token 保持原值。

人工截图与 DOM 读数保存于本机检查输出目录，不加入仓库。按任务要求未运行完整测试或 build；未 merge、未 deploy。
