# Skin 系统手册 V3

网站与图表的整套语义颜色放在 **Skin**。九中心的配色放在 **Center Palette**。字体保持独立，切换前两者不会设置或重置字体。

Foundation 建立了身份、颜色契约、按 Skin 保存的用户覆盖及迁移；第三阶段新增九套完整 Skin 与正式 Picker，共十一套可选。默认明亮/暗色保持兼容。原始全站审计保留在 `docs/skin-audit/`，不重写历史报告。

## 1. Skin 的定义

Skin 是一套网站及图表配色方案，负责网站表面、文字、强调、边框、状态、投影、focus，图表中性色/面板，以及激活来源、Type、Circuit、Relationship。主颜色、文字 on 色与浅底属于不同语义；即使当前值相同也保留不同 Token。

`src/lib/skin-registry.js` 是正式注册表。当前注册十一套 Skin。`default-light` / `default-dark` 共用 `src/styles/skins/default.css`；九套新增 Skin 各有独立 CSS 文件，全部由 `src/styles.css` 统一导入。名称通过现有 i18n 的 source key 翻译。

```js
{
  id: 'default-light',
  name: 'Default Light',
  mode: 'light',
  transitSourceMode: 'split',
  preview: { surface, text, accent, personality, design, transit },
  cssSource: 'src/styles/skins/default.css'
}
```

Registry 不提供业务算法，也不会运行时下载 CSS。`cssSource` 指向实际受版本管理并已打包的样式。

## 2. Skin 与明暗模式

Skin 的 `mode` 是唯一正式模式来源。`setSkin()` 更新 `data-skin` 与兼容 `data-theme`，保存选择、应用当前 Skin 的覆盖，并通知图表刷新。

- `data-skin="default-light"` → `data-theme="light"`
- `data-skin="default-dark"` → `data-theme="dark"`

当前明暗按钮保留位置和交互，`setTheme()` 是选择对应默认 Skin 的兼容 wrapper。后续新增皮肤应直接调用 `setSkin(id)`，不组合任意 Skin + Theme。

CSS 的 `:root` 默认值保证初始化之前有基础颜色；没有 data-skin 时仍接受旧 data-theme dark fallback。初始化之后由注册 Skin 决定模式。网站既有按 data-theme 的组件规则继续可用。

## 3. Center Palette

正式注册表是 `src/lib/center-palette-registry.js`，九套配色分别为 Classic、Chakra、Jewel、Mineral、Ink、Porcelain、Botanical、Paper、Night Bloom。每套拥有九中心的 edge / core / on，共 27 个 Token。

`centerPaletteMode` 为 `skin-default`（默认）或 `manual`。随皮肤时使用 Skin Registry 的 `defaultCenterPalette`；手动点选后切换 Skin 保留当前 Palette。Picker 的“随皮肤 / Match Skin”是模式卡，预览当前 Skin 的默认配套，不注册为 Palette ID。Root 的 `data-center-palette` 和兼容 `data-hd-skin` 永远写实际 resolved ID。

Classic/Chakra 使用 92% edge + 8% white 的轻微 radial，Porcelain 使用 95% edge + 5% white。其余六套 core = edge，SVG 直接纯色填充，无径向渐变。全部 edge 固定使用批准值，只有 Ink 有明确 dark 值 `#96938E`。inactive gate 在 defined center 内使用 Center On；实际激活的 P/D/Transit/Both 保持 Source On。

完整配套、色号与人工查看记录见 [CENTER-PALETTE-V3-RELATIONSHIP-V2.md](CENTER-PALETTE-V3-RELATIONSHIP-V2.md)。

旧 `human-design-chakra.css` 是兼容 import。旧 `human-design-classic.css` 现在只保存兼容 alias、闸门字号、图表透明度/线宽等非配色参数；正式 Skin 的颜色已迁走。旧 `site-default.css` 同样只作兼容 import。

## 4. Font 与独立偏好

`styles.css` 的 `--font` / `--font-serif`、字体加载和所有既有局部排版不变。Skin Registry 不登记字体，不写 data-font、不改 font Token。现阶段没有新增字体选择 UI 或第二套字体配置。

`gateNumberSize` 放在独立 `preferences`，不放入 Skin override。它在所有 Skin 和 Center Palette 之间保持一致，Restore 颜色也不清字号。其余字体、排版、图表数值参数仍沿用原路径，未纳入本阶段重构。

