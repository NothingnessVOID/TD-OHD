# Skin Presets V3 设计规格

十一套正式 Skin 中，两套默认主色保持原样，新增 Overlay Natal / On；默认暗色的 Design On 按本轮可读性要求修正。以下是九套新增配色。每套文件显式覆盖九十二个 canonical Token。九中心和字体独立，不参与本轮设计。

## 色彩层级（Color hierarchy）

1. Transit / Signal：时间轴主条、行运激活与重点信息；视觉焦点不等于必须有最高饱和度。
2. Personality / Design / Both / Relationship ownership：清楚区分身份，降低彩度。
3. Type / Circuit / Relationship mechanics：辅助识别，避免彩虹噪声。
4. Inactive / Undefined / structural UI：中性结构退后。

Timeline 的 `--tl-transit` 直接读取 `--hd-transit`，不再使用固定 `#445457` 混色。`--tl-transit-ink` 使用批准的 `--hd-transit-on`；`--tl-birth` 使用独立的 `--hd-overlay-natal`，出生定义保持中性，游标保持 UI Accent，弱日期背景 tint 保留。

七套网站基础 Palette 保持 V1；Absolutely 与 Deep Think 仅更新 Accent bundle 和相应交互语义。默认两套主色、Center Palette、字体、Picker 布局、Storage V3 不变。

## 来源与边界

