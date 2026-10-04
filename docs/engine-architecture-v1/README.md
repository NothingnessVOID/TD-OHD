# Engine Architecture V1

现在有两颗天文引擎。Modern 使用 C# / .NET 10，网站通过 WASM 运行，使用 patched SharpAstrology.SwissEph 和压缩 DE441 星历。Jovian-compatible 保留 Swiss Ephemeris 1.76.00 原始 C 与压缩 DE406，目前通过本地 Node → Python → C 执行。两者继续使用 SharpAstrology.HumanDesign 1.2.0 处理人类图，并复用现有序列化与 JS 适配。

Modern 是当前浏览器 production runtime。Jovian-compatible 是本地原型 runtime；它的 Python ctypes 桥接、时间语义与 Design 求根仍参与实际计算。下载、native 编译、构建、完整性检查工具和研究 oracle 各有独立职责。Python 仍存在，是为了保持已经验证的本地实现与操作顺序。这轮仅抽出接口和边界，没有重新翻译天文算法。

这轮增加真正共用的 `ChartInput` / `ChartResult`、provider dispatch、引擎身份检查与包含引擎维度的 cache key 设计。本地双引擎 CLI 已接入该接口；旧 `BirthEnginePrototype` 保留为兼容入口。网站的 `chartEngine = sharpProvider` 继续走原 production 路径。

未来浏览器接入 Jovian-compatible 仍缺 C/WASM 运行宿主、资产加载与隔离、时间语义一致性证明、共享 mechanics 接入和许可分发审查。未来 browser runtime 不能依赖 Python。本轮没有构建浏览器 C/WASM，也没有注册 Jovian browser provider。

当前适合继续做接口层验证与后续设计；尚未具备正式网站双引擎 selector 的接入条件。选择器、Settings、发布与部署均不属于本轮成果。

## Documents

| 文件 | 内容 |
| --- | --- |
| [current-engine-callgraph.md](current-engine-callgraph.md) | 基线的真实 UI / WASM / C# / Python / C 调用链与源文件证据。 |
| [target-engine-callgraph.md](target-engine-callgraph.md) | 本轮已实现接口及未来应用接入的区别。 |
| [engine-contract.md](engine-contract.md) | 可执行输入、输出、provider 与 identity / cache 规则。 |
| [runtime-boundaries.md](runtime-boundaries.md) | 当前 production、本地 runtime、tooling、validation、research 边界。 |
| [migration-notes.md](migration-notes.md) | 最小重构、兼容性、运行方式与后续门槛。 |
| [validation.json](validation.json) | 本轮新跑测试、parity、controls、build 与前后输出对比。 |

工作流 A 基于 `1add60c36b469e0d5dc84bd7ca38b0984a446363`，分支为 `refactor/engine-architecture-v1`。数值回归结论以本轮 `validation.json` 为准；历史基线中的 97 Jovian / 33 myBodyGraph 验证记录不能替代本轮重跑。

## 本轮验证

重构前后 97 个 UTC × 两颗引擎，共 194 份完整 `raw` 出生图逐项相同；展示 `chart` 除历史集成签名外也逐项相同。原始 C2 的 321 个 UTC 数值残差和 Design 根残差均为 0，56 个边界案例 × 5 时刻及 49 个负对照全部通过。Jovian 97 图 / 2,522 项、myBodyGraph 33 图 / 858 项保持匹配。Modern 单元 261 通过、3 个既有在线测试跳过；语言 34、时间线 61、全部相关 E2E 及 build 通过。