## 5. Skin Token 分类与图表规则

`SKIN_TOKEN_GROUPS` 分六组，`SKIN_TOKENS` 合计 **100 个 canonical Token**：

| 类别 | 数量 | 含义 |
|---|---:|---|
| site | 34 | 页面、卡片、下沉、文字、accent、状态、focus、投影、遮罩、登录光晕 |
| graph | 26 | 图内/面板、中性颜色、选择轮廓、tooltip/detail/legend/Timeline 表面 |
| sources | 12 | Personality / Design / Both / Transit 及 on、text、soft；Overlay Natal / On |
| types | 5 | 当前支持的五种类型各自颜色 |
| circuits | 8 | 四种当前回路主色及 soft |
| relationship | 15 | A/B/Both/bridged、前景/高光、四种关系状态 |

Compatibility alias、局部 Timeline 派生 Token、字体、尺寸、中心色不算这 100 个配色输入。下文有完整 checklist。

图表规则：

1. 来源主色用于通道/闸门/行星来源；on 是色底上的前景，Transit text 是可读文字，soft 是浅底，不能随意互换。
2. active / inactive、undefined 概念色、开放中心底色、透明填色分开保留。
3. Type 与 Circuit、网站 success 等不同语义不能因同值合并。
4. 中心 radialGradient 从 Palette 的 edge/core 来；关系合图按 ownership 纯色或硬切双色显示，不使用 radial。
5. 图表背景用户设置同时覆盖 SVG 内背景和图表 panel，保持原有可见效果。
6. 渲染器读取 computed Token；原有 `onAppearanceChange()` 继续刷新出生图、关系图、可见 Transit 和 Timeline。CSS-only UI 自行跟随 cascade。

### 行运来源展示策略

`transitSourceMode` 与 Skin 的明暗 `mode` 不同，只决定 Transit / Timeline 的来源着色。`getTransitSourceMode()` 读取 Registry，缺省 `split`。当前仅 Delve 选择 `unified-natal`，其他十套为 `split`；renderer 不检查 Delve ID。

普通出生图始终是 Personality / Design 两来源。Overlay 下 unified-natal 使用 `--hd-overlay-natal` / `--hd-overlay-natal-on` 表示整组出生激活，Transit 使用自身主色 / On；共有 gate 用 Natal 主体加 Transit ring，Integration 混合路径用 Natal / Transit pattern。两个出生行星栏目仍保留姓名、数值及交互，只统一颜色。临时 fixing 仍读 Transit Text。

Timeline 主轨道及其四项 Legend 一律是 Overlay Natal / Skin-owned Timeline Transit（`--hd-timeline-transit`），不增加 Personality / Design 图例。`--tl-birth` 不再借 text-secondary。Transit-only 始终只绘行运激活。计算、来源判定、缓存和 Storage V3 不感知此策略。

Picker 继续展示出生图 Personality / Design / Transit，不因二色行运模式隐藏 Design。

## 6. Relationship Token 与解耦

Relationship 的正式视觉来源是 A、B、Both、Created（关系中新定义）。A/B/Created 及共同 On 在十一套 Skin 内各自登记批准值。`bridged` 保留内部 ID；可见状态使用“关系中新定义”。合图中心不读取普通 Center Palette。

A/B/Created 中心为纯色；Both 中心为 A 0–50%、B 50–100% 的硬切 diagonal。Gate Both、Companionship Channel、Both Legend 使用 A/B 45° 等面积条纹。

Electromagnetic 的两半分别保留 A/B；Compromise / Dominance 通道主体使用完整拥有者颜色，单 Gate 继续按真实来源显示。Mechanic list/detail 只在 Skin surface 上放小 marker：Electromagnetic → Created；Companionship → A/B stripe；Compromise/Dominance → owner。不再有四套独立 mechanic 色。

旧 `--hd-relationship-*` Token 暂时保留为 ownership alias；正式关系 UI 不读取这些历史四状态 Token。`--hd-electromagnetic` 为旧 Team 消费者显式保留各 Skin 的改动前值，避免关系颜色变化波及 Team。A/B/bridged core 兼容值现在等于主色，关系图不生成 radial。

## 7. 用户 Override 存储

