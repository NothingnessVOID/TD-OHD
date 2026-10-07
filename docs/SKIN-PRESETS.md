# Skin Presets V1 设计规格

十一套正式 Skin 中，两套默认配色保持原样，以下是九套新增配色。每套文件显式覆盖九十个 canonical Token。九中心和字体独立，不参与本轮设计。

## 来源与边界

网站基础色以用户本轮附件为最终规格，并核对 [OpenHanako v1.0.0-beta](https://github.com/liliMozi/openhanako/releases/tag/v1.0.0-beta) 的对应主题文件。核对 tag commit：`1d3ef308299e9f630786384e77de45444ea59196`。

参考路径为 `desktop/src/themes/<skin-id>.css`。本文与 CSS 是 TD-OHD 的适配规格；Human Design、Type、Circuit、Relationship 主色来自用户明确给出的适配表。没有复制参考项目的组件、品牌图形、字体、纹理或资产。

未指定的 on/text/soft、图表中性色、阴影等是本轮补齐的 TD-OHD 设计值。使用一次性颜色计算辅助确定后，最终结果写成明确 CSS；Skin 默认值不依赖统一 runtime 混色公式。可以在同一 Skin 内引用对应 surface/border，不跨分类 alias 主色。

## 共用规则

- Skin Registry 的英文名称是现有 i18n 的 source key；UI 不显示技术 ID。
- Preview 固定表示默认值，用户 override 不改变预览卡；当前选中标记由页面 Accent 控制。
- 图表背景默认 transparent；Tooltip、Detail、Legend 采用 elevated surface。
- Both 使用 A/B 的双色 CSS gradient 和现有 SVG stripe/gradient，没有第三种关系纯色。
- Relationship 四类状态独立于 Circuit，尽管某些批准数值恰巧相同，仍显式保存不同 Token。
- 每 Skin 五项 override 和全局字号沿用 v3，无新存储迁移。用户改 Transit 时延续 Foundation 的列文字明暗处理；未自定义时采用各 Skin 明确的 text 值，Restore / 切换均会移除临时文字覆盖。
- 九中心仅确认能渲染；之后另开九中心适配任务。
- 来源 on 与独立关系 on 的对比度至少 4.5:1。Delve 的批准 A/B 色对无法让单一 Both 前景同时达到 4.5:1，因此选黑色取得最好的共有前景对比度（最低约 4.48:1）；其余 Both 至少 4.5:1。不调整批准主色。

## 完整规格

以下数值与各 Skin CSS 对应。默认两套规格见 `src/styles/skins/default.css` 与 Foundation 审计。

### 素白 / High Contrast

ID：`high-contrast` · mode：`light` · CSS：`src/styles/skins/high-contrast.css`

清楚、锐利、洁净；以偏暖白和克制青蓝保留高可读性。

网站主 Palette：bg `#FAF8F7` / elevated `#FDFBFA` / sunken `#F3F1F0` / text `#1A1C1E` / accent `#3A6B85`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#FAF8F7` |
| `--bg-elevated` | `#FDFBFA` |
| `--bg-sunken` | `#F3F1F0` |
| `--text` | `#1A1C1E` |
| `--text-secondary` | `#4A4E52` |
| `--text-tertiary` | `#6B6F73` |
| `--border` | `rgba(92,75,70,0.22)` |
| `--border-subtle` | `#E5E2DF` |
| `--accent` | `#3A6B85` |
| `--accent-strong` | `#3A6B85` |
| `--accent-hover` | `#2E5870` |
| `--accent-soft` | `rgba(58,107,133,0.08)` |
| `--accent-on` | `#FFFFFF` |
| `--focus` | `#2E5870` |
| `--shadow-sm` | `0 1px 2px rgba(26,28,30,0.11)` |
| `--shadow` | `0 2px 8px rgba(26,28,30,0.11)` |
| `--shadow-lg` | `0 8px 24px rgba(26,28,30,0.11)` |
| `--modal-backdrop` | `rgba(26, 28, 30, .38)` |
| `--modal-overlay` | `rgba(26, 28, 30, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(26,28,30,0.11)` |
| `--status-error` | `#7A3030` |
| `--status-error-soft` | `#9A4746` |
| `--status-success` | `#5A9A5E` |
| `--status-success-soft` | `#E8EEE6` |
| `--status-caution-soft` | `#F3EDE3` |
| `--type-badge-bg` | `#F3ECE1` |
| `--type-badge-text` | `#5B4A25` |
| `--type-badge-border` | `#B2955C` |
| `--type-strategy-text` | `#2E5870` |
| `--site-auth-glow` | `#DAE1E5` |
| `--site-auth-shadow` | `rgba(26,28,30,0.11)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#FDFBFA` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#B9B8B7` |
| `--hd-inactive-on` | `#161A1D` |
| `--hd-undefined` | `#C7C2BC` |
| `--hd-undefined-center` | `#FDFBFA` |
| `--hd-center-stroke` | `#ACA6A0` |
| `--hd-defined-fill` | `#3A6B85` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#2E5870` |
| `--hd-timeline-panel-bg` | `#FDFBFA` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#FDFBFA` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#FDFBFA` |
| `--hd-detail-border` | `#3A6B85` |
| `--hd-legend-bg` | `#FDFBFA` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#4A4E52` |
| `--hd-planet-column-text` | `#1A1C1E` |
| `--hd-personality` | `#202428` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#B84A44` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#6D5546` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#2A8EA0` |
| `--hd-transit-on` | `#161A1D` |
| `--hd-transit-text` | `#1C6676` |
| `--hd-transit-soft` | `#E3ECED` |
| `--hd-type-generator` | `#B68A2F` |
| `--hd-type-manifesting-generator` | `#C97532` |
| `--hd-type-manifestor` | `#B84A44` |
| `--hd-type-projector` | `#3A6B85` |
| `--hd-type-reflector` | `#70777C` |
| `--hd-circuit-individual` | `#7A5A8F` |
| `--hd-circuit-individual-soft` | `#ECE7EC` |
| `--hd-circuit-tribal` | `#B84A44` |
| `--hd-circuit-tribal-soft` | `#F3E5E3` |
| `--hd-circuit-collective` | `#3A6B85` |
| `--hd-circuit-collective-soft` | `#E5E8EA` |
| `--hd-circuit-integration` | `#5A8B63` |
| `--hd-circuit-integration-soft` | `#E8ECE7` |
| `--hd-connection-a` | `#3F8C84` |
| `--hd-connection-a-on` | `#080B0D` |
| `--hd-connection-a-core` | `#73ABA5` |
| `--hd-connection-b` | `#C66E62` |
| `--hd-connection-b-on` | `#080B0D` |
| `--hd-connection-b-core` | `#D5958C` |
| `--hd-connection-bridged` | `#B99045` |
| `--hd-connection-bridged-on` | `#080B0D` |
| `--hd-connection-bridged-core` | `#CCAE77` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#080B0D` |
| `--hd-relationship-electromagnetic` | `#B37B2E` |
| `--hd-relationship-companionship` | `#5A8B63` |
| `--hd-relationship-compromise` | `#B17A45` |
| `--hd-relationship-dominance` | `#6B6F73` |

### 草香 / Grass Aroma

ID：`grass-aroma` · mode：`light` · CSS：`src/styles/skins/grass-aroma.css`

清晨植物的柔和透亮；以灰绿底和温暖来源色避免医疗后台气质。

网站主 Palette：bg `#F5F8F3` / elevated `#F9FBF7` / sunken `#EFF3EC` / text `#2E3832` / accent `#5BA88C`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#F5F8F3` |
| `--bg-elevated` | `#F9FBF7` |
| `--bg-sunken` | `#EFF3EC` |
| `--text` | `#2E3832` |
| `--text-secondary` | `#5E6B63` |
| `--text-tertiary` | `#8A9490` |
| `--border` | `rgba(91,168,140,0.22)` |
| `--border-subtle` | `#E0E6DF` |
| `--accent` | `#5BA88C` |
| `--accent-strong` | `#4D9179` |
| `--accent-hover` | `#4D9179` |
| `--accent-soft` | `rgba(91,168,140,0.08)` |
| `--accent-on` | `#10271E` |
| `--focus` | `#326B55` |
| `--shadow-sm` | `0 1px 2px rgba(46,56,50,0.09)` |
| `--shadow` | `0 2px 8px rgba(46,56,50,0.09)` |
| `--shadow-lg` | `0 8px 24px rgba(46,56,50,0.09)` |
| `--modal-backdrop` | `rgba(46, 56, 50, .38)` |
| `--modal-overlay` | `rgba(46, 56, 50, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(46,56,50,0.09)` |
| `--status-error` | `#8B4A3A` |
| `--status-error-soft` | `#A56050` |
| `--status-success` | `#7BAE7F` |
| `--status-success-soft` | `#E9F1E7` |
| `--status-caution-soft` | `#EEEFE3` |
| `--type-badge-bg` | `#EDEDE2` |
| `--type-badge-text` | `#4D4525` |
| `--type-badge-border` | `#A79C6E` |
| `--type-strategy-text` | `#326B55` |
| `--site-auth-glow` | `#DDECE4` |
| `--site-auth-shadow` | `rgba(46,56,50,0.09)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#F9FBF7` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#B5C0B8` |
| `--hd-inactive-on` | `#07110C` |
| `--hd-undefined` | `#BCC8BD` |
| `--hd-undefined-center` | `#F9FBF7` |
| `--hd-center-stroke` | `#A5B6A8` |
| `--hd-defined-fill` | `#5BA88C` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#326B55` |
| `--hd-timeline-panel-bg` | `#F9FBF7` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#F9FBF7` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#F9FBF7` |
| `--hd-detail-border` | `#5BA88C` |
| `--hd-legend-bg` | `#F9FBF7` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#5E6B63` |
| `--hd-planet-column-text` | `#2E3832` |
| `--hd-personality` | `#2E3832` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#B86758` |
| `--hd-design-on` | `#07110C` |
| `--hd-both` | `#6E5B40` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#3E939A` |
| `--hd-transit-on` | `#07110C` |
| `--hd-transit-text` | `#28686E` |
| `--hd-transit-soft` | `#E3EEEA` |
| `--hd-type-generator` | `#A98B47` |
| `--hd-type-manifesting-generator` | `#C17A45` |
| `--hd-type-manifestor` | `#B86758` |
| `--hd-type-projector` | `#5B8398` |
| `--hd-type-reflector` | `#7D8A84` |
| `--hd-circuit-individual` | `#826F91` |
| `--hd-circuit-individual-soft` | `#EAEAE9` |
| `--hd-circuit-tribal` | `#B86758` |
| `--hd-circuit-tribal-soft` | `#EFEAE4` |
| `--hd-circuit-collective` | `#5B8398` |
| `--hd-circuit-collective-soft` | `#E6ECEA` |
| `--hd-circuit-integration` | `#5BA88C` |
| `--hd-circuit-integration-soft` | `#E6F0E9` |
| `--hd-connection-a` | `#4E9B88` |
| `--hd-connection-a-on` | `#07110C` |
| `--hd-connection-a-core` | `#75B1A2` |
| `--hd-connection-b` | `#D4887A` |
| `--hd-connection-b-on` | `#07110C` |
| `--hd-connection-b-core` | `#DDA297` |
| `--hd-connection-bridged` | `#B49A56` |
| `--hd-connection-bridged-on` | `#07110C` |
| `--hd-connection-bridged-core` | `#C4B07B` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#07110C` |
| `--hd-relationship-electromagnetic` | `#A77B3D` |
| `--hd-relationship-companionship` | `#6C9A70` |
| `--hd-relationship-compromise` | `#B67B53` |
| `--hd-relationship-dominance` | `#77827C` |

### 沉思 / Contemplation

ID：`contemplation` · mode：`light` · CSS：`src/styles/skins/contemplation.css`

雨天雾灰蓝；辅助色低饱和，保持安静的冷色秩序。

网站主 Palette：bg `#F3F5F7` / elevated `#F8F9FB` / sunken `#ECEFF2` / text `#2C3238` / accent `#7E99A8`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#F3F5F7` |
| `--bg-elevated` | `#F8F9FB` |
| `--bg-sunken` | `#ECEFF2` |
| `--text` | `#2C3238` |
| `--text-secondary` | `#5A6570` |
| `--text-tertiary` | `#869098` |
| `--border` | `rgba(126,153,168,0.22)` |
| `--border-subtle` | `#DFE4E9` |
| `--accent` | `#7E99A8` |
| `--accent-strong` | `#6B8594` |
| `--accent-hover` | `#6B8594` |
| `--accent-soft` | `rgba(126,153,168,0.08)` |
| `--accent-on` | `#0D171C` |
| `--focus` | `#526F80` |
| `--shadow-sm` | `0 1px 2px rgba(44,50,56,0.09)` |
| `--shadow` | `0 2px 8px rgba(44,50,56,0.09)` |
| `--shadow-lg` | `0 8px 24px rgba(44,50,56,0.09)` |
| `--modal-backdrop` | `rgba(44, 50, 56, .38)` |
| `--modal-overlay` | `rgba(44, 50, 56, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(44,50,56,0.09)` |
| `--status-error` | `#8B4040` |
| `--status-error-soft` | `#9F5755` |
| `--status-success` | `#6FA87E` |
| `--status-success-soft` | `#E7EEEC` |
| `--status-caution-soft` | `#ECECEA` |
| `--type-badge-bg` | `#ECECE9` |
| `--type-badge-text` | `#504D38` |
| `--type-badge-border` | `#A6A083` |
| `--type-strategy-text` | `#526F80` |
| `--site-auth-glow` | `#E2E8EC` |
| `--site-auth-shadow` | `rgba(44,50,56,0.09)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#F8F9FB` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#BAC3C9` |
| `--hd-inactive-on` | `#0D171C` |
| `--hd-undefined` | `#BAC5CE` |
| `--hd-undefined-center` | `#F8F9FB` |
| `--hd-center-stroke` | `#A4B2BE` |
| `--hd-defined-fill` | `#7E99A8` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#526F80` |
| `--hd-timeline-panel-bg` | `#F8F9FB` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#F8F9FB` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#F8F9FB` |
| `--hd-detail-border` | `#7E99A8` |
| `--hd-legend-bg` | `#F8F9FB` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#5A6570` |
| `--hd-planet-column-text` | `#2C3238` |
| `--hd-personality` | `#2C3238` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#A85F5B` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#665867` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#4D91A6` |
| `--hd-transit-on` | `#0D171C` |
| `--hd-transit-text` | `#326878` |
| `--hd-transit-soft` | `#E4ECF0` |
| `--hd-type-generator` | `#A8945C` |
| `--hd-type-manifesting-generator` | `#B77956` |
| `--hd-type-manifestor` | `#A85F5B` |
| `--hd-type-projector` | `#65889B` |
| `--hd-type-reflector` | `#7F898F` |
| `--hd-circuit-individual` | `#7B6B8F` |
| `--hd-circuit-individual-soft` | `#E8E9EE` |
| `--hd-circuit-tribal` | `#A85F5B` |
| `--hd-circuit-tribal-soft` | `#ECE8E9` |
| `--hd-circuit-collective` | `#6B8C9E` |
| `--hd-circuit-collective-soft` | `#E7ECEF` |
| `--hd-circuit-integration` | `#6FA87E` |
| `--hd-circuit-integration-soft` | `#E7EEEC` |
| `--hd-connection-a` | `#5F918F` |
| `--hd-connection-a-on` | `#0D171C` |
| `--hd-connection-a-core` | `#7FA7A5` |
| `--hd-connection-b` | `#C4827C` |
| `--hd-connection-b-on` | `#0D171C` |
| `--hd-connection-b-core` | `#D09B96` |
| `--hd-connection-bridged` | `#A79262` |
| `--hd-connection-bridged-on` | `#0D171C` |
| `--hd-connection-bridged-core` | `#B9A881` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#0D171C` |
| `--hd-relationship-electromagnetic` | `#9D7748` |
| `--hd-relationship-companionship` | `#6F9B80` |
| `--hd-relationship-compromise` | `#A87861` |
| `--hd-relationship-dominance` | `#7D878E` |

### Absolutely / Absolutely

ID：`absolutely` · mode：`light` · CSS：`src/styles/skins/absolutely.css`

暖奶油、赤陶、温暖墨黑；有人文编辑感，不增加复古装饰。

网站主 Palette：bg `#F4F3EE` / elevated `#FAF9F5` / sunken `#EDEAE2` / text `#2D2B28` / accent `#B5846E`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#F4F3EE` |
| `--bg-elevated` | `#FAF9F5` |
| `--bg-sunken` | `#EDEAE2` |
| `--text` | `#2D2B28` |
| `--text-secondary` | `#6B6864` |
| `--text-tertiary` | `#9B9793` |
| `--border` | `rgba(177,173,161,0.28)` |
| `--border-subtle` | `#E4E0D8` |
| `--accent` | `#B5846E` |
| `--accent-strong` | `#A27460` |
| `--accent-hover` | `#A27460` |
| `--accent-soft` | `rgba(181,132,110,0.08)` |
| `--accent-on` | `#241B17` |
| `--focus` | `#855541` |
| `--shadow-sm` | `0 1px 2px rgba(45,43,40,0.07)` |
| `--shadow` | `0 2px 8px rgba(45,43,40,0.07)` |
| `--shadow-lg` | `0 8px 24px rgba(45,43,40,0.07)` |
| `--modal-backdrop` | `rgba(45, 43, 40, .38)` |
| `--modal-overlay` | `rgba(45, 43, 40, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(45,43,40,0.07)` |
| `--status-error` | `#8B3A3A` |
| `--status-error-soft` | `#9F5852` |
| `--status-success` | `#7BAE7F` |
| `--status-success-soft` | `#E7EBE2` |
| `--status-caution-soft` | `#EDE8DD` |
| `--type-badge-bg` | `#EDE8DC` |
| `--type-badge-text` | `#614B2D` |
| `--type-badge-border` | `#B09669` |
| `--type-strategy-text` | `#855541` |
| `--site-auth-glow` | `#EEE4DD` |
| `--site-auth-shadow` | `rgba(45,43,40,0.07)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#FAF9F5` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#BDB8B0` |
| `--hd-inactive-on` | `#241B17` |
| `--hd-undefined` | `#C6BEB1` |
| `--hd-undefined-center` | `#FAF9F5` |
| `--hd-center-stroke` | `#AFA696` |
| `--hd-defined-fill` | `#B5846E` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#855541` |
| `--hd-timeline-panel-bg` | `#FAF9F5` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#FAF9F5` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#FAF9F5` |
| `--hd-detail-border` | `#B5846E` |
| `--hd-legend-bg` | `#FAF9F5` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#6B6864` |
| `--hd-planet-column-text` | `#2D2B28` |
| `--hd-personality` | `#2D2B28` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#A95D46` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#725646` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#477C88` |
| `--hd-transit-on` | `#FFFFFF` |
| `--hd-transit-text` | `#355E68` |
| `--hd-transit-soft` | `#E1E6E3` |
| `--hd-type-generator` | `#B18B4B` |
| `--hd-type-manifesting-generator` | `#BC7447` |
| `--hd-type-manifestor` | `#A95D46` |
| `--hd-type-projector` | `#52788B` |
| `--hd-type-reflector` | `#817D76` |
| `--hd-circuit-individual` | `#786578` |
| `--hd-circuit-individual-soft` | `#E6E3E1` |
| `--hd-circuit-tribal` | `#A95D46` |
| `--hd-circuit-tribal-soft` | `#ECE2DC` |
| `--hd-circuit-collective` | `#5D7E8E` |
| `--hd-circuit-collective-soft` | `#E3E6E3` |
| `--hd-circuit-integration` | `#6F8A69` |
| `--hd-circuit-integration-soft` | `#E5E7DF` |
| `--hd-connection-a` | `#5E8D83` |
| `--hd-connection-a-on` | `#0E0A08` |
| `--hd-connection-a-core` | `#85A8A1` |
| `--hd-connection-b` | `#C47F68` |
| `--hd-connection-b-on` | `#0E0A08` |
| `--hd-connection-b-core` | `#D29E8C` |
| `--hd-connection-bridged` | `#B09255` |
| `--hd-connection-bridged-on` | `#0E0A08` |
| `--hd-connection-bridged-core` | `#C3AC7E` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#0E0A08` |
| `--hd-relationship-electromagnetic` | `#B5846E` |
| `--hd-relationship-companionship` | `#758E6E` |
| `--hd-relationship-compromise` | `#B37457` |
| `--hd-relationship-dominance` | `#7A7671` |

### 随时准备接住你 / Delve

ID：`delve` · mode：`light` · CSS：`src/styles/skins/delve.css`

黑白灰的极简数字界面；图表语义仍独立，但色彩克制。

网站主 Palette：bg `#FFFFFF` / elevated `#F7F7F8` / sunken `#F0F0F0` / text `#1A1A1A` / accent `#1A1A1A`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#FFFFFF` |
| `--bg-elevated` | `#F7F7F8` |
| `--bg-sunken` | `#F0F0F0` |
| `--text` | `#1A1A1A` |
| `--text-secondary` | `#6E6E6E` |
| `--text-tertiary` | `#999999` |
| `--border` | `rgba(0,0,0,0.10)` |
| `--border-subtle` | `#DFDFE0` |
| `--accent` | `#1A1A1A` |
| `--accent-strong` | `#1A1A1A` |
| `--accent-hover` | `#000000` |
| `--accent-soft` | `rgba(0,0,0,0.05)` |
| `--accent-on` | `#FFFFFF` |
| `--focus` | `#1A1A1A` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.06)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.06)` |
| `--modal-backdrop` | `rgba(26, 26, 26, .38)` |
| `--modal-overlay` | `rgba(26, 26, 26, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(0,0,0,0.06)` |
| `--status-error` | `#8B3A3A` |
| `--status-error-soft` | `#A64E4C` |
| `--status-success` | `#5CB85C` |
| `--status-success-soft` | `#F3FAF3` |
| `--status-caution-soft` | `#F8F6F1` |
| `--type-badge-bg` | `#F8F5F0` |
| `--type-badge-text` | `#4C3E24` |
| `--type-badge-border` | `#A08C67` |
| `--type-strategy-text` | `#1A1A1A` |
| `--site-auth-glow` | `#CFCFD0` |
| `--site-auth-shadow` | `rgba(0,0,0,0.06)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#F7F7F8` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#C6C6C6` |
| `--hd-inactive-on` | `#111111` |
| `--hd-undefined` | `#BDBDBD` |
| `--hd-undefined-center` | `#F7F7F8` |
| `--hd-center-stroke` | `#A7A7A7` |
| `--hd-defined-fill` | `#1A1A1A` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#1A1A1A` |
| `--hd-timeline-panel-bg` | `#F7F7F8` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#F7F7F8` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#F7F7F8` |
| `--hd-detail-border` | `#1A1A1A` |
| `--hd-legend-bg` | `#F7F7F8` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#6E6E6E` |
| `--hd-planet-column-text` | `#1A1A1A` |
| `--hd-personality` | `#1A1A1A` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#A64B46` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#5B4B40` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#2F7F9D` |
| `--hd-transit-on` | `#FFFFFF` |
| `--hd-transit-text` | `#236276` |
| `--hd-transit-soft` | `#EFF5F8` |
| `--hd-type-generator` | `#9B7A3D` |
| `--hd-type-manifesting-generator` | `#A9673F` |
| `--hd-type-manifestor` | `#A64B46` |
| `--hd-type-projector` | `#486C85` |
| `--hd-type-reflector` | `#777777` |
| `--hd-circuit-individual` | `#6F617B` |
| `--hd-circuit-individual-soft` | `#F4F3F5` |
| `--hd-circuit-tribal` | `#A64B46` |
| `--hd-circuit-tribal-soft` | `#F8F2F1` |
| `--hd-circuit-collective` | `#486C85` |
| `--hd-circuit-collective-soft` | `#F1F4F6` |
| `--hd-circuit-integration` | `#557C60` |
| `--hd-circuit-integration-soft` | `#F2F5F3` |
| `--hd-connection-a` | `#4A7D75` |
| `--hd-connection-a-on` | `#FFFFFF` |
| `--hd-connection-a-core` | `#6B948E` |
| `--hd-connection-b` | `#B7665C` |
| `--hd-connection-b-on` | `#030303` |
| `--hd-connection-b-core` | `#C48279` |
| `--hd-connection-bridged` | `#9F8143` |
| `--hd-connection-bridged-on` | `#030303` |
| `--hd-connection-bridged-core` | `#B09865` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#9A6A3A` |
| `--hd-relationship-companionship` | `#557C60` |
| `--hd-relationship-compromise` | `#9B6A4D` |
| `--hd-relationship-dominance` | `#777777` |

### 用户彻底怒了 / Deep Think

ID：`deep-think` · mode：`light` · CSS：`src/styles/skins/deep-think.css`

冷静、现代的数字界面；蓝紫只作为点睛，不增加渐变背景或发光。

网站主 Palette：bg `#FCFCFD` / elevated `#F8F8FA` / sunken `#F0F0F2` / text `#1D1D1F` / accent `#636AE8`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#FCFCFD` |
| `--bg-elevated` | `#F8F8FA` |
| `--bg-sunken` | `#F0F0F2` |
| `--text` | `#1D1D1F` |
| `--text-secondary` | `#65656B` |
| `--text-tertiary` | `#95959C` |
| `--border` | `rgba(0,0,0,0.09)` |
| `--border-subtle` | `#DFE0E5` |
| `--accent` | `#636AE8` |
| `--accent-strong` | `#5158D4` |
| `--accent-hover` | `#5158D4` |
| `--accent-soft` | `rgba(99,106,232,0.06)` |
| `--accent-on` | `#FFFFFF` |
| `--focus` | `#5158D4` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.05)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.05)` |
| `--modal-backdrop` | `rgba(29, 29, 31, .38)` |
| `--modal-overlay` | `rgba(29, 29, 31, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--status-error` | `#8B3A3A` |
| `--status-error-soft` | `#A64E4C` |
| `--status-success` | `#34A853` |
| `--status-success-soft` | `#ECF5EF` |
| `--status-caution-soft` | `#F7F5EF` |
| `--type-badge-bg` | `#F7F4EE` |
| `--type-badge-text` | `#554522` |
| `--type-badge-border` | `#B5A071` |
| `--type-strategy-text` | `#5158D4` |
| `--site-auth-glow` | `#DDDEF7` |
| `--site-auth-shadow` | `rgba(0,0,0,0.05)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#F8F8FA` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#C2C4CC` |
| `--hd-inactive-on` | `#040509` |
| `--hd-undefined` | `#B9BBC6` |
| `--hd-undefined-center` | `#F8F8FA` |
| `--hd-center-stroke` | `#A5A8B5` |
| `--hd-defined-fill` | `#636AE8` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#5158D4` |
| `--hd-timeline-panel-bg` | `#F8F8FA` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#F8F8FA` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#F8F8FA` |
| `--hd-detail-border` | `#636AE8` |
| `--hd-legend-bg` | `#F8F8FA` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#65656B` |
| `--hd-planet-column-text` | `#1D1D1F` |
| `--hd-personality` | `#25262B` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#C35558` |
| `--hd-design-on` | `#040509` |
| `--hd-both` | `#6B5A77` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#2FA7C0` |
| `--hd-transit-on` | `#040509` |
| `--hd-transit-text` | `#237387` |
| `--hd-transit-soft` | `#ECF5F8` |
| `--hd-type-generator` | `#C09A43` |
| `--hd-type-manifesting-generator` | `#C9783C` |
| `--hd-type-manifestor` | `#C35558` |
| `--hd-type-projector` | `#596FC8` |
| `--hd-type-reflector` | `#7E8491` |
| `--hd-circuit-individual` | `#7B62C8` |
| `--hd-circuit-individual-soft` | `#F2F0F9` |
| `--hd-circuit-tribal` | `#C35558` |
| `--hd-circuit-tribal-soft` | `#F7EFF0` |
| `--hd-circuit-collective` | `#4D78C5` |
| `--hd-circuit-collective-soft` | `#EEF1F9` |
| `--hd-circuit-integration` | `#4C9A72` |
| `--hd-circuit-integration-soft` | `#EEF4F2` |
| `--hd-connection-a` | `#429B93` |
| `--hd-connection-a-on` | `#040509` |
| `--hd-connection-a-core` | `#71B4AE` |
| `--hd-connection-b` | `#D9746C` |
| `--hd-connection-b-on` | `#040509` |
| `--hd-connection-b-core` | `#E29791` |
| `--hd-connection-bridged` | `#C2A14D` |
| `--hd-connection-bridged-on` | `#040509` |
| `--hd-connection-bridged-core` | `#D1B87A` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#040509` |
| `--hd-relationship-electromagnetic` | `#636AE8` |
| `--hd-relationship-companionship` | `#4C9A72` |
| `--hd-relationship-compromise` | `#B77A4F` |
| `--hd-relationship-dominance` | `#7C8190` |

### 新暖纸 / New Warm Paper

ID：`new-warm-paper` · mode：`light` · CSS：`src/styles/skins/new-warm-paper.css`

宣纸、墨色、青灰蓝、朱红；细线和弱阴影形成纸本感觉。

网站主 Palette：bg `#F5EFE4` / elevated `#FBF7EE` / sunken `#EFE8DB` / text `#2A2622` / accent `#537D96`

特殊规则：controls 2px、cards 3px、指定大表面 6px、指定边框 .5px；阴影使用 0.04 alpha。无纹理、无字体变化。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#F5EFE4` |
| `--bg-elevated` | `#FBF7EE` |
| `--bg-sunken` | `#EFE8DB` |
| `--text` | `#2A2622` |
| `--text-secondary` | `#4A433C` |
| `--text-tertiary` | `#6B6158` |
| `--border` | `#D8CFBE` |
| `--border-subtle` | `#E2DBCF` |
| `--accent` | `#537D96` |
| `--accent-strong` | `#3F6179` |
| `--accent-hover` | `#3F6179` |
| `--accent-soft` | `rgba(83,125,150,0.08)` |
| `--accent-on` | `#FFFFFF` |
| `--focus` | `#3F6179` |
| `--shadow-sm` | `0 1px 2px rgba(42,38,34,0.04)` |
| `--shadow` | `0 2px 8px rgba(42,38,34,0.04)` |
| `--shadow-lg` | `0 8px 24px rgba(42,38,34,0.04)` |
| `--modal-backdrop` | `rgba(42, 38, 34, .38)` |
| `--modal-overlay` | `rgba(42, 38, 34, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(42,38,34,0.04)` |
| `--status-error` | `#8B2C1F` |
| `--status-error-soft` | `#8B2C1F` |
| `--status-success` | `#4A6B4A` |
| `--status-success-soft` | `#E3E1D4` |
| `--status-caution-soft` | `#EDE4D3` |
| `--type-badge-bg` | `#ECE4D3` |
| `--type-badge-text` | `#4A3C20` |
| `--type-badge-border` | `#A48D5E` |
| `--type-strategy-text` | `#3F6179` |
| `--site-auth-glow` | `#DDE1DE` |
| `--site-auth-shadow` | `rgba(42,38,34,0.04)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#FBF7EE` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#B7AD9F` |
| `--hd-inactive-on` | `#080605` |
| `--hd-undefined` | `#BDB19E` |
| `--hd-undefined-center` | `#FBF7EE` |
| `--hd-center-stroke` | `#A99B86` |
| `--hd-defined-fill` | `#537D96` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#3F6179` |
| `--hd-timeline-panel-bg` | `#FBF7EE` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#FBF7EE` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#FBF7EE` |
| `--hd-detail-border` | `#537D96` |
| `--hd-legend-bg` | `#FBF7EE` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#4A433C` |
| `--hd-planet-column-text` | `#2A2622` |
| `--hd-personality` | `#2A2622` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#8B2C1F` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#6A4B36` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#4F8991` |
| `--hd-transit-on` | `#080605` |
| `--hd-transit-text` | `#355F66` |
| `--hd-transit-soft` | `#E4E4DB` |
| `--hd-type-generator` | `#A18444` |
| `--hd-type-manifesting-generator` | `#A85F35` |
| `--hd-type-manifestor` | `#8B2C1F` |
| `--hd-type-projector` | `#537D96` |
| `--hd-type-reflector` | `#726A61` |
| `--hd-circuit-individual` | `#75637E` |
| `--hd-circuit-individual-soft` | `#E8E0D9` |
| `--hd-circuit-tribal` | `#8B2C1F` |
| `--hd-circuit-tribal-soft` | `#EADBCF` |
| `--hd-circuit-collective` | `#537D96` |
| `--hd-circuit-collective-soft` | `#E4E3DC` |
| `--hd-circuit-integration` | `#4A6B4A` |
| `--hd-circuit-integration-soft` | `#E3E1D4` |
| `--hd-connection-a` | `#507D72` |
| `--hd-connection-a-on` | `#FFFFFF` |
| `--hd-connection-a-core` | `#6E938A` |
| `--hd-connection-b` | `#B75E4C` |
| `--hd-connection-b-on` | `#080605` |
| `--hd-connection-b-core` | `#C3796A` |
| `--hd-connection-bridged` | `#A78945` |
| `--hd-connection-bridged-on` | `#080605` |
| `--hd-connection-bridged-core` | `#B69D65` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#9B6B32` |
| `--hd-relationship-companionship` | `#4A6B4A` |
| `--hd-relationship-compromise` | `#9A6846` |
| `--hd-relationship-dominance` | `#6B6158` |
| `--radius` | `2px` |
| `--radius-lg` | `3px` |
| `--skin-large-radius` | `6px` |
| `--skin-border-width` | `.5px` |

### 青夜·高对比 / Midnight Contrast

ID：`midnight-contrast` · mode：`dark` · CSS：`src/styles/skins/midnight-contrast.css`

深青夜与暖玫瑰；文字层级清晰，背景保持青色而不退成黑色。

网站主 Palette：bg `#26343D` / elevated `#30414B` / sunken `#202C34` / text `#F0F6FA` / accent `#E6B1C4`

特殊规则：所有 on/text 值按深青背景单独确定，保持深青 panel 与浅色前景；不要用 light Skin 的前景假设。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#26343D` |
| `--bg-elevated` | `#30414B` |
| `--bg-sunken` | `#202C34` |
| `--text` | `#F0F6FA` |
| `--text-secondary` | `#D3E0E8` |
| `--text-tertiary` | `#B7C8D3` |
| `--border` | `rgba(230,177,196,0.26)` |
| `--border-subtle` | `#465863` |
| `--accent` | `#E6B1C4` |
| `--accent-strong` | `#E6B1C4` |
| `--accent-hover` | `#F0C4D3` |
| `--accent-soft` | `rgba(230,177,196,0.14)` |
| `--accent-on` | `#202C34` |
| `--focus` | `#E6B1C4` |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.44)` |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.44)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.44)` |
| `--modal-backdrop` | `rgba(9, 20, 28, .68)` |
| `--modal-overlay` | `rgba(9, 20, 28, .58)` |
| `--lens-active-shadow` | `0 1px 2px rgba(0,0,0,0.44)` |
| `--status-error` | `#E28B8B` |
| `--status-error-soft` | `#E79D97` |
| `--status-success` | `#A8DDAA` |
| `--status-success-soft` | `#3F5452` |
| `--status-caution-soft` | `#494F45` |
| `--type-badge-bg` | `#494F46` |
| `--type-badge-text` | `#F0F6FA` |
| `--type-badge-border` | `#BBB183` |
| `--type-strategy-text` | `#E6B1C4` |
| `--site-auth-glow` | `#515561` |
| `--site-auth-shadow` | `rgba(0,0,0,0.44)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#202C34` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#71828D` |
| `--hd-inactive-on` | `#080F14` |
| `--hd-undefined` | `#647987` |
| `--hd-undefined-center` | `#202C34` |
| `--hd-center-stroke` | `#839AA8` |
| `--hd-defined-fill` | `#E6B1C4` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#E6B1C4` |
| `--hd-timeline-panel-bg` | `#30414B` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#30414B` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#30414B` |
| `--hd-detail-border` | `#E6B1C4` |
| `--hd-legend-bg` | `#30414B` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#D3E0E8` |
| `--hd-planet-column-text` | `#F0F6FA` |
| `--hd-personality` | `#F0F6FA` |
| `--hd-personality-on` | `#080F14` |
| `--hd-design` | `#F08A78` |
| `--hd-design-on` | `#080F14` |
| `--hd-both` | `#C89BB0` |
| `--hd-both-on` | `#080F14` |
| `--hd-transit` | `#62D8E8` |
| `--hd-transit-on` | `#080F14` |
| `--hd-transit-text` | `#62D8E8` |
| `--hd-transit-soft` | `#31535D` |
| `--hd-type-generator` | `#E0C06B` |
| `--hd-type-manifesting-generator` | `#E6A05E` |
| `--hd-type-manifestor` | `#F08A78` |
| `--hd-type-projector` | `#78B6E1` |
| `--hd-type-reflector` | `#AAB8C0` |
| `--hd-circuit-individual` | `#C6A1E5` |
| `--hd-circuit-individual-soft` | `#44495D` |
| `--hd-circuit-tribal` | `#F08A78` |
| `--hd-circuit-tribal-soft` | `#4C4448` |
| `--hd-circuit-collective` | `#78B6E1` |
| `--hd-circuit-collective-soft` | `#364D5C` |
| `--hd-circuit-integration` | `#8FD0A0` |
| `--hd-circuit-integration-soft` | `#3A5250` |
| `--hd-connection-a` | `#66C7BA` |
| `--hd-connection-a-on` | `#080F14` |
| `--hd-connection-a-core` | `#7ACEC3` |
| `--hd-connection-b` | `#F1A087` |
| `--hd-connection-b-on` | `#080F14` |
| `--hd-connection-b-core` | `#F3AC97` |
| `--hd-connection-bridged` | `#DFC267` |
| `--hd-connection-bridged-on` | `#080F14` |
| `--hd-connection-bridged-core` | `#E3CA7B` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#080F14` |
| `--hd-relationship-electromagnetic` | `#E6B1C4` |
| `--hd-relationship-companionship` | `#8FD0A0` |
| `--hd-relationship-compromise` | `#E7A86F` |
| `--hd-relationship-dominance` | `#B7C8D3` |

