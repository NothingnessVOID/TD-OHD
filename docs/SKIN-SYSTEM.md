# Skin 系统手册 V1

网站与图表的整套语义颜色放在 **Skin**。九中心的配色放在 **Center Palette**。字体保持独立，切换前两者不会设置或重置字体。

本阶段沿用网站当前明亮/暗色视觉，只建立正式身份、颜色契约、按 Skin 保存的用户覆盖及迁移。原始全站审计保留在 `docs/skin-audit/`，不重写历史报告。

## 1. Skin 的定义

Skin 是一套网站及图表配色方案，负责网站表面、文字、强调、边框、状态、投影、focus，图表中性色/面板，以及激活来源、Type、Circuit、Relationship。主颜色、文字 on 色与浅底属于不同语义；即使当前值相同也保留不同 Token。

`src/lib/skin-registry.js` 是正式注册表。当前只注册 `default-light` / `default-dark`，两者的 `cssSource` 是 `src/styles/skins/default.css`，由 `src/styles.css` 统一导入。

```js
{
  id: 'default-light',
  name: 'Default Light',
  mode: 'light',
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

中心配色独立文件：

- `src/styles/center-palettes/classic.css`
- `src/styles/center-palettes/chakra.css`

正式属性是 `data-center-palette="classic|chakra"`。`setCenterPalette()` 更新选择；同时镜像旧 `data-hd-skin`，以兼容既有 selector/工具。旧 `setHumanDesignSkin()` 是该 API 的 alias，当前只接受这两种正式配色。

Palette 拥有九个 edge 和九个 core，共 18 个 Token。Classic 根规则提供默认 edge/core；Chakra 覆盖九个 edge，复用以它们为输入的 core 派生公式。明暗模式影响现有中心色和混色比例，以保持原网站视觉。中心没有进入每 Skin 的颜色 override；切换 Skin 保留选中的 Palette。

旧 `human-design-chakra.css` 是兼容 import。旧 `human-design-classic.css` 现在只保存兼容 alias、闸门字号、图表透明度/线宽等非配色参数；正式 Skin 的颜色已迁走。旧 `site-default.css` 同样只作兼容 import。

## 4. Font 与独立偏好

`styles.css` 的 `--font` / `--font-serif`、字体加载和所有既有局部排版不变。Skin Registry 不登记字体，不写 data-font、不改 font Token。现阶段没有新增字体选择 UI 或第二套字体配置。

`gateNumberSize` 放在独立 `preferences`，不放入 Skin override。它在所有 Skin 和 Center Palette 之间保持一致，Restore 颜色也不清字号。其余字体、排版、图表数值参数仍沿用原路径，未纳入本阶段重构。

## 5. Skin Token 分类与图表规则

`SKIN_TOKEN_GROUPS` 分六组，`SKIN_TOKENS` 合计 **90 个 canonical Token**：

| 类别 | 数量 | 含义 |
|---|---:|---|
| site | 31 | 页面、卡片、下沉、文字、accent、状态、focus、投影、遮罩、登录光晕 |
| graph | 21 | 图内/面板、中性颜色、选择轮廓、tooltip/detail/legend/Timeline 表面 |
| sources | 10 | Personality / Design / Both / Transit 及 on、text、soft |
| types | 5 | 当前支持的五种类型各自颜色 |
| circuits | 8 | 四种当前回路主色及 soft |
| relationship | 15 | A/B/Both/bridged、前景/高光、四种关系状态 |

Compatibility alias、局部 Timeline 派生 Token、字体、尺寸、中心色不算这 90 个配色输入。下文有完整 checklist。

图表规则：

1. 来源主色用于通道/闸门/行星来源；on 是色底上的前景，Transit text 是可读文字，soft 是浅底，不能随意互换。
2. active / inactive、undefined 概念色、开放中心底色、透明填色分开保留。
3. Type 与 Circuit、网站 success 等不同语义不能因同值合并。
4. 中心 radialGradient 从 Palette 的 edge/core 来；A/B/bridged 的关系 core 从 Skin 来。
5. 图表背景用户设置同时覆盖 SVG 内背景和图表 panel，保持原有可见效果。
6. 渲染器读取 computed Token；原有 `onAppearanceChange()` 继续刷新出生图、关系图、可见 Transit 和 Timeline。CSS-only UI 自行跟随 cascade。

## 6. Relationship Token 与解耦

现有关系来源 `--hd-connection-a/b/bridged` 及 on/core 保留。

新增独立状态 Token：

| 状态 | 明亮值 | 暗色值 |
|---|---|---|
| --hd-relationship-electromagnetic | #c47a2a | #c47a2a |
| --hd-relationship-companionship | #27ae60 | #27ae60 |
| --hd-relationship-compromise | #2980b9 | #2980b9 |
| --hd-relationship-dominance | #6f675f | #8a8378 |

`views/connection.js` 的状态边线直接读取这些值，已不借 Circuit integration/collective 或 text-tertiary。`--hd-electromagnetic` 保留为新的 electromagnetic alias，旧 Team 等消费者保持当前色值；没有修改 Team/Penta 或关系算法。

**Both 是组合 paint，不是单一纯色。** 新 `--hd-connection-both` 给 CSS 图例使用，默认是 A/B 的 45°双色 gradient；`--hd-connection-both-on` 是字色。SVG 的双方闸门保持 A/B 斜纹，双方中心保持 A/B linearGradient。Both 的正式表达由关系 A/B + Both paint/on 构成，没有借用本命 `--hd-both` 或 Circuit。此时 CSS gradient 不能直接填进 SVG fill；未来新增 Skin 必须同时验证这些表面，不能仅修改图例 paint 并宣称整个 Both 都改变。

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

## 8. Restore 当前 Skin

`restoreCurrentSkin()` 只清当前 Skin 的五种颜色 override，保留当前 Skin、mode、Center Palette、字号、其他 Skin 的槽以及所有旧存储原文。

现有「恢复默认颜色」按钮绑定此 API。旧 `restoreCurrentPreset()` 为 alias；没有新增 Reset 按钮。

已有 `resetAppearance()` API 仍保留当前 mode、选择同 mode 的默认 Skin、还原 Classic、清全部颜色槽与字号。它写空 v3 状态，避免下次初始化重新导入保留的旧 key；不删除历史旧设置。

## 9. 新增 Skin 的标准步骤

1. 定一个稳定 ID，与翻译名称无关；只选 light 或 dark mode。
2. 在 `src/styles/skins/` 建样式，scope 到选中的 data-skin；覆盖完整 90 项 checklist（可引用同 Skin 的语义 Token/明确共用基底）。不写九中心或字体 Token。
3. 维护 source 主色/on/text/soft、状态、Type、Circuit、Relationship 的独立语义。不要由其他分类巧合相同的色值推导关系状态。
4. 在 SKINS 注册 id/name/mode/preview/cssSource；由主样式导入 CSS，确认被打包。Registry 的 cssSource 不是自动加载器。
5. Preview 至少给 surface/text/accent/personality/design/transit 六个值；它们仅代表默认示意，不能伪装成用户 override 后的实时截图。测试 preview 对应默认 palette。
6. 当前 UI 不提供任意新 Skin picker。本阶段只保留两个原兼容控件；正式增加选择 UI 属于后续任务。
7. 验证 Skin 切换→mode 镜像、当前槽、返回恢复、当前 Restore、所有 Palette、独立字号/字体、迁移与存储不可用情形。
8. 检查下节列出的视觉输出表面，并记录未覆盖的输出。

暖纸、青夜高对比、Anthropic-inspired、OpenAI-inspired、DeepSeek-inspired 只登记为 `PLANNED_SKIN_DIRECTIONS`，不是可选 Skin，没有 CSS 或实现。

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
- Chakra/Classic swatch 仍为旧静态示意。没有新 Skin picker，也未重新设计 Appearance UI。
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