新键：`td-ohd-appearance-v3`。旧 `td-ohd-appearance-v1` 原文保持，不改写、不删除。格式：

```json
{
  "version": 3,
  "skinId": "default-light",
  "centerPalette": "chakra",
  "overridesBySkin": {
    "default-light": { "accent": "#123abc", "design": "#abcdef" },
    "default-dark": { "design": "#333444" }
  },
  "preferences": { "gateNumberSize": 18 }
}
```

只允许当前五项 Skin 颜色：accent/personality/design/transit/graphBackground，严格六位 HEX。字号允许 14–30。无效字段过滤；未知但合法 Skin ID 的颜色槽可保留为 dormant，不能选中未注册 Skin。

### 优先级

1. 注册 Skin 默认 CSS（root 基础值 + 选中 Skin 值）。
2. Center Palette 单独覆盖中心 edge，core 自动派生；Font/独立偏好另行控制。
3. **当前 Skin** 用户 override 写 root inline；切换先移除前一个 Skin 的全部直接值及联动值，再应用新 Skin 的槽。
4. 当前 Accent override 继续沿用原有 soft/hover/strong/on 派生，未改变公式。

一个 Skin 没有保存颜色时采用其默认值；不会继承上一个 Skin 的颜色。返回曾修改的 Skin 会恢复它的槽。`getCustomOverrides()` 仍为旧控件返回当前 Skin 颜色 + 独立字号的兼容形状，实际存储不混放。

### 旧数据迁移

没有有效 v3 时读取旧 version 1/2：

- Theme 由旧 bodygraph-theme 决定；无保存值则读取系统偏好。Palette 由旧 preset 恢复。
- version 2 globalOverrides 原本在所有模式共用，复制到 light/dark 两个独立槽，维持迁移时两个模式已有的显示。
- version 1 继续按旧实现的合并优先级得到有效全局值（classic → chakra，非当前模式 → 当前模式，再 globalOverrides），同样复制到两槽。
- gateNumberSize 单独迁入 preferences；旧 key 的所有历史分槽仍保留原文，未丢失。
- 初始化保存 v3；之后只读 v3，不重复导入旧色。兼容 bodygraph-theme 继续写入，但不覆盖有效 v3 的 Skin 选择。
- localStorage 不可用时当前页设置仍有效；不能保证跨刷新保存。

迁移不会设置当前账户/资料数据，也不触碰 profiles、计算缓存或 8787 安装。

## 8. 恢复默认外观

Appearance Footer 使用 `resetAppearance()`，显示 Reset Appearance / 恢复默认外观 / 恢復預設外觀。

重置固定选择 `default-light`（Amber Dawn）、`skinMode: manual`、`centerPaletteMode: skin-default`，解析为 Mineral，清空全部 `overridesBySkin` 和 Appearance `preferences`（含 gateNumberSize）。Root 同步为 `data-skin="default-light"`、`data-theme="light"`、`data-center-palette="mineral"`、`data-hd-skin="mineral"`。

写入空 override/preferences 的 v3 状态，防止刷新时旧配置重新迁入。历史旧存储保留。出生数据、人物、语言、地点、时区、Timeline、Knowledge、同步账号、独立 Font 设置不属于重置范围。

旧 `restoreCurrentSkin()` / `restoreCurrentPreset()` API 保留给兼容消费者，但 Appearance Footer 不再调用它们。

## 9. 新增 Skin 的标准步骤

1. 定一个稳定 ID，与翻译名称无关；只选 light 或 dark mode。
2. 在 `src/styles/skins/` 建样式，scope 到选中的 data-skin；覆盖完整 100 项 checklist（可引用同 Skin 的语义 Token/明确共用基底）。不写九中心或字体 Token。
3. 维护 source 主色/on/text/soft、状态、Type、Circuit、Relationship 的独立语义。不要由其他分类巧合相同的色值推导关系状态。
4. 在 SKINS 注册 id/name/mode/preview/cssSource；由主样式导入 CSS，确认被打包。Registry 的 cssSource 不是自动加载器。
5. Preview 至少给 surface/text/accent/personality/design/transit 六个值；它们仅代表默认示意，不能伪装成用户 override 后的实时截图。测试 preview 对应默认 palette。
6. Picker 直接从 SKINS 构建卡片，不手写另一份列表。补齐英文 source key 对应的三语言名称；预览使用自身 surface/text/accent 与三个来源色，选中状态使用页面 Accent。
7. 验证 Skin 切换→mode 镜像、当前槽、返回恢复、当前 Restore、所有 Palette、独立字号/字体、迁移与存储不可用情形。
8. 检查下节列出的视觉输出表面，并记录未覆盖的输出。