网站基础色继承 V1（Absolutely / Deep Think 的 Accent bundle 依 V2 更新）。V1 当时核对了 [OpenHanako v1.0.0-beta](https://github.com/liliMozi/openhanako/releases/tag/v1.0.0-beta) 的对应主题文件。核对 tag commit：`1d3ef308299e9f630786384e77de45444ea59196`。

参考路径为 `desktop/src/themes/<skin-id>.css`。本文与 CSS 是 TD-OHD 的适配规格；Human Design 来源色以本轮 Skin Palette V3 附件为最终规格；Type、Circuit、Relationship 延续 V2，不在本轮改色。没有复制参考项目的组件、品牌图形、字体、纹理或资产。

未指定的 on/text/soft、图表中性色、阴影等是本轮补齐的 TD-OHD 设计值。使用一次性颜色计算辅助确定后，最终结果写成明确 CSS；Skin 默认值不依赖统一 runtime 混色公式。可以在同一 Skin 内引用对应 surface/border，不跨分类 alias 主色。

## 共用规则

- Skin Registry 的英文名称是现有 i18n 的 source key；UI 不显示技术 ID。
- Preview 固定表示默认值，用户 override 不改变预览卡；当前选中标记由页面 Accent 控制。
- 图表背景默认 transparent；Tooltip、Detail、Legend 采用 elevated surface。
- Both 使用 A/B 的双色 CSS gradient 和现有 SVG stripe/gradient，没有第三种关系纯色。
- Relationship 四类状态独立于 Circuit，尽管某些批准数值恰巧相同，仍显式保存不同 Token。
- 每 Skin 五项 override 和全局字号沿用 v3，无新存储迁移。用户改 Transit 时延续 Foundation 的列文字明暗处理；未自定义时采用各 Skin 明确的 text 值，Restore / 切换均会移除临时文字覆盖。
- 九中心仅确认能渲染；之后另开九中心适配任务。
- 主色与明确指定的 Transit on/text/soft、Overlay Natal / On 采用 V3 批准值。没有指定的新 Transit soft 以 9% 主色浅背景固化；其余来源 On 以可读性选定。所有 Personality / Design / Transit / Overlay Natal On 均至少 4.5:1。Circuit soft 是每套 6–12% 的浅 surface tint；Relationship core 使用每套不同的中性高光与强度，最终均写为明确值。

## 每 Skin 的行运来源策略

Registry 的 `transitSourceMode` 为 `split` 或 `unified-natal`，它是展示配置，不计入颜色 Token，不进入计算模型或 Storage V3。

- 普通出生图永远使用 Personality / Design / P-D stripe。
- `split` 行运图保留 Personality / Design，Transit 使用原有 ring / hatch。
- `unified-natal` 行运图将所有 natal gate、半通道、Integration span 和出生行星列统一使用 Overlay Natal；共有激活保留 Transit ring / hatch，去除 P-D stripe。
- Transit-only 不读取出生来源颜色；两个出生行星栏目保留结构，在该模式隐藏。
- Timeline Tracks / 四项来源 Legend 一律使用 Overlay Natal vs Transit；split BodyGraph 仍显示三来源。
- Appearance 切换沿用现有刷新，出生图 / 关系图不被行运展示策略重着色。临时 Line Fixing 标记继续使用 Transit Text，tooltip 文案不变。

| Skin | Overlay Natal | On | transitSourceMode |
|---|---|---|---|
| `default-light` | `#6B6560` | `#FFFFFF` | `split` |
| `default-dark` | `#9E978E` | `#16130F` | `split` |
| `high-contrast` | `#74716D` | `#FFFFFF` | `split` |
| `grass-aroma` | `#748079` | `#07110C` | `split` |
| `contemplation` | `#7B7E83` | `#000000` | `split` |
| `absolutely` | `#6F6A65` | `#FFFFFF` | `split` |
| `delve` | `#6F6F6F` | `#FFFFFF` | `unified-natal` |
| `deep-think` | `#747B8A` | `#000000` | `split` |
| `new-warm-paper` | `#756B60` | `#FFFFFF` | `split` |
| `midnight-contrast` | `#A7BAC5` | `#0B1318` | `split` |
| `coral` | `#6A7680` | `#FFFFFF` | `split` |

默认暗色原有 Design 主色不变，Design On 调整为 `#16130F`，避免原有白字低于普通小字对比度。九中心仍独立。

## 完整规格

以下数值与各 Skin CSS 对应。默认两套规格见 `src/styles/skins/default.css` 与 Foundation 审计。

### 素白 / High Contrast

ID：`high-contrast` · mode：`light` · CSS：`src/styles/skins/high-contrast.css`

墨灰、砖红、钢蓝 Transit，保留清楚的三来源区分。

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
| `--hd-inactive` | `#C8C5C2` |
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
| `--hd-both` | `#756454` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#3A6B85` |
| `--hd-transit-on` | `#FFFFFF` |
| `--hd-transit-text` | `#2E5870` |
| `--hd-overlay-natal` | `#74716D` |
| `--hd-overlay-natal-on` | `#FFFFFF` |
| `--hd-transit-soft` | `#E9EBED` |
| `--hd-type-generator` | `#9A7A35` |
| `--hd-type-manifesting-generator` | `#A56C3C` |
| `--hd-type-manifestor` | `#9E544E` |
| `--hd-type-projector` | `#5C7180` |
| `--hd-type-reflector` | `#757A7D` |
| `--hd-circuit-individual` | `#6E6178` |
| `--hd-circuit-individual-soft` | `#EFECED` |
| `--hd-circuit-tribal` | `#8D5A55` |
| `--hd-circuit-tribal-soft` | `#F1EBEA` |
| `--hd-circuit-collective` | `#60747F` |
| `--hd-circuit-collective-soft` | `#EEEDED` |
| `--hd-circuit-integration` | `#687D69` |
| `--hd-circuit-integration-soft` | `#EEEEEC` |
| `--hd-connection-a` | `#56807A` |
| `--hd-connection-a-on` | `#000000` |
| `--hd-connection-a-core` | `#769792` |
| `--hd-connection-b` | `#A46C62` |
| `--hd-connection-b-on` | `#080B0D` |
| `--hd-connection-b-core` | `#B5877F` |
| `--hd-connection-bridged` | `#9A8355` |
| `--hd-connection-bridged-on` | `#080B0D` |
| `--hd-connection-bridged-core` | `#AD9A74` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#9A6F37` |
| `--hd-relationship-companionship` | `#6F816E` |
| `--hd-relationship-compromise` | `#8F6C50` |
| `--hd-relationship-dominance` | `#757A7D` |

### 草香 / Grass Aroma

ID：`grass-aroma` · mode：`light` · CSS：`src/styles/skins/grass-aroma.css`

墨绿、陶土、草木绿 Transit；不增加明显蓝色。

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
| `--hd-inactive` | `#C4CDC5` |
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
| `--hd-personality` | `#344039` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#B76A58` |
| `--hd-design-on` | `#07110C` |
| `--hd-both` | `#7B704C` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#4D9179` |
| `--hd-transit-on` | `#07110C` |
| `--hd-transit-text` | `#326B55` |
| `--hd-overlay-natal` | `#748079` |
| `--hd-overlay-natal-on` | `#07110C` |
| `--hd-transit-soft` | `#E6EFE8` |
| `--hd-type-generator` | `#8F8050` |
| `--hd-type-manifesting-generator` | `#9E6F4D` |
| `--hd-type-manifestor` | `#9E6559` |
| `--hd-type-projector` | `#607A75` |
| `--hd-type-reflector` | `#748079` |
| `--hd-circuit-individual` | `#716A79` |
| `--hd-circuit-individual-soft` | `#ECEEEA` |
| `--hd-circuit-tribal` | `#91675D` |
| `--hd-circuit-tribal-soft` | `#EEEEE8` |
| `--hd-circuit-collective` | `#617B78` |
| `--hd-circuit-collective-soft` | `#EBEFEA` |
| `--hd-circuit-integration` | `#61866F` |
| `--hd-circuit-integration-soft` | `#EBF0EA` |
| `--hd-connection-a` | `#5E8579` |
| `--hd-connection-a-on` | `#07110C` |
| `--hd-connection-a-core` | `#7A9A90` |
| `--hd-connection-b` | `#A87568` |
| `--hd-connection-b-on` | `#07110C` |
| `--hd-connection-b-core` | `#B78D82` |
| `--hd-connection-bridged` | `#958557` |
| `--hd-connection-bridged-on` | `#07110C` |
| `--hd-connection-bridged-core` | `#A79A74` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#8C6C43` |
| `--hd-relationship-companionship` | `#6F8C74` |
| `--hd-relationship-compromise` | `#916F56` |
| `--hd-relationship-dominance` | `#76817B` |

### 沉思 / Contemplation

ID：`contemplation` · mode：`light` · CSS：`src/styles/skins/contemplation.css`

石墨、尘玫瑰、雾灰蓝 Transit；不再用额外紫色 Signal。

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
| `--hd-inactive` | `#C7CDD2` |
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
| `--hd-personality` | `#313740` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#A16872` |
| `--hd-design-on` | `#000000` |
| `--hd-both` | `#726678` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#7E99A8` |
| `--hd-transit-on` | `#0D171C` |
| `--hd-transit-text` | `#526F80` |
| `--hd-overlay-natal` | `#7B7E83` |
| `--hd-overlay-natal-on` | `#000000` |
| `--hd-transit-soft` | `#E8EDF0` |
| `--hd-type-generator` | `#8C815A` |
| `--hd-type-manifesting-generator` | `#98715B` |
| `--hd-type-manifestor` | `#94666C` |
| `--hd-type-projector` | `#657783` |
| `--hd-type-reflector` | `#778087` |
| `--hd-circuit-individual` | `#716A83` |
| `--hd-circuit-individual-soft` | `#E9EAEE` |
| `--hd-circuit-tribal` | `#89646B` |
| `--hd-circuit-tribal-soft` | `#EBE9EC` |
| `--hd-circuit-collective` | `#667985` |
| `--hd-circuit-collective-soft` | `#E8EBEE` |
| `--hd-circuit-integration` | `#718376` |
| `--hd-circuit-integration-soft` | `#E9ECED` |
| `--hd-connection-a` | `#617F7F` |
| `--hd-connection-a-on` | `#000000` |
| `--hd-connection-a-core` | `#7F9798` |
| `--hd-connection-b` | `#A07174` |
| `--hd-connection-b-on` | `#000000` |
| `--hd-connection-b-core` | `#B28C8F` |
| `--hd-connection-bridged` | `#8F805E` |
| `--hd-connection-bridged-on` | `#0D171C` |
| `--hd-connection-bridged-core` | `#A4987D` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#896A4B` |
| `--hd-relationship-companionship` | `#74887A` |
| `--hd-relationship-compromise` | `#8B6F61` |
| `--hd-relationship-dominance` | `#7E868B` |

### Absolutely / Absolutely

ID：`absolutely` · mode：`light` · CSS：`src/styles/skins/absolutely.css`

墨黑、暖灰褐、Clay Orange Transit；Design 不再是蓝灰。

网站主 Palette：bg `#F4F3EE` / elevated `#FAF9F5` / sunken `#EDEAE2` / text `#2D2B28` / accent `#D97757`

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
| `--accent` | `#D97757` |
| `--accent-strong` | `#B9573E` |
| `--accent-hover` | `#C76445` |
| `--accent-soft` | `rgba(217,119,87,0.10)` |
| `--accent-on` | `#241B17` |
| `--focus` | `#D97757` |
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
| `--hd-inactive` | `#BBB5AC` |
| `--hd-inactive-on` | `#241B17` |
| `--hd-undefined` | `#C6BEB1` |
| `--hd-undefined-center` | `#FAF9F5` |
| `--hd-center-stroke` | `#AFA696` |
| `--hd-defined-fill` | `#D97757` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#D97757` |
| `--hd-timeline-panel-bg` | `#FAF9F5` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#FAF9F5` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#FAF9F5` |
| `--hd-detail-border` | `#D97757` |
| `--hd-legend-bg` | `#FAF9F5` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#6B6864` |
| `--hd-planet-column-text` | `#2D2B28` |
| `--hd-personality` | `#141413` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#7F7068` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#786C58` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#D97757` |
| `--hd-transit-on` | `#1A1411` |
| `--hd-transit-text` | `#A74D32` |
| `--hd-overlay-natal` | `#6F6A65` |
| `--hd-overlay-natal-on` | `#FFFFFF` |
| `--hd-transit-soft` | `#F7E8E2` |
| `--hd-type-generator` | `#9B8051` |
| `--hd-type-manifesting-generator` | `#A96C4A` |
| `--hd-type-manifestor` | `#98564A` |
| `--hd-type-projector` | `#69757B` |
| `--hd-type-reflector` | `#7F7A73` |
| `--hd-circuit-individual` | `#766A75` |
| `--hd-circuit-individual-soft` | `#EBE9E6` |
| `--hd-circuit-tribal` | `#8E5F55` |
| `--hd-circuit-tribal-soft` | `#EDE9E3` |
| `--hd-circuit-collective` | `#6C777C` |
| `--hd-circuit-collective-soft` | `#EAEAE6` |
| `--hd-circuit-integration` | `#737A63` |
| `--hd-circuit-integration-soft` | `#EBEBE4` |
| `--hd-connection-a` | `#647D75` |
| `--hd-connection-a-on` | `#000000` |
| `--hd-connection-a-core` | `#7E928B` |
| `--hd-connection-b` | `#A16E5E` |
| `--hd-connection-b-on` | `#0E0A08` |
| `--hd-connection-b-core` | `#B08678` |
| `--hd-connection-bridged` | `#9B855A` |
| `--hd-connection-bridged-on` | `#0E0A08` |
| `--hd-connection-bridged-core` | `#AB9974` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#B9684D` |
| `--hd-relationship-companionship` | `#747F68` |
| `--hd-relationship-compromise` | `#8E6B58` |
| `--hd-relationship-dominance` | `#7D7973` |

### 随时准备接住你 / Delve

ID：`delve` · mode：`light` · CSS：`src/styles/skins/delve.css`

出生图黑 / 灰；行运图 Natal 灰 / Transit 黑，采用 unified-natal。

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
| `--hd-inactive` | `#D1D1D1` |
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
| `--hd-design` | `#6F6F6F` |
| `--hd-design-on` | `#FFFFFF` |
| `--hd-both` | `#6F6963` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#111111` |
| `--hd-transit-on` | `#FFFFFF` |
| `--hd-transit-text` | `#1A1A1A` |
| `--hd-overlay-natal` | `#6F6F6F` |
| `--hd-overlay-natal-on` | `#FFFFFF` |
| `--hd-transit-soft` | `#EAEAEA` |
| `--hd-type-generator` | `#82745C` |
| `--hd-type-manifesting-generator` | `#896A55` |
| `--hd-type-manifestor` | `#895A56` |
| `--hd-type-projector` | `#64727B` |
| `--hd-type-reflector` | `#7C7C7C` |
| `--hd-circuit-individual` | `#716B76` |
| `--hd-circuit-individual-soft` | `#F6F6F7` |
| `--hd-circuit-tribal` | `#7F5F5A` |
| `--hd-circuit-tribal-soft` | `#F7F5F5` |
| `--hd-circuit-collective` | `#69757C` |
| `--hd-circuit-collective-soft` | `#F6F7F7` |
| `--hd-circuit-integration` | `#68766C` |
| `--hd-circuit-integration-soft` | `#F6F7F6` |
| `--hd-connection-a` | `#617B76` |
| `--hd-connection-a-on` | `#FFFFFF` |
| `--hd-connection-a-core` | `#7A908C` |
| `--hd-connection-b` | `#947068` |
| `--hd-connection-b-on` | `#030303` |
| `--hd-connection-b-core` | `#A58780` |
| `--hd-connection-bridged` | `#8A7C60` |
| `--hd-connection-bridged-on` | `#030303` |
| `--hd-connection-bridged-core` | `#9D9179` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#806B53` |
| `--hd-relationship-companionship` | `#69766C` |
| `--hd-relationship-compromise` | `#7C685A` |
| `--hd-relationship-dominance` | `#7C7C7C` |

### 用户彻底怒了 / Deep Think

ID：`deep-think` · mode：`light` · CSS：`src/styles/skins/deep-think.css`

蓝黑、暖红、高识别度蓝 Transit。

网站主 Palette：bg `#FCFCFD` / elevated `#F8F8FA` / sunken `#F0F0F2` / text `#1D1D1F` / accent `#4D6BFE`

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
| `--accent` | `#4D6BFE` |
| `--accent-strong` | `#4059D7` |
| `--accent-hover` | `#4059D7` |
| `--accent-soft` | `rgba(77,107,254,0.08)` |
| `--accent-on` | `#000000` |
| `--focus` | `#4D6BFE` |
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
| `--hd-inactive` | `#C9CCD6` |
| `--hd-inactive-on` | `#040509` |
| `--hd-undefined` | `#B9BBC6` |
| `--hd-undefined-center` | `#F8F8FA` |
| `--hd-center-stroke` | `#A5A8B5` |
| `--hd-defined-fill` | `#4D6BFE` |
| `--hd-undefined-fill` | `transparent` |
| `--hd-selection-ring` | `#4D6BFE` |
| `--hd-timeline-panel-bg` | `#F8F8FA` |
| `--hd-timeline-panel-border` | `var(--border)` |
| `--hd-tooltip-bg` | `#F8F8FA` |
| `--hd-tooltip-border` | `var(--border)` |
| `--hd-detail-bg` | `#F8F8FA` |
| `--hd-detail-border` | `#4D6BFE` |
| `--hd-legend-bg` | `#F8F8FA` |
| `--hd-legend-border` | `var(--border)` |
| `--hd-legend-text` | `#65656B` |
| `--hd-planet-column-text` | `#1D1D1F` |
| `--hd-personality` | `#252A36` |
| `--hd-personality-on` | `#FFFFFF` |
| `--hd-design` | `#C26068` |
| `--hd-design-on` | `#040509` |
| `--hd-both` | `#6F668C` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#4660E5` |
| `--hd-transit-on` | `#FFFFFF` |
| `--hd-transit-text` | `#354CC0` |
| `--hd-overlay-natal` | `#747B8A` |
| `--hd-overlay-natal-on` | `#000000` |
| `--hd-transit-soft` | `#E9EDFF` |
| `--hd-type-generator` | `#9C8353` |
| `--hd-type-manifesting-generator` | `#A8744D` |
| `--hd-type-manifestor` | `#A85D64` |
| `--hd-type-projector` | `#536AA8` |
| `--hd-type-reflector` | `#737989` |
| `--hd-circuit-individual` | `#756AA0` |
| `--hd-circuit-individual-soft` | `#F3F2F6` |
| `--hd-circuit-tribal` | `#955F66` |
| `--hd-circuit-tribal-soft` | `#F5F1F2` |
| `--hd-circuit-collective` | `#5F73A3` |
| `--hd-circuit-collective-soft` | `#F1F2F7` |
| `--hd-circuit-integration` | `#5F7F72` |
| `--hd-circuit-integration-soft` | `#F1F3F3` |
| `--hd-connection-a` | `#5B8588` |
| `--hd-connection-a-on` | `#040509` |
| `--hd-connection-a-core` | `#789A9D` |
| `--hd-connection-b` | `#AD716B` |
| `--hd-connection-b-on` | `#040509` |
| `--hd-connection-b-core` | `#BB8A85` |
| `--hd-connection-bridged` | `#9B8657` |
| `--hd-connection-bridged-on` | `#040509` |
| `--hd-connection-bridged-core` | `#AC9B75` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#6C72C7` |
| `--hd-relationship-companionship` | `#678476` |
| `--hd-relationship-compromise` | `#866D5B` |
| `--hd-relationship-dominance` | `#7B8090` |

### 新暖纸 / New Warm Paper

ID：`new-warm-paper` · mode：`light` · CSS：`src/styles/skins/new-warm-paper.css`

墨色 Personality、朱砂 Design、青灰蓝 Transit，恢复三色身份。

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
| `--hd-inactive` | `#C3B9AA` |
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
| `--hd-both` | `#78684F` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#537D96` |
| `--hd-transit-on` | `#080605` |
| `--hd-transit-text` | `#3F6179` |
| `--hd-overlay-natal` | `#756B60` |
| `--hd-overlay-natal-on` | `#FFFFFF` |
| `--hd-transit-soft` | `#E3E8E8` |
| `--hd-type-generator` | `#8D784C` |
| `--hd-type-manifesting-generator` | `#956447` |
| `--hd-type-manifestor` | `#884E42` |
| `--hd-type-projector` | `#5E7481` |
| `--hd-type-reflector` | `#716B64` |
| `--hd-circuit-individual` | `#716476` |
| `--hd-circuit-individual-soft` | `#EAE4DB` |
| `--hd-circuit-tribal` | `#80564C` |
| `--hd-circuit-tribal-soft` | `#ECE3D8` |
| `--hd-circuit-collective` | `#60747E` |
| `--hd-circuit-collective-soft` | `#E9E5DC` |
| `--hd-circuit-integration` | `#63715F` |
| `--hd-circuit-integration-soft` | `#E9E5D9` |
| `--hd-connection-a` | `#5D7C72` |
| `--hd-connection-a-on` | `#FFFFFF` |
| `--hd-connection-a-core` | `#789187` |
| `--hd-connection-b` | `#9D6A5A` |
| `--hd-connection-b-on` | `#000000` |
| `--hd-connection-b-core` | `#AD8273` |
| `--hd-connection-bridged` | `#93804F` |
| `--hd-connection-bridged-on` | `#080605` |
| `--hd-connection-bridged-core` | `#A5946A` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#8D5D43` |
| `--hd-relationship-companionship` | `#687361` |
| `--hd-relationship-compromise` | `#7F654F` |
| `--hd-relationship-dominance` | `#746C64` |
| `--radius` | `2px` |
| `--radius-lg` | `3px` |
| `--skin-large-radius` | `6px` |
| `--skin-border-width` | `.5px` |

### 青夜·高对比 / Midnight Contrast

ID：`midnight-contrast` · mode：`dark` · CSS：`src/styles/skins/midnight-contrast.css`

月白 Personality、青蓝 Design、暖玫瑰 Transit。

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
| `--hd-design` | `#7FA7B8` |
| `--hd-design-on` | `#080F14` |
| `--hd-both` | `#B79BC4` |
| `--hd-both-on` | `#080F14` |
| `--hd-transit` | `#E6B1C4` |
| `--hd-transit-on` | `#1B2025` |
| `--hd-transit-text` | `#F0C4D3` |
| `--hd-overlay-natal` | `#A7BAC5` |
| `--hd-overlay-natal-on` | `#0B1318` |
| `--hd-transit-soft` | `rgba(230,177,196,0.14)` |
| `--hd-type-generator` | `#C7AD72` |
| `--hd-type-manifesting-generator` | `#D09263` |
| `--hd-type-manifestor` | `#D37F72` |
| `--hd-type-projector` | `#80A6C1` |
| `--hd-type-reflector` | `#A3B0B8` |
| `--hd-circuit-individual` | `#A88BBC` |
| `--hd-circuit-individual-soft` | `#363E4C` |
| `--hd-circuit-tribal` | `#C17C70` |
| `--hd-circuit-tribal-soft` | `#393D43` |
| `--hd-circuit-collective` | `#7F9FB4` |
| `--hd-circuit-collective-soft` | `#31414B` |
| `--hd-circuit-integration` | `#86A58E` |
| `--hd-circuit-integration-soft` | `#324247` |
| `--hd-connection-a` | `#74AFA6` |
| `--hd-connection-a-on` | `#080F14` |
| `--hd-connection-a-core` | `#83B8B0` |
| `--hd-connection-b` | `#D18A7D` |
| `--hd-connection-b-on` | `#080F14` |
| `--hd-connection-b-core` | `#D5978C` |
| `--hd-connection-bridged` | `#BCA45F` |
| `--hd-connection-bridged-on` | `#080F14` |
| `--hd-connection-bridged-core` | `#C2AE72` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#B88E6A` |
| `--hd-relationship-companionship` | `#8BA590` |
| `--hd-relationship-compromise` | `#B3926E` |
| `--hd-relationship-dominance` | `#A8B6BE` |

### 珊瑚 / Coral

ID：`coral` · mode：`light` · CSS：`src/styles/skins/coral.css`

墨蓝 Personality、灰青 Design、珊瑚朱 Transit。

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
| `--hd-inactive` | `#C9BEB1` |
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
| `--hd-design` | `#6E8C7A` |
| `--hd-design-on` | `#000000` |
| `--hd-both` | `#87735E` |
| `--hd-both-on` | `#FFFFFF` |
| `--hd-transit` | `#F37E63` |
| `--hd-transit-on` | `#1A1714` |
| `--hd-transit-text` | `#B75240` |
| `--hd-overlay-natal` | `#6A7680` |
| `--hd-overlay-natal-on` | `#FFFFFF` |
| `--hd-transit-soft` | `#FCE7E0` |
| `--hd-type-generator` | `#9A7F4D` |
| `--hd-type-manifesting-generator` | `#AD7446` |
| `--hd-type-manifestor` | `#B76351` |
| `--hd-type-projector` | `#506C82` |
| `--hd-type-reflector` | `#747F86` |
| `--hd-circuit-individual` | `#706477` |
| `--hd-circuit-individual-soft` | `#F3ECE4` |
| `--hd-circuit-tribal` | `#9C5F50` |
| `--hd-circuit-tribal-soft` | `#F6EBE1` |
| `--hd-circuit-collective` | `#576E7F` |
| `--hd-circuit-collective-soft` | `#F1ECE4` |
| `--hd-circuit-integration` | `#65796D` |
| `--hd-circuit-integration-soft` | `#F2EDE3` |
| `--hd-connection-a` | `#5C7F78` |
| `--hd-connection-a-on` | `#000000` |
| `--hd-connection-a-core` | `#7D9891` |
| `--hd-connection-b` | `#BC715F` |
| `--hd-connection-b-on` | `#060E16` |
| `--hd-connection-b-core` | `#C98D7D` |
| `--hd-connection-bridged` | `#9A8251` |
| `--hd-connection-bridged-on` | `#060E16` |
| `--hd-connection-bridged-core` | `#AE9A71` |
| `--hd-connection-both` | `linear-gradient(45deg, var(--hd-connection-a) 0 50%, var(--hd-connection-b) 50% 100%)` |
| `--hd-connection-both-on` | `#000000` |
| `--hd-relationship-electromagnetic` | `#B06B4E` |
| `--hd-relationship-companionship` | `#6B7F70` |
| `--hd-relationship-compromise` | `#956D55` |
| `--hd-relationship-dominance` | `#748087` |

