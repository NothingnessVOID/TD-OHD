# Skin Foundation V1 验证记录

## 基线与范围

基于 `audit/skin-system-v1` / `5b8d61758e5a2647da34e9f47c20b863c895a2ad`，独立分支 `feature/skin-system-foundation-v1`。

本轮建立 Skin / Center Palette / 独立偏好的边界。未新增实际皮肤，未改字体、正文、图表或关系计算、Penta，未修改原始审计。没有合并 main、生产部署或更新本机 8787 安装。

## 定向测试

| 验证 | 结果 | 覆盖 |
|---|---|---|
| Appearance / 图表 / Transit / bridge / SVG unit | 29 passed，0 failed，0 skipped | 身份、模式、通知、分槽、Restore、v1/v2 迁移、旧原文保留、存储不可用、Token 契约、现有图表与行运 |
| `npm run e2e:appearance` | passed | 出生图、Transit/Timeline、详情、实时切换，桌面 1224 与手机 390 的控件、自定义、持久化、当前 Restore 和浏览器 PNG |
| Foundation 定向浏览器对照 | 13 scenarios passed，0 page errors | 8 组网站/BodyGraph 对照、4 组实际关系页对照与解耦、1 组旧存储迁移和刷新 |
| `npm run build` | passed | .NET/WASM 引擎准备与 Vite 打包；引擎构建 0 warnings / 0 errors |
| 源码范围检查 | passed | `bodygraph.js`、关系算法、Penta、Team 与 `index.html` 等于基线；`styles.css` 除 import 外完全相同 |
| `git diff --check` | passed | 无空白错误 |

未运行完整 Release E2E / 年度验证 / 全量 unit，本任务要求定向验证即可。Vite 仍报告已有的大 chunk 提示，不是构建失败，未扩大本轮范围处理。

## 默认视觉对照方法与结果

用审计 SHA 的页面与当前页面加载相同引擎资产、相同出生图。分别在 1224 / 390 宽度、light / dark 模式、Classic / Chakra 下，逐项对比原有 Token 的计算值、主页和基础卡的颜色/字体/阴影/位置/尺寸，以及完整 BodyGraph SVG markup。

八组均一致。关系页四组的文字、SVG、状态边线颜色和 Both 图例 gradient 同样一致。截图抽查暗色桌面与明亮 Chakra 手机，无明显错位。对照中阻止远程字体加载以避免不同请求时序；字体 CSS 本身没有变化。这不代表覆盖了所有浏览器和操作系统字体渲染。

修改 Circuit integration / collective 和 text-tertiary 后，四类关系状态颜色保持不变；修改独立 Relationship Token 后状态颜色生效；A/B Token 修改后关系图重绘正常。

## 存储验证

- 旧 version 1/2 的有效全局颜色迁入两个默认 Skin 独立槽。
- 保留旧 `td-ohd-appearance-v1` 原文，验证迁移及 reload 后仍逐字相同。
- v3 的 Skin 优先于旧 theme 和系统偏好。
- 每 Skin 自定义分别恢复，当前 Restore 不影响另一个槽、Center Palette、字号。
- gateNumberSize 独立保存；非法值过滤，未知 Skin 的有效槽可保留但不能被选中。
- localStorage 不可用时当前会话仍能切换。

## 如何复跑

定向 unit：

```sh
node --test tests/appearance.test.js tests/appearance-preferences.test.js tests/appearance-contract.test.js tests/bodygraph-integration.test.js tests/transit-graph.test.js tests/conditions-bridge.test.js tests/transit-presentation.test.js tests/pure-svg-renderer.test.js
```

需要 .NET 10 SDK。此次机器未安装 SDK，使用临时官方 SDK 完成 Transit 测试和 build；补齐后最终测试通过，没有改变项目引擎版本。

现有 Appearance 浏览器测试：

```sh
E2E_URL=http://127.0.0.1:<当前预览端口> npm run e2e:appearance
```

新旧 Foundation 浏览器对照：分别启动审计 SHA 和当前分支的 Vite 页面，使用同一套 public 引擎文件与依赖，再执行：

```sh
E2E_URL=http://127.0.0.1:<当前端口> BASELINE_E2E_URL=http://127.0.0.1:<审计基线端口> node tests/skin-foundation-e2e.mjs
```

`CHROME_CHANNEL` 支持既有 Chrome / Chromium；输出目录可用 `SKIN_EVIDENCE_DIR` 指定。默认截图和结果在系统临时目录，不进入 Git。

Token 原声明和受保护文件摘要登记于 `tests/fixtures/skin-foundation-baseline.json`；unit 不依赖完整 Git 历史，因此浅克隆 CI 同样可运行。

## 后续边界

Worker / 服务端分享 SVG / OG / 邮件模板仍使用原路径；分享 URL 没有完整传递 Skin、Palette 和 override。Both 的 CSS gradient 与 SVG stripe / gradient 是不同绘制路径。新的 Skin picker、预览 UI、可访问性和更广的色值开放均待后续阶段；详见 `SKIN-SYSTEM.md`。本轮不自动进入这些工作。