已经实现的九个方向不再登记为 planned；`PLANNED_SKIN_DIRECTIONS` 保留为空数组作兼容。UI 不宣称任何皮肤属于品牌官方，不使用品牌图形。

## 10. 必须检查的视觉表面

| 表面 | 当前读取路径 / 验证要求 |
|---|---|
| Browser 网站 | 页面、Header、表单、卡片、modal/backdrop、popover、button/focus、Reference/Knowledge、状态/阴影；不能只看 body 背景 |
| BodyGraph | source、on、中心 edge/core、inactive/open/stroke、图例/tooltip、selection、数字；mode × Palette |
| Transit / Timeline | 本命/行运/混合、临时 fixing 文字、临时中心、轨道/legend 派生色、浮层；Skin 切换后实际重绘 |
| Relationship | A/B/bridged、双方条纹/中心 gradient/Both 字色、四种状态、展开个体图；Circuit/弱文字变化不再改变状态色 |
| Browser Share PNG | computed SVG 克隆及背景/文字；仍沿原 browser export 路径；来源 Token 和 Palette 不应缺失 |
| Worker SVG/OG/MCP | `svg-renderer.js` 固定 light/dark palette；现阶段不支持 Registry/Center Palette/override，必须单独标记 |
| Worker HTML/邮件/静态图片 | SEO/OAuth/MCP/email/font/favicon/og.png 有独立视觉；不能只改 SPA 就宣称全站所有输出统一 |

## 11. 下一阶段仍需处理的边界

- Worker、服务器分享 SVG/OG、SEO/OAuth/邮件模板尚未接入 Skin Registry；browser share URL 仍只传旧 theme，未传 Skin/Palette/自定义色。
- Both 当前是组合绘制，CSS paint 与 SVG paint 路径仍不同；不支持任意用户覆盖 Both paint。
- 自定义颜色只有五项；source-on 仍固定，accent-on 保留旧亮度阈值。完整自定义色可访问性验证留后续。
- Chakra/Classic swatch 仍为原静态示意。正式 Picker 已提供默认配色预览；九中心 × Skin 的适配仍未进行。
- 字体和字号分级、局部透明度/阴影几何、临时中心 .5 等未扩大重构。
- 兼容 data-theme/data-hd-skin/API/旧 CSS import 暂时保留；不在本阶段移除。

## 12. 完整 Token Checklist

以下来自正式 Registry，与审计的全量 191 个 custom property 是不同范围。每个新 Skin 的计算后值必须可用；Shadow 和 Both 为复合 paint，不要求全是 HEX。

### site

- [ ] `--bg`
- [ ] `--bg-elevated`
- [ ] `--bg-sunken`
- [ ] `--text`
- [ ] `--text-secondary`
- [ ] `--text-tertiary`
- [ ] `--border`
- [ ] `--border-subtle`
- [ ] `--accent`
- [ ] `--accent-strong`
- [ ] `--accent-hover`
- [ ] `--accent-soft`
- [ ] `--accent-on`
- [ ] `--focus`
- [ ] `--shadow-sm`
- [ ] `--shadow`
- [ ] `--shadow-lg`
- [ ] `--modal-backdrop`
- [ ] `--modal-overlay`
- [ ] `--lens-active-shadow`
- [ ] `--status-error`
- [ ] `--status-error-soft`
- [ ] `--status-success`
- [ ] `--status-success-soft`
- [ ] `--status-info`
- [ ] `--status-info-soft`
- [ ] `--status-caution`
- [ ] `--status-caution-soft`
- [ ] `--type-badge-bg`
- [ ] `--type-badge-text`
- [ ] `--type-badge-border`
- [ ] `--type-strategy-text`
- [ ] `--site-auth-glow`
- [ ] `--site-auth-shadow`

### graph

