# SharpAstrology 全量计算路径迁移

## 范围与发布状态

本轮补完此前仅迁移出生图的工作：出生图、当前行运、时间轴实时快照和年度事件生成统一采用 SharpAstrology.HumanDesign 1.2.0、SharpAstrology.SwissEph 0.5.1 与文件式 Swiss Ephemeris。移除 NatalEngine 运行依赖、秒精度补丁及旧引擎年度数据。

这是当前源码的架构说明，不代表已部署。`main` 合并、Netlify 发布和 GitHub Pages 发布分别处理。早期的 [web-2026-10-01 发布说明](releases/web-2026-10-01.md)记录当时仅迁移出生图的版本，保留作为历史记录。

本轮不新增产品日期范围，不扩展极端年份兼容，不改四箭头、出生图数据合同或现有 UI 设计。不据此宣称全部历史日期已验证。

## 计算与资料边界

| 路径 | 当前实现 |
| --- | --- |
| 出生图与 Design 88° 回退 | SharpAstrology.HumanDesign，经浏览器 WASM 调用 |
| 当前行运与批量快照 | SharpAstrology 激活结果；浏览器 WASM 调用共享 C# 行运核心 |
| 时间轴实时扫描 | 异步读取同一 WASM 快照；使用现有扫描、区间、合并岛与来源模型 |
| 年度事件生成 | 原生 .NET 客户端调用同一 `engine-core/TransitCore.cs`，使用相同 Swiss 文件 |
| Gene Keys | 本地 `src/lib/gene-keys.js`，从计算结果中的闸门及爻线派生 |
| Connection／关系合图 | 本地 `src/lib/human-design/connection.js`，分析已有闸门与通道 |
| Penta／团队 | 本地 `src/lib/human-design/penta.js`，分析已有图表结构 |
| 拓扑与术语 | 本地 `src/lib/human-design/catalog.js` |
| 英文解读与中文译文 | 本地英文阅读字典与现有各语言资料，不调用在线翻译 |
| SVG 几何与浏览器资料保存 | 本地几何数据和存储模块；继续读取原浏览器资料键 |

本地派生模块保留原展示合同及解读文字，不负责天体位置计算。静态资料和部分派生逻辑的来源、作者及 MIT 条款保留在 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)；没有复制完整旧包作为备用引擎。

## 共享核心与异步边界

`engine-core/TransitCore.cs` 是浏览器 WASM 与原生年度生成共用的行运行星激活核心。`engine-wasm/Program.cs` 提供单时刻和批量调用接口；`scripts/lib/sharp-native-client.mjs` 使用持久原生进程；`scripts/lib/sharp-annual-source.mjs` 进行有界批量预取。

JS 仍负责已有出生资料的 UTC 转换、显示时间和图表合同适配。行运接口输入 UTC 时刻；时间轴通过异步单次／批量快照读取结果，不假定计算在浏览器主线程同步完成。年度生成的分钟扫描与秒级边界细化复用同一原生 Swiss 上下文。

秒级边界细化表示扫描结果的时间分辨率，不代表天体位置误差或计算精度认证。扫描步长内同一行星离开后又回到原状态的情况仍受现有算法限制。

## 星历文件与失败行为

构建使用 `engine-wasm/ephemeris-manifest.json` 中固定来源、固定提交及 SHA-256 的 `sepl_18.se1`、`semo_18.se1`。首次构建下载并校验；首次浏览器计算按需加载本站 WASM 与星历。文件覆盖描述沿用 manifest，不据此更改 UI 产品日期策略。

必须使用文件式 Swiss。缺失文件、加载失败或无有效 Sharp 结果时明确报错，不改用 Moshier，不切回旧引擎，也不请求外部天体计算 API。

年度数据 manifest 绑定 Sharp 包版本、Swiss 文件及来源提交、C#／时间适配器摘要、13 个激活点、扫描步长和边界细化参数。客户端检查签名、文件长度、SHA-256、年份与年度衔接；旧计算签名的数据不能混入本轮时间轴。年度文件不可用时的实时扫描仍使用同一 Sharp WASM，不构成更换天文引擎。

## 复现步骤

需要 Node.js 20+ 和 .NET 10 SDK。`dotnet` 可以放在 PATH，也可以通过 `DOTNET` 指定绝对路径。以下命令在仓库根目录运行：

```bash
npm ci
npm run build:engine
npm test
npm run test:localization
npm run test:timeline
npm run test:sharp
npm run build
npm run build:pages
npm run check:pages-bundle
```

若 SDK 不在 PATH，先设置环境变量，例如：

```bash
export DOTNET=/absolute/path/to/dotnet
npm run build:engine
```

`dev`、`build`、`build:pages`、`build:desktop` 已包含 `build:engine` 链。直接运行测试、年度生成或原生校验前仍应先构建引擎，确保原生客户端可以读取已校验星历。

生成一个年度进行开发复现：

```bash
node scripts/generate-transit-events.mjs 2026
node scripts/verify-transit-events.mjs 2026
```

全量目标为 2021—2036 共 16 年：

```bash
npm run generate:annual
npm run verify:annual
```

生成程序写入新的签名目录与 manifest；校验程序核对数据结构、文件摘要、跨年衔接、事件边界与行星方向变化附近的原生快照。不要把命令执行到一半的 manifest 当成完整年度发布结果。

浏览器验证需启动开发服务，并将实际地址传给测试：

```bash
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
E2E_URL=http://127.0.0.1:5176 npm run e2e:sharp
E2E_URL=http://127.0.0.1:5176 npm run e2e:timeline
E2E_URL=http://127.0.0.1:5176 npm run e2e:appearance
```

## 可选 Worker 的边界

Netlify 和 GitHub Pages 是静态应用，出生图和行运在浏览器计算。本轮没有部署 Cloudflare 计算服务，也没有增加其他服务端天文引擎。

仓库中的可选 MCP、OG 图和名人图表处理器不再导入旧计算器。需要计算的宿主必须显式提供 `env.SHARP_ENGINE`，并实现处理器所需的出生图／行运接口；可选西洋占星工具另需对应接口。`worker/chart-provider.js` 在没有宿主适配器时明确报错。这不是一个预先启动的计算服务，不应把接口占位视为服务端已可用。

静态 SEO 资料页仍读取本地词汇和解读。需要实际计算的名人页面使用异步宿主接口，不通过旧引擎兜底。

## 验证记录

本地全量年度验证已通过：2021–2036 共 16 年，328,974 个秒级时刻、4,276,662 次行星 Gate／Line 比较，差异为零。覆盖所有事件的前一秒、当秒、后一秒，287 个驻留／逆行窗口及 327 组往返边界。缓存边界与界面统一使用整秒；不把秒内的毫秒样本当作缓存支持的精度。

浏览器与原生工具的 52 个时刻、13 个行星及全部六个激活字段一致；黄经对照阈值为 1e-9。缺失 Swiss 文件明确失败，缺失年度数据经同一浏览器 WASM 补算。交互批次限为 64，原生年度预取为 4096。30／90／180 天年度缓存路径静态构建实测约 75／80／132 ms。

完整机器记录见 [验收数据](reports/sharp-engine-complete-validation.json)。GitHub CI、合并 SHA 及 Netlify 发布状态由 PR 和本轮最终报告记录。

私人出生资料、外部 Golden 样本及临时审计文件不纳入仓库。