### 珊瑚 / Coral

ID：`coral` · mode：`light` · CSS：`src/styles/skins/coral.css`

和纸暖白、墨蓝、珊瑚朱与灰青；活泼而克制。

网站主 Palette：bg `#FDF6EC` / elevated `#FFFBF3` / sunken `#FCF1E4` / text `#1A3049` / accent `#1A3049`

特殊规则：保留现有基础几何；不增加专属字体或装饰资产。

未来九中心适配：Classic/Chakra 原配色保持独立，本轮不评估协调性、不修改 edge/core。

| Token | 值 |
|---|---|
| `--bg` | `#FDF6EC` |
| `--bg-elevated` | `#FFFBF3` |
| `--bg-sunken` | `#FCF1E4` |
| `--text` | `#1A3049` |
| `--text-secondary` | `#314153` |
| `--text-tertiary` | `#727F89` |
| `--border` | `rgba(243,126,99,0.18)` |
| `--border-subtle` | `#E9E0D5` |
| `--accent` | `#1A3049` |
| `--accent-strong` | `#1A3049` |
| `--accent-hover` | `#243A55` |
| `--accent-soft` | `rgba(26,48,73,0.07)` |
| `--accent-on` | `#FFFFFF` |
| `--focus` | `#1A3049` |
| `--shadow-sm` | `0 1px 2px rgba(26,48,73,0.08)` |
| `--shadow` | `0 2px 8px rgba(26,48,73,0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(26,48,73,0.08)` |
| `--modal-backdrop` | `rgba(26, 48, 73, .38)` |
| `--modal-overlay` | `rgba(26, 48, 73, .30)` |
| `--lens-active-shadow` | `0 1px 2px rgba(26,48,73,0.08)` |
| `--status-error` | `#A3483B` |
| `--status-error-soft` | `#BF5B49` |
| `--status-success` | `#6E8C7A` |
| `--status-success-soft` | `#EFECE1` |
| `--status-caution-soft` | `#F7EDDD` |
| `--type-badge-bg` | `#F6ECDC` |
| `--type-badge-text` | `#50442A` |
| `--type-badge-border` | `#B59562` |
| `--type-strategy-text` | `#1A3049` |
| `--site-auth-glow` | `#D6D6D4` |
| `--site-auth-shadow` | `rgba(26,48,73,0.08)` |
| `--hd-graph-bg` | `transparent` |
| `--hd-graph-panel-bg` | `#FFFBF3` |
| `--hd-graph-panel-border` | `var(--border-subtle)` |
| `--hd-inactive` | `#C6BBB0` |
| `--hd-inactive-on` | `#060E16` |
| `--hd-undefined` | `#C7B8A8` |
| `--hd-undefined-center` | `#FFFBF3` |
| `--hd-center-stroke` | `#B7A28E` |
| `--hd-defined-fill` | `#1A3049` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#1A3049` |
| `--hd-timeline-panel-bg` | `#FFFBF3` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#FFFBF3` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#FFFBF3` |
| `--hd-detail-border` | `#1A3049` |
| `--hd-legend-bg` | `#FFFBF3` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#314153` |
| `--hd-planet-column-text` | `#1A3049` |
| `--hd-personality` | `#1A3049` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#D95F4C` |
| `--hd-design-on` | `#060E16` |
| `--hd-both` | `#8C5B4A` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#4B8E9B` |
| `--hd-transit-on` | `#060E16` |
| `--hd-transit-text` | `#326A74` |
| `--hd-transit-soft` | `#ECECE4` |
| `--hd-type-generator` | `#B38C44` |
| `--hd-type-manifesting-generator` | `#D17A43` |
| `--hd-type-manifestor` | `#D95F4C` |
| `--hd-type-projector` | `#315F85` |
| `--hd-type-reflector` | `#7A8790` |
| `--hd-circuit-individual` | `#775D83` |
| `--hd-circuit-individual-soft` | `#F0E7E2` |
| `--hd-circuit-tribal` | `#D95F4C` |
| `--hd-circuit-tribal-soft` | `#FAE8DD` |
| `--hd-circuit-collective` | `#315F85` |
| `--hd-circuit-collective-soft` | `#EAE8E2` |
| `--hd-circuit-integration` | `#6E8C7A` |
| `--hd-circuit-integration-soft` | `#EFECE1` |
| `--hd-connection-a` | `#4C8C83` |
| `--hd-connection-a-on` | `#060E16` |
| `--hd-connection-a-core` | `#77A8A1` |
| `--hd-connection-b` | `#F37E63` |
| `--hd-connection-b-on` | `#060E16` |
| `--hd-connection-b-core` | `#F69D88` |
| `--hd-connection-bridged` | `#B9944D` |
| `--hd-connection-bridged-on` | `#060E16` |
| `--hd-connection-bridged-core` | `#CAAE78` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#060E16` |
| `--hd-relationship-electromagnetic` | `#C97C4A` |
| `--hd-relationship-companionship` | `#6E8C7A` |
| `--hd-relationship-compromise` | `#C97B56` |
| `--hd-relationship-dominance` | `#727F89` |