- [ ] `--hd-graph-bg`
- [ ] `--hd-graph-panel-bg`
- [ ] `--hd-graph-panel-border`
- [ ] `--hd-inactive`
- [ ] `--hd-inactive-on`
- [ ] `--hd-undefined`
- [ ] `--hd-undefined-center`
- [ ] `--hd-center-stroke`
- [ ] `--hd-defined-fill`
- [ ] `--hd-undefined-fill`
- [ ] `--hd-selection-ring`
- [ ] `--hd-timeline-panel-bg`
- [ ] `--hd-timeline-panel-border`
- [ ] `--hd-timeline-birth`
- [ ] `--hd-timeline-transit`
- [ ] `--hd-timeline-both-birth`
- [ ] `--hd-timeline-both-transit`
- [ ] `--hd-timeline-both-on`
- [ ] `--hd-tooltip-bg`
- [ ] `--hd-tooltip-border`
- [ ] `--hd-detail-bg`
- [ ] `--hd-detail-border`
- [ ] `--hd-legend-bg`
- [ ] `--hd-legend-border`
- [ ] `--hd-legend-text`
- [ ] `--hd-planet-column-text`

### sources

- [ ] `--hd-personality`
- [ ] `--hd-personality-on`
- [ ] `--hd-design`
- [ ] `--hd-design-on`
- [ ] `--hd-both`
- [ ] `--hd-both-on`
- [ ] `--hd-transit`
- [ ] `--hd-transit-on`
- [ ] `--hd-transit-text`
- [ ] `--hd-transit-soft`
- [ ] `--hd-overlay-natal`
- [ ] `--hd-overlay-natal-on`

### types

- [ ] `--hd-type-generator`
- [ ] `--hd-type-manifesting-generator`
- [ ] `--hd-type-manifestor`
- [ ] `--hd-type-projector`
- [ ] `--hd-type-reflector`

### circuits

- [ ] `--hd-circuit-individual`
- [ ] `--hd-circuit-individual-soft`
- [ ] `--hd-circuit-collective`
- [ ] `--hd-circuit-collective-soft`
- [ ] `--hd-circuit-tribal`
- [ ] `--hd-circuit-tribal-soft`
- [ ] `--hd-circuit-integration`
- [ ] `--hd-circuit-integration-soft`

### relationship

- [ ] `--hd-connection-a`
- [ ] `--hd-connection-a-on`
- [ ] `--hd-connection-a-core`
- [ ] `--hd-connection-b`
- [ ] `--hd-connection-b-on`
- [ ] `--hd-connection-b-core`
- [ ] `--hd-connection-both`
- [ ] `--hd-connection-both-on`
- [ ] `--hd-connection-bridged`
- [ ] `--hd-connection-bridged-on`
- [ ] `--hd-connection-bridged-core`
- [ ] `--hd-relationship-electromagnetic`
- [ ] `--hd-relationship-companionship`
- [ ] `--hd-relationship-compromise`
- [ ] `--hd-relationship-dominance`

### Center Palette（独立，不写入 Skin）

- [ ] `--hd-center-head`
- [ ] `--hd-center-head-core`
- [ ] `--hd-center-ajna`
- [ ] `--hd-center-ajna-core`
- [ ] `--hd-center-throat`
- [ ] `--hd-center-throat-core`
- [ ] `--hd-center-g`
- [ ] `--hd-center-g-core`
- [ ] `--hd-center-heart`
- [ ] `--hd-center-heart-core`
- [ ] `--hd-center-spleen`
- [ ] `--hd-center-spleen-core`
- [ ] `--hd-center-solar`
- [ ] `--hd-center-solar-core`
- [ ] `--hd-center-sacral`
- [ ] `--hd-center-sacral-core`
- [ ] `--hd-center-root`
- [ ] `--hd-center-root-core`

### 独立项与 compatibility

- Font：`--font`、`--font-serif` 由既有字体路径负责。
- 用户字号：`--hd-gate-number-size` / preferences。
- 其他数值：baseline offset、active/inactive weight、circle/channel/hatch opacity、stroke/ring width 保持既有配置。
- `--personality` / `--design` / `--transit-source*` / `--electromagnetic` / `--connection-person-*` 等旧名必须仍指向对应 canonical。

## 13. 第三阶段正式 Skin 与设置界面

