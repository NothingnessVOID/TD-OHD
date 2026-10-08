# Skin Presets V1 验证记录

## 基线与范围

- 分支：`feature/skin-presets-v1`。
- 起点：`feature/skin-system-foundation-v1` / `2bf3df7e259b8e067f9556e62b1ad50e84838ea6`。
- 九套新增 Skin，加两套现有默认 Skin，共十一套。
- 新增八套 light、一套 dark；整体九套 light、两套 dark。
- 每套九十个 canonical Token。浏览器逐套确认计算值非空且能通过对应 CSS color / shadow / paint 语法检查。
- 主色与用户附件的独立测试 fixture 逐项一致；辅助 on/text/soft/core 明确记录在各 CSS 和 `SKIN-PRESETS.md`。

## 定向检查结果

| 检查 | 结果 |
|---|---|
| Appearance / Registry / Token / BodyGraph / Transit / Relationship 单元检查 | 38 passed / 0 failed / 0 skipped |
| `npm run e2e:appearance` | passed：来源色、独立中心、详情、明暗刷新；1224 / 390 控件、保存与恢复 |
| `npm run e2e:skin-presets` | passed：十一套 × 八个表面，关系 paint，独立保存、Restore、刷新、中心、字号、字体配置、三语言、键盘、手机布局、明暗快捷按钮 |
| `npm run build` | passed：Sharp WASM / Swiss 文件验证、Vite production bundle |
| 全量 Release E2E / 年度验证 | 按本轮要求未运行 |

单元检查命令：

```sh
node --test tests/appearance.test.js tests/appearance-preferences.test.js \
  tests/appearance-contract.test.js tests/skin-presets.test.js \
  tests/bodygraph-integration.test.js tests/transit-graph.test.js \
  tests/conditions-bridge.test.js tests/transit-presentation.test.js \
  tests/pure-svg-renderer.test.js tests/derived-chart-analysis.test.js
```

浏览器针对任务分支的独立 Vite 预览 `http://127.0.0.1:5212`，没有切换正式本机 8787。
构建使用临时 .NET SDK 10.0.401，通过 `DOTNET` / `PATH` 指向临时目录，没有更改机器的默认 SDK。
.NET 构建零警告、零错误；Vite 保留现有单 chunk 大于 500 kB 的提示。

原 Appearance E2E 的直接模块导入在 Vite HMR 下可能创建第二个模块实例。
统一使用页面已载入实例，保留所有原断言；中心和产品逻辑没有为测试修改。

## 功能和实际视觉表面

- 十一套均能通过 Picker 选择，刷新恢复当前 Skin。
- 五项颜色按 Skin 独立保存；返回原 Skin 恢复其 override。
- Restore 只清当前颜色槽，保留中心、字号、字体配置与其他 Skin 槽。
- 用户编辑新 Skin 的 Transit 时，列文字延续明暗处理；默认值仍采用各 Skin 显式 text 设计值。切换 / Restore 清除临时 text 覆盖。两套默认 Skin 沿用原 CSS 的文字派生方式。
- Classic / Chakra 使用独立 `data-center-palette`，切换不会改变 Skin。相同 mode 的中心 edge 在十一套切换中保持一致，九中心均可渲染。
- 主页、出生输入、Planet Detail、分享浮层、Reference、Transit、Timeline、Relationship 实际 DOM / SVG 均已检查。
- 桌面三列、手机两列；390px 下没有 Picker 横向溢出，最后一张卡与中心 / Restore 可操作。
- 三语言全部正确显示十一套名称与外观、皮肤、中心配色、自定义、恢复当前皮肤。
- 新暖纸覆盖 2 / 3 / 6px 有限圆角与 .5px CSS 边框；不引入纹理或字体。低像素密度屏幕上的细边框由浏览器按设备像素绘制。
- 两套默认颜色、Center Palette 文件、主样式排版和 BodyGraph renderer 的基线校验通过。

### Relationship

固定出生图 A：2000-05-10 12:30 UTC+8。
固定出生图 B：1985-03-20 08:00 UTC。

该对真实计算结果含：Electromagnetic 5、Companionship 1、Compromise 3、Dominance 3。
十一套实际 SVG 的 A/B stripe、Both gradient、Bridged edge 与四类状态卡颜色均对应当前 Skin Token。
没有把状态色重新 alias 到 Circuit，也没有修改关系算法。

来源与独立关系 on 至少 4.5:1。Delve 批准的 A/B 色对使用单一前景时无法同时达到 4.5:1，Both 选择黑色取得最好的共有对比度，最低约 4.48:1。其余新 Skin 的 Both 至少 4.5:1；批准的主色保持原值。

## 截图证据

目录：`/tmp/td-ohd-skin-presets-browser/`。PNG 不提交 Git。

- 十一套同一固定主页，1224 × 900，简体中文。
- 八个表面 × 十一套。
- 新暖纸、青夜高对比、Delve 的完整关系图，以及每种连接状态的独立截图。
- English / 简体 / 繁体 Picker；1224 / 390 的暖纸 Picker、珊瑚与青夜主页。
- `results.json` 记录逐 Skin 结果；浏览器 pageerror 为零。

截图环境统一关闭远程 Google Fonts 请求，保留同一系统字体回退环境；这组证据用于配色与控件审查。字体配置未改变，不据截图评价字体设计。
截图关闭已有 transition / animation，主页截图移开指针，避免记录切换中间色或 BodyGraph hover 聚焦状态。

临时日志：

- `/tmp/td-ohd-skin-presets-unit.log`
- `/tmp/td-ohd-skin-presets-appearance.log`
- `/tmp/td-ohd-skin-presets-browser.log`
- `/tmp/td-ohd-skin-presets-build.log`

## 修改文件

### 界面与运行入口

- `index.html`
- `package.json`
- `src/lib/appearance-controls.js`
- `src/lib/appearance.js`
- `src/lib/skin-registry.js`
- `src/locales/ui-contexts.json`
- `src/styles.css`
- `src/styles/appearance-controls.css`

### 九套配色

- `src/styles/skins/high-contrast.css`
- `src/styles/skins/grass-aroma.css`
- `src/styles/skins/contemplation.css`
- `src/styles/skins/absolutely.css`
- `src/styles/skins/delve.css`
- `src/styles/skins/deep-think.css`
- `src/styles/skins/new-warm-paper.css`
- `src/styles/skins/midnight-contrast.css`
- `src/styles/skins/coral.css`

### 测试与文档

- `tests/appearance-contract.test.js`
- `tests/appearance-controls-e2e.mjs`
- `tests/appearance-preferences.test.js`
- `tests/appearance-skin-e2e.mjs`
- `tests/fixtures/skin-presets-approved.json`
- `tests/skin-presets.test.js`
- `tests/skin-presets-e2e.mjs`
- `docs/SKIN-SYSTEM.md`
- `docs/SKIN-PRESETS.md`
- `docs/skin-presets-validation.md`

## 保留到后续

九中心 × Skin 适配；字体设置；任意用户自定义后的完整对比度验证；Worker / 服务端 SVG Palette；分享链接完整 Skin 传递；OG / SEO / OAuth / Email。没有修改 Knowledge 正文、计算引擎、Relationship 算法、Penta 或正式本机安装。

本轮完成后停在任务分支，不 merge、不 deploy。
