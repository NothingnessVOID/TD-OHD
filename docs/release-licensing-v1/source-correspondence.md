# Object code ↔ Source

计算发布基线固定为 TD-OHD `4cc718f2ba6aaadc74b3c4036a0191fa9791d657`。本轮仅增加许可 metadata；其提交另从 Git 分支/文件历史解析。线上是已有发布，本地 `dist` 是本轮重新构建且增加 notices 的产物，二者分列 hash，不混写。

| Object / data | 对应源码与版本 | 构建与通知 |
| --- | --- | --- |
| SharpAstrology.SwissEph WASM | upstream 0.5.1 `342a57997c1b987e7949acc98897c8b73d05939a`；TD 基线 `third_party/SharpAstrology.SwissEph/` 修改快照 | vendored csproj + `scripts/build-sharp-engine.mjs`；AGPL 和 Swiss notices |
| SharpAstrology.Base WASM | NuGet 0.14.0；repository commit `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c` | WASM/core ProjectReferences 的已恢复依赖；Base MIT |
| SharpAstrology.HumanDesign WASM | NuGet 1.2.0；commit `8b78031ce9a4244b8eb0a4ce37e612b8d6782570` | WASM/core 项目依赖；HumanDesign MIT |
| SharpChartEngine WASM | TD 基线 `engine-wasm/Program.cs` 与 `SharpChartEngine.csproj` | `.NET publish`，由 `build:pages` 复制；总发行许可仍未选择 |
| SharpTransitCore WASM | TD 基线 `engine-core/TransitCore.cs` 与 `SharpTransitCore.csproj` | WASM 项目引用共用 core；同上 |
| sepl_18.se1 / semo_18.se1 | compressed DE441；swisseph `3186eed405bd2b4ff520c91d0b27bb25e9d75106/ephe` | `engine-wasm/ephemeris-manifest.json` 固定哈希；Swiss 数据 notice |

实际 fingerprint 文件名和 SHA-256 在 `release-components.json`。NuGet 包 SHA-256、nuspec SHA-256、源码 commit 在 `production-identity.json`，可以用 NuGet flat-container 恢复同一包。

## 修改身份

实际 patch revision：`td-ohd-swiss-parity-v1-true-node-light-time`。Engine signature：`59b90e629033cc7faf95`。Patched source aggregate：`2af6f9b5773b3b157c533f7e0e0ba4295999723bb5ee8467d69ee2cb7363b1e7`。

`patch-manifest.json` 列出八个修改文件、原始与修改后哈希；本轮没有改它。修复范围包含 UTC/UT1、frame bias、Moon emission Earth center、True Node apparent light time。不要拿早期 patch label 代替当前身份。

## 可复现性的限度

哈希证明的是明确观测到的资源和源文件。它们并不证明每个 NuGet commit 与 binary 逐字节重建一致，也没有证明当前网站服务器上的完整构建环境。发行源码快照、项目和脚本能获取；精确 SDK、恢复环境和 deterministic build 仍应保留。Full byte-for-byte reproducibility：NOT CLAIMED。
