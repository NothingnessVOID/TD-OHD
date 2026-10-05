# 手机 Timeline 浮层修正

分支：`fix/frontend-runtime-ux-v1`。修正前 HEAD：`9ebdbbaaa1fe7bac78cccfa3850ee0c25a34ae2e`。
原手机设计的对照基线：`main` / `2bc308b7a9037a10bae92fff6c9ff536a276b8ae`。

此次仅修正手机 Timeline 布局。Sync、默认语言与首帧、人物恢复、Connection/Team 保存、地点搜索、future range 逻辑保持修正前版本。计算、Knowledge、年度缓存、main、8787 未修改，未部署。

## 恢复的布局

删除 `.tl-mobile-control-bar` DOM 和占据 52px 的普通流布局，撤销 `.tl-stage` 的 flex column 与 `.tl-graph-panel` 的 flex sizing。图表恢复完整填满原来的 BodyGraph pane，3fr / 2fr 的 60% / 40% 两 pane 比例保持不变。SVG 的 padding、`translateX(-3%)` 与固有比例均保留。

下面三组控件均使用 absolute，位于 BodyGraph pane 内，没有第二排工具条：

* 左下：圆形控制按钮，右侧间隔 6px 为范围选择器；垂直中心对齐。
* 右下：previous / next 圆形按钮，间隔 6px。
* 高级面板：从按钮上方向上展开，absolute、受 pane 高度限制、内容可滚动。打开面板会覆盖图表的一部分，这是主动打开的浮层；不会挤压图表或时间轴。

## 最终尺寸

| viewport | 两侧 planet scale | 控制按钮 / 图标 | 箭头按钮 / 字号 | 范围宽×高 / 字号 |
|---|---:|---|---|---|
| 390×844 | 0.94 | 40 / 20px | 38 / 18px | 70×30px / 11px |
| 375×667 | 0.90 | 38 / 19px | 36 / 17px | 68×30px / 11px |
| 360×640 | 0.86 | 36 / 18px | 34 / 16px | 64×28px / 10.5px |
| 320×568 | 0.78 | 34 / 17px | 32 / 15px | 64×28px / 10px |

英文范围选择器在上述宽度上额外加 10px，给现有 `Past year` 等文字和原生下拉箭头留空间，最大 80px。没有改范围名称或选项。

两列应用同一个 `--tl-mobile-planet-scale`，分别从 left top / right top 整体缩放。标题、glyph、Gate.Line、fixing mark、行高、宽度和内部间距一起缩放，不单独缩数字。固定原始列宽为行运 55px、本命 108px，缩放后的实际列宽/中心矩形见 [validation-geometry.json](after/validation-geometry.json)。

## 几何对照

[三版本截图对照](comparison.html) 使用同一个合成出生图和固定行运时刻。原设计和上一版以其 Git CSS 快照和对应控制容器在独立页面重建，其他输入、计算、渲染保持相同。脚本只改测试页面，不改源码或服务安装。

| viewport | 上一版 SVG 容器宽×高 | 本次恢复后 SVG 容器宽×高 |
|---|---|---|
| 390×844 | 291.344×442.391px | 382×494.391px |
| 375×667 | 221.391×336.188px | 367×388.188px |
| 360×640 | 210.734×320px | 352×372px |
| 320×568 | 182.281×276.797px | 312×328.797px |

四档本次 stage、graph panel、SVG、tracks 的全部 x/y/width/height 与 main 原设计精确一致，见 [comparison.json](comparison.json)。表中 SVG 是布局容器矩形，实际绘图仍按自身比例 letterbox；没有更改绘图坐标。

## 测试规则

取消“控件必须完全避开整个 `.tl-graph` bounding box”的错误断言。新的手机 E2E 检查：

* 两列与收起状态的四个浮动控件没有碰撞。
* 左下两控件、右下两箭头及左右两组没有碰撞。
* 保护实际 SVG 九个中心的矩形；两侧行星列不与任何中心矩形相交。允许控件使用 SVG 视口的空白边缘。
* stage / tracks 保持 60/40；graph panel 只扣边框，SVG 保持原布局尺寸。
* 打开、关闭控制面板，以及展开/收起高级设置，两个 pane、graph panel、SVG 的位置及尺寸完全不变。
* 面板向上展开、不会超出 pane；320px 日期/时间输入也不互相覆盖。
* 英文、简体、繁体的长范围标签及四档屏宽；小时标尺、触屏 tooltip、时间拖动、纵向滚动和导航仍可用。

## 验证结果

* `npm test`：274 tests，271 passed、0 failed、3 skipped（项目默认关闭的在线测试）。
* `npm run build`：passed，引擎签名保持 `59b90e629033cc7faf95`；只有既有的大 bundle warning。
* `test:localization`：34 passed。
* `test:timeline`：61 passed。
* `e2e:timeline`：主流程、gesture、mobile touch、此次 mobile layout passed。
* production preview 的 mobile layout E2E：passed。
* frontend runtime E2E：passed，确认语言、恢复、Sync、保存及原 URL/邀请/资料库分支继续工作。
* 发布材料校验：passed；仅更新本轮已授权前端的 source/build hashes，计算与星历文件哈希保持。发现旧生成目录残留重复文件后，将该 worktree 的 ignored 生成目录移到临时目录并干净重建；重新运行主测试、production 手机 E2E 和完整 distribution 校验通过。未改构建脚本或放宽验证。

结构化结果见 [validation.json](validation.json)。

## 截图

| viewport | 原设计 | 上一版 | 修正后 | 面板打开 |
|---|---|---|---|---|
| 390×844 | [original](original/timeline-390.png) | [before](before/timeline-390.png) | [after](after/timeline-390.png) | [panel](after/panel-390.png) |
| 375×667 | [original](original/timeline-375.png) | [before](before/timeline-375.png) | [after](after/timeline-375.png) | [panel](after/panel-375.png) |
| 360×640 | [original](original/timeline-360.png) | [before](before/timeline-360.png) | [after](after/timeline-360.png) | [panel](after/panel-360.png) |
| 320×568 | [original](original/timeline-320.png) | [before](before/timeline-320.png) | [after](after/timeline-320.png) | [panel](after/panel-320.png) |

修正前 / 原设计 / 修正后的对照截图固定行运时间为 `2026-10-01T06:07:53Z`，合成出生资料为 `1990-06-15 14:30 UTC+8`。面板截图来自实际交互测试（含标尺拖动），选中时刻可能不同。额外 `range-en-*` / `range-zh-Hant-*` 展示长范围标签。全部为合成案例，无用户个人资料。

## 复现

已启动本分支 Vite 后，在配置了 Chromium 的环境运行：

```sh
E2E_URL=http://127.0.0.1:5230 node docs/frontend-runtime-ux-v1/mobile-floating/capture-comparison.mjs original
E2E_URL=http://127.0.0.1:5230 node docs/frontend-runtime-ux-v1/mobile-floating/capture-comparison.mjs before
E2E_URL=http://127.0.0.1:5230 MOBILE_SCREENSHOT_DIR=docs/frontend-runtime-ux-v1/mobile-floating/after node tests/timeline-mobile-layout-e2e.mjs
E2E_URL=http://127.0.0.1:5230 node docs/frontend-runtime-ux-v1/mobile-floating/capture-comparison.mjs after
```

最后的 capture 将对照截图统一回固定时刻，不覆盖 E2E 的 panel、locale 截图和 validation geometry。
