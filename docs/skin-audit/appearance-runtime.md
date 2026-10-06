# Appearance 当前运行逻辑

## 三条轴与实际覆盖

| 轴 | DOM 属性 | 当前可见选择 | CSS / 持久化 |
|---|---|---|---|
| Theme | `data-theme` | light / dark | `site-default.css` 与 classic/chakra dark selector；单独 storage `bodygraph-theme` |
| 网站 Skin | `data-skin` | default；没有选择 UI | `setSiteSkin()` 预留，当前无对应多 preset CSS；初始化总设 default，不持久化网站 Skin |
| Human Design Skin | `data-hd-skin` | classic / chakra | classic 是 root 默认，chakra selector 覆盖九中心；`preset` 存入 appearance 对象 |

`src/styles.css:1-4` 按网站 default → HD classic → Chakra → appearance-controls 导入；其后主样式包含字体、公共 UI 和具体组件。局部 Timeline/Knowledge/变量箭头/登录 CSS 由各模块引入。用户 root inline style 优先于这些常规声明。

Chakra 明/暗两套只声明九个 `--hd-center-*`，没有独立声明 core。core 的 CSS 引用自动采用 Chakra 当前色，并继承 classic 的明/暗混色比例。Personality/Design/Transit、网站 surface、Relationship、Type、Circuit、字体、shadow、SVG 参数均沿用已有体系。Skin 按钮的两条 swatch 渐变固定，不体现用户 override 或暗色 palette。

## 六个自定义入口

`src/lib/appearance.js:8-11` 的 `CUSTOM_TOKENS` 是受限映射，不是任意 CSS Token 编辑器。

| key | Token | 输入限制 / 额外作用 |
|---|---|---|
| accent | --accent | 六位 HEX；联动 soft/hover/strong/on |
| personality | --hd-personality | 六位 HEX；on 不重新计算 |
| design | --hd-design | 六位 HEX；on 不重新计算 |
| transit | --hd-transit | 六位 HEX；CSS 派生 text/soft 自动跟随，on 不重新计算 |
| graphBackground | --hd-graph-bg | 六位 HEX，同时写 --hd-graph-panel-bg；不接受透明 |
| gateNumberSize | --hd-gate-number-size | 14–30，数字或可解析数字字符串；存数字，inline 加 px |

`globalOverrides` 在所有 Theme/HD Skin 之间共用。切换 classic/chakra 或 light/dark 不清颜色；没有每皮肤独立自定义槽。九中心、回路、类型、关系 A/B/bridged、字体、shadow、opacity 没有直接用户 UI 自定义入口。

## applyOverrides 与派生

`appearance.js:23-38` 每次先 remove 六个 override Token 和五个联动 Token，再按当前全局 override 写入 root inline。没有 override 的项目落回 CSS cascade。

- graphBackground 同时改变 SVG 背景及 panel 背景。
- 自定义 accent 才将 soft/hover/strong/on 从预设固定值切换为动态表达式。
- on 的当前算法为 `(R*299+G*587+B*114)/1000 > 150` 选 `#16130f`，否则 `#ffffff`。它是亮度启发式，当前没有通用对比度保证。
- `--focus`、alias、core 等通过 `var()`/`color-mix()` 跟随，不由 JS 复制 palette。

## 本地存储与初始化

键名仍为 `td-ohd-appearance-v1`，实际写入格式是 version 2：

```json
{
  "version": 2,
  "preset": "classic",
  "globalOverrides": {
    "accent": "#c47a2a",
    "gateNumberSize": 22
  }
}
```

上例只示意格式，不是声明用户当前保存了这些值。Theme 放在独立键 `bodygraph-theme`，对象不保存 siteSkin。

初始化 `appearance.js:41-66`：

1. 清空内存 override，默认 classic。
2. 保存 Theme 为 dark 就采用 dark；没有保存值时检查系统 prefers-color-scheme。其余保存值走 light。只在初始化读取系统偏好，没有系统变化监听。
3. JSON 只接受 version 1/2；preset 只恢复 classic/chakra；过滤未知 key 与不合法值。
4. version 1 的 per-skin `overrides[skin:theme]` 按 classic → chakra、非当前模式 → 当前模式读入。后读覆盖先读，所以 Chakra 及其当前模式优先；随后 globalOverrides 再覆盖。读取迁移不会立即重写 storage，之后 persist 才写 version 2。
5. 设置 data-theme、data-skin=default、data-hd-skin，再 applyOverrides。

localStorage 读取/写入错误均捕获，当前页仍可使用内存设置；这不证明设置已经持久保存。

## 切换与刷新

- `setTheme()` 只接受 light/dark，先存 theme，发生变化才 notify。
- 两个 setSkin API 只校验小写 CSS identifier。`setHumanDesignSkin()` 可临时采用测试 probe 名称并存 preset，但初始化只恢复正式两款；`setSiteSkin()` 不存储。
- `setCustomOverride()` 校验后 persist + notify；返回的 overrides 是浅拷贝。
- notify 先重新应用 inline override，再触发 listeners。
- `main.js:87-95` 当前图存在时重新 render 本命 BodyGraph、关系合图、可见 Transit，并 refresh Timeline。SVG 在 render 时读取 computed Token。CSS-only detail/legend/行星列由 cascade 立即变化。
- `appearance-controls.js` 中打开 dialog 时刷新值；变化时若 dialog 开着继续刷新。关闭按钮/backdrop 与焦点行为沿用 dialog，语言切换重翻译标签。
- 原生 color input 通过隐藏 span 的 computed color 转 HEX；解析只提取前三个数字，其他 CSS 色空间/透明色序列化存在待验证风险。图背景初始 picker 特意读取 panel 背景，避免 transparent。

## Restore / Reset 的真实行为

| 操作 | 当前入口 | 清除 | 保留 |
|---|---|---|---|
| restoreCurrentPreset | `index.html` 的「恢复默认颜色」→ appearance-restore | 全局五项颜色 override；不是只恢复当前皮肤的分槽 | gateNumberSize、当前 Theme、当前 HD/site Skin；persist + notify |
| resetAppearance | 仅导出 API；当前用户 UI 没有「恢复全部默认」按钮 | 全部 override、appearance storage | 当前 Theme（重新存）、重设 site=default/HD=classic；notify |

两项现在都不把 light 改成 dark。移除用户 override 后显露当前 Theme 与 Skin 的 CSS 默认色。Restore 对所有全局颜色生效，不是一个永久保存在当前皮肤中的独立 palette。

## 输出边界

互动 BodyGraph 的颜色/部分参数经 `bodygraph.js` 从 root Token 进入 SVG。浏览器 `view-share.js` 的 PNG 导出克隆 computed style，另将 opacity/animation 固定以稳定截图。

`human-design/svg-renderer.js` 不依赖 DOM，Worker OG/chart.svg/MCP 调用它，只有自身 light/dark palette 与 fontFamily 参数。它不接受 Chakra 或用户 globalOverrides；SEO/OAuth/邮件/MCP 外层 HTML 又有独立值。此处是现状记录，没有扩大 Skin 的输出范围。
