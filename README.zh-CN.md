# TD Open Human Design（TD-OHD）

[English](README.md) · [简体中文](README.zh-CN.md)

**这是基于 [Open Human Design 原项目](https://github.com/Unforced-Dev/open-human-design)的个人分叉版本，增加了浏览器 WASM 本命计算引擎、精细行运控制、交互式时间轴，以及英文、简体中文、繁体中文界面。** 当前暂用英文名称 TD Open Human Design，缩写 TD-OHD；暂不展开 TD 的中文含义。

**[官方网页版 · Netlify](https://td-ohd.netlify.app/)** · [独立发布的旧版 GitHub Pages](https://nothingnessvoid.github.io/TD-OHD/)

2026-10-01 更新包含本命计算引擎迁移、外观设置和本命四箭头。范围、数据覆盖与限制见[本次发布说明](docs/releases/web-2026-10-01.md)。GitHub Pages 尚未同步本次更新。

原项目提供交互式人类图，包括人体图、行星激活、类型、策略、内在权威、人生角色、四箭头／PHS、化身十字、行运、关系合图与团队分析。本仓库在这些已有功能上继续开发，不把原项目的成果写成新增功能。

## 这个分叉增加了什么

- **浏览器本命计算引擎：**采用 SharpAstrology.HumanDesign 1.2.0、SharpAstrology.SwissEph 0.5.1 和 Swiss Ephemeris 文件，在 .NET 10 浏览器 WebAssembly 中运行。行运、行运时间轴、Gene Keys 以及部分数据与解读仍使用 NatalEngine 1.6.0。本次更新没有替换全部计算路径，也不构成计算精度认证。
- **外观设置：**明暗主题、Classic／Chakra 能量中心配色，以及强调色、意识、设计、行运、图表背景、闸门字号六项持久化设置。六项自定义设置全局共用，切换主题或中心配色时继续生效；Classic／Chakra 只改变能量中心颜色。
- **本命四箭头：**设计侧显示摄取与环境，意识侧显示动机与视角；左右方向读取计算结果。行运图与关系合图不附加本命四箭头。

- **精细行运：**可选择日期、精确到秒的时间和时区，并处理历史 UTC 时差及夏令时切换。
- **更多行运查看方式：**本命图＋行运、仅行运视图、通道与能量中心交互，以及[行运时间轴](docs/transit-timeline.md)。
- **人体图交互修复：**改进连接路径、悬停跟随、浮窗裁切和闸门／通道详情导航。
- **中文化：**可切换英文、简体中文、繁体中文。手动选择的语言优先；否则跟随支持的浏览器语言，其他语言回退到英文。维护说明见[本地化文档](docs/localization.md)，专业术语见[中文术语对照表](docs/术语对照表.zh-CN.md)。

## 功能演示

下面的动图用独立浏览器和名为 **Demo Chart** 的虚构示例图录制，没有读取已保存的个人资料。

**行运时间轴：**拖动激活轨道选择时刻，切换到 24 小时范围，再查看一项激活的详情。

![行运时间轴演示：拖动时间、切换范围、打开激活详情](docs/assets/timeline-demo.gif)

**行运图表模式：**在“出生图＋行运”和“仅行运”之间切换。

![行运图表模式演示：切换出生图叠加视图与仅行运视图](docs/assets/transit-modes-demo.gif)

## 隐私与部署

[Netlify 网页版](https://td-ohd.netlify.app/)和 [GitHub Pages 版本](https://nothingnessvoid.github.io/TD-OHD/)都是纯静态部署。图表在浏览器中计算，保存的人物资料留在各自网址对应的浏览器本地存储中；两者都不提供本机桌面版的密码／SQLite 服务。分享图表链接会把出生资料写入网址，请留意分享对象。原项目提供的托管 MCP 和账号服务不属于这些静态部署。

同一套源码还包含**可选的本机桌面模式**，使用密码保护的 SQLite 资料库。这部分代码放在仓库中便于与前端一起维护，但不会进入 Pages 构建包；数据库与密码资料只留在使用者电脑的代码目录之外。构建边界与更新方法见[本机桌面模式说明](docs/LOCAL_DESKTOP_OVERLAY.md)。

## 本地运行

需要 Node.js 20 或更新版本及 .NET 10 SDK。`dotnet` 应在 PATH 中，也可用 `DOTNET` 环境变量指定可执行文件。`dev`、`build`、`build:pages`、`build:desktop` 均先构建 WASM 引擎；首次构建会下载两份固定来源的 Swiss Ephemeris 文件并校验 SHA-256。

```bash
git clone https://github.com/NothingnessVOID/TD-OHD.git
cd TD-OHD
npm install
npm run dev
```

```bash
npm test
npm run build:pages
npm run check:pages-bundle
```

安装时会对 NatalEngine 1.6.0 应用带版本检查的补丁，让行运计算保留秒数。如果安装时禁用了脚本，构建前请手动运行 `node scripts/patch-natalengine-seconds.mjs`。本命计算采用 [SharpAstrology.HumanDesign](https://github.com/CReizner/SharpAstrology.HumanDesign) 与 [SharpAstrology.SwissEph](https://github.com/CReizner/SharpAstrology.SwissEph)；[NatalEngine](https://github.com/Unforced-Dev/natalengine)继续参与行运和解读。打包星历文件覆盖 1800—2399 年；这是随构建提供的数据范围，不代表本次迁移新定义了产品日期策略或完成了完整历史范围认证。缺失星历时会报错，已禁用 Moshier 回退。首次本命计算会从本站按需加载 WASM 运行时和星历文件。来源与许可证见[第三方声明](THIRD_PARTY_NOTICES.md)。

行运时间默认精确到分钟；开启 **Seconds（秒）** 后可输入 `HH:mm:ss`，关闭时秒数会恢复为 `00`。**现在**按钮会遵循当前精度。修改 NatalEngine 补丁后，可用 `npm run dev -- --force` 刷新 Vite 的依赖缓存。开发服务器运行时可执行 `npm run e2e` 做浏览器冒烟测试。

外观令牌集中在 [`src/styles/tokens/`](src/styles/tokens/) 中。行运来源色为 `#1af4ff`；时间轴用 75% 来源色与 `#445457` 混合得到较柔和的轨道颜色。闸门数字默认字号为 22 个 SVG 单位，可调范围为 14—30；来源高亮采用圆圈。这些设置只影响显示，不改变计算结果。

## 网页发布

官方网页发布地址是 [Netlify](https://td-ohd.netlify.app/)，与 GitHub Pages 的发布流程独立。`main` 分支继续用于源码开发。只有推送专用的 `pages` 分支才会构建并发布 GitHub Pages；合并到 `main` 不会自动改动线上网页。准备上线时，再把审查完成的提交送入 `pages`。[Pages 工作流](.github/workflows/deploy.yml)会运行测试、构建纯静态网页并发布，不启用账号同步后端。由于 Vite 需要构建，GitHub Pages 设置仍使用 **GitHub Actions**；真正触发发布的源码分支只有 `pages`。

## 项目来源与后续贡献

本仓库从 **[Unforced-Dev/open-human-design](https://github.com/Unforced-Dev/open-human-design)** 分叉而来。核心应用与原有图表体验由原项目作者开发；上面列出的调整建立在其工作之上。这个个人版本有独立的部署和说明文档。若要向原项目贡献功能，会单独比对原仓库，并提交范围清晰的 PR。

仓库名现为 **TD-OHD**。上方保留原项目的署名和链接；将来调整暂用名称，也不会改变项目来源。