| Skin ID | English | 简体名称 | mode |
|---|---|---|---|
| default-light | Default Light | 默认明亮 | light |
| default-dark | Default Dark | 默认黑暗 | dark |
| high-contrast | High Contrast | 素白 | light |
| grass-aroma | Grass Aroma | 草香 | light |
| contemplation | Contemplation | 沉思 | light |
| absolutely | Absolutely | Absolutely | light |
| delve | Delve | 随时准备接住你 | light |
| deep-think | Deep Think | 用户彻底怒了 | light |
| new-warm-paper | New Warm Paper | 新暖纸 | light |
| midnight-contrast | Midnight Contrast | 青夜·高对比 | dark |
| coral | Coral | 珊瑚 | light |

网站、Human Design Sources、Type、Circuit、Relationship 的核心 Palette 与全部 Token 规格见 `SKIN-PRESETS.md`。

Appearance 分三节：

1. **皮肤**：十一张默认色卡，桌面三列，手机两列。每张卡显示自己的 surface/text/accent 及 Personality/Design/Transit，不使用截图。原生 button 支持 Tab、Enter、Space 与 aria-pressed；切换不重建按钮、不丢焦点。名称跟随三语言实时刷新。
2. **中心配色**：九套独立 Palette + 随皮肤模式，九宫格预览，Root 使用 resolved `data-center-palette`。
3. **自定义**：五个当前 Skin 颜色与独立 Gate Number Size；底部「恢复默认外观」固定回到 Amber Dawn / manual / skin-default → Mineral，清空全部 Skin 颜色槽和 Appearance 字号偏好。

刷新恢复当前 Skin、Center Palette Mode 与手动选择。切 Skin 时，随皮肤模式解析该 Skin 的默认中心配色，手动模式保留用户选择；字体和字号保持。切中心配色保留 Skin 与五项自定义。旧格式不再修改，继续沿用 Foundation 的 v3 和迁移。

九中心的十八个 edge/core Token 本轮完全排除，原两套 CSS 没有修改；不能因为某套 Skin 的九中心组合不协调而回调已经指定的 Skin 主色。

## 14. 新暖纸几何例外

只有 `new-warm-paper` 覆盖既有 `--radius: 2px`、`--radius-lg: 3px`，并追加 `--skin-large-radius: 6px`、`--skin-border-width: .5px`。后两者只用于有限的公共控件/卡片/大表面 selector，独立于九十二个颜色 Token。其他 Skin 沿用当前几何。没有全仓圆角/间距重构，没有纸张纹理或图像，不影响字体。

### Timeline 与可靠性状态的独立语义

`--hd-timeline-transit` 控制轨道和图例，不控制图窗 BodyGraph。九套核心 Skin 显式定义 BodyGraph 与 Timeline 的角色色；默认两套继续引用 `--hd-transit`。Delve 图窗用 Azure `#2E75D4`，轨道用墨蓝 `#1F4F85`。

Reliability 的 solid / info / caution 分别读取 `--status-success` / `--status-info` / `--status-caution` 和对应 soft。它们不引用 Accent 或图表来源色。所有 Skin 显式提供 Info / Caution；Delve 使用绿 / 蓝 / 琥珀，Site Accent 则是 `#111111`。

V4 的三个角色独立：`--accent` 是 UI Identity / Interaction，`--hd-transit` 是 BodyGraph Transit Signal，`--hd-timeline-transit` 是密集轨道 Signal。允许同色、同系不同强度或不同色相，不强制 Accent = Transit。Picker 的 `preview.transit` 代表 BodyGraph，而不是 Timeline。完整九套矩阵见 `SKIN-PRESETS.md`。

### Timeline Both 专用来源条纹

新增三个 canonical Token：`--hd-timeline-both-birth`、`--hd-timeline-both-transit`、`--hd-timeline-both-on`，均归入 graph。十一套正式 Skin 显式定义；Auto 使用当前实际 Skin 的值，不单独登记 Token。

- Natal 单色条读取独立的 `--hd-timeline-birth`，BodyGraph Overlay 保持读取 `--hd-overlay-natal`。
- Transit 单色条继续读取 `--hd-timeline-transit`。
- Both 条为 135°、6px Transit / 6px Birth 等宽斜纹，文字使用独立 Both on；当前激活行沿用同一来源配色。
- Both 图例为同色 3px / 3px 斜纹，不使用 Surface、white 或 Transit soft 充当另一来源。
- Completed Bar 保持 Transit 主体加 5px Birth 左标记；图例缩小为 Transit 主体加 4px Birth 左标记，区别于 Both。

