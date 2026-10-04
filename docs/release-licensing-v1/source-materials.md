# Corresponding Source / Build Materials 工程清单

此表记录获取情况，不构成 AGPL 合规结论。

| 材料 | 状态 | 获取位置 / 限制 |
| --- | --- | --- |
| 修改后的 Sharp Swiss 全部源文件 | AVAILABLE | TD 计算基线 `third_party/SharpAstrology.SwissEph/` |
| patch manifest / upstream 原哈希 | AVAILABLE | `patch-manifest.json`、`upstream-files.json` |
| engine identity / source hash 生成器 | AVAILABLE | `src/lib/chart-engine/engine-identity.js`、`scripts/lib/engine-identity.mjs` |
| WASM/native 构建脚本 | AVAILABLE | `scripts/build-sharp-engine.mjs`、package scripts |
| C# 项目和 core 源码 | AVAILABLE | `engine-wasm/`、`engine-core/`、`engine-tools/` |
| NuGet 版本、包摘要及来源 commit | AVAILABLE | csproj；本轮 `production-identity.json` |
| NuGet 包实际内容 | RESTORABLE | 公共 NuGet 指定 id/version 下载；需网络和保留服务 |
| ephemeris manifest / 数据字节 | AVAILABLE / RESTORABLE | tracked manifest；固定 GitHub commit 下载并校验 SHA-256 |
| 完整本轮第三方许可文件 | AVAILABLE | `engine-wasm/licenses/`，build 复制到 `/engine/licenses/` |
| .NET runtime / ICU 来源和 notices | AVAILABLE / RESTORABLE | 本轮 runtime 文档及许可副本；固定源/包可恢复 |
| 构建要求 | AVAILABLE | Node ≥20、npm lock、.NET10 SDK、browser-wasm workload；本轮实际 SDK/runtime 在 identity |
| 原线上精确 SDK/workload/恢复日志 | NEEDS CONFIRMATION | 本轮本机环境不等于原部署环境 |
| 整体发行许可与适用源码 grant | NEEDS CONFIRMATION | 本轮明确不选择根许可证 |
| 所有静态正文/图像原始权利链 | NEEDS CONFIRMATION | 不由仓库可下载或路径归属自动证明 |

未发现本轮可明确补齐却仍 MISSING 的必要通知。尚待确认的许可证范围或环境资料没有被伪装为 AVAILABLE。记录中包含完整 runtime notices 是保留来源通知，不表示其中每一项都被链接进最终 trimmed browser payload。