本轮仅进行本地页面与真实 Both interval 的人工画面查看，未运行测试或 build。

### Timeline Birth 与 Picker Signature

`--hd-timeline-birth` 是新增的第 100 个 canonical Token，归入 graph。十一套 Skin 显式定义，其他皮肤沿用原 Timeline Birth 值；Delve 为 `#111111`，其 Timeline Both Birth 也为 `#111111`。Delve BodyGraph Overlay Natal 仍为 `#6F6F6F`。

Timeline 层级为轨道背景 0、Bar 1、弱日期带与 gridline 2、cursor 3；轨道局部建立 stacking context。Bar 用 top/bottom 定位，每行底部通过局部 `--tl-row-gap: 1px` 留出细分隔。随后按视觉反馈恢复贯穿每个时间列的低透明度交替日期带，包括 Bar 所在区域；gridline 在日期带之后绘制，来源颜色 Token 保持不变。

人工查看还发现 Gate expand 控件的原局部规则被通用 Timeline 按钮的 32px 最小高度覆盖，使 28px 行内的 track 实际扩为 33px。局部规则提高优先级后，row / track 保持 28px；随后按视觉反馈保留 1px 行间细缝，Bar 为 27px，未改时间区间或行高设定。

Registry 的 `tagline` 为 Picker 第二行文案 key，`preview.signature` 为第二行代表色，均属于展示 metadata，不计入 canonical Token。Auto 第二行为 Follow system，保持双主题预览，没有独立 signature Token 或颜色 override 槽。

## Center Palette V2 当前状态

中心配色已扩展为 Classic / Chakra / Jewel / Mineral / Ink / Porcelain。此前两套 Palette 与静态色条的描述属于历史阶段；当前独立 Registry、Light/Dark edge/core 规则、共享卡片与人工查看记录见 [CENTER-PALETTES-V2.md](CENTER-PALETTES-V2.md)。Skin 配色、Timeline、Relationship、Font 与存储结构不随本轮调整。

## Appearance Header 与 Amber Dawn Transit 更新

当前弹窗完整 Header 使用 sticky，背景为不透明 `--bg-elevated`；同时覆盖 Dialog 内边距，避免卡片从标题栏上方露出。桌面和手机滚到底部仍可见标题与关闭按钮。

Amber Dawn BodyGraph Transit 为 `#2D929F`，Timeline Transit / Both Transit Stripe 保持原值 `#2F6870`，text 为 `#246D76`，soft 为 `#E1F0F1`，on 为 `#FFFFFF`。Both Birth / Completed 左 Birth marker 保持 `#6B655F`。Picker Transit 同步 BodyGraph 色，Signature 保持 `#B86F2C`。Amber Dusk 和其他 Skin 不变。人工确认记录见 [APPEARANCE-RESET-AMBER-DAWN.md](APPEARANCE-RESET-AMBER-DAWN.md)。

## Center Palette V3 / Relationship Visual V2 当前规则

本轮九套 Palette 和十一套默认配套、inactive Center On、关系 ownership 视觉规则已生效。Reset Appearance 固定回 Amber Dawn / manual Skin / skin-default Center Mode / resolved Mineral，清空所有 Skin override 与 gateNumberSize 偏好；字体和业务资料保留。前述 V2 附录记录是历史人工检查，不代表当前配色比例。详见 [CENTER-PALETTE-V3-RELATIONSHIP-V2.md](CENTER-PALETTE-V3-RELATIONSHIP-V2.md)。

## Relationship Palette V3 / Circuit 可读性

当前九套 Light Relationship 配色、独立 Connection 按钮规则及跨 Skin 固定 Circuit 语义色见 [RELATIONSHIP-PALETTE-V3.md](RELATIONSHIP-PALETTE-V3.md)。两套 Dark Relationship 配色保持不变；V2 ownership 视觉语法继续沿用。

## Relationship Palette V4 / Delve 大面积颜色

四套 Skin 的最新关系身份、Ink Light #606060 和 Delve Timeline Birth #343434 见 [RELATIONSHIP-PALETTE-V4.md](RELATIONSHIP-PALETTE-V4.md)。V3 其余七套 Relationship 及全部 Circuit 规则继续有效。
