# TD-OHD License Audit V1

审计基线：`1add60c36b469e0d5dc84bd7ca38b0984a446363`；日期：2026-10-04。

1. **当前没有项目总许可证。** 根目录没有 `LICENSE`、`LICENSE.md`，`package.json` 也没有 `license` 字段。已有第三方声明不能替代项目整体发布许可。
2. **TD-OHD 新增的界面、适配器、工具和报告包含原创贡献候选。** 具体版权归属仍需按作者和素材来源确认。文件在这个仓库里，不能证明所有内容都由用户拥有。
3. **能够独立 MIT 发布的部分**包括得到权利人授权的 TD-OHD 原创代码，以及保持上游声明的 OpenHumanDesign、NatalEngine、hdkit、SharpAstrology.HumanDesign 和 Base 的 MIT 内容。当前尚未替原创内容选择许可证。继承的 MIT 内容要保留原作者声明；未知来源的图片、资料和字体不能统一贴 MIT。
4. **Modern 已经包含 AGPL 代码。** 浏览器实际下载经 TD-OHD 修改的 SharpAstrology.SwissEph C# 编译产物，与应用桥接和 HumanDesign mechanics 一起运行。静态托管和 WASM 格式不会免除二进制传播、对应源码及组合发布义务。具体法律边界仍需审查。[GNU AGPL 正文](https://www.gnu.org/licenses/agpl-3.0.html)
5. **Jovian 原创候选是 wrapper、adapter、acquisition、build 和验证工具。** 这些贡献可以单独讨论许可，但整个本地原型依赖上游天文核心。
6. **Swiss 1.76 C 和压缩 DE406 不是 TD-OHD 原创。** 实际历史 C 源码头是 GPL-2.0-or-later / Professional 双许可。DE406 `.se1` 是 Astrodienst 压缩产品，不能根据底层 JPL 数据来源就声明 MIT。它们目前仅在外部本地缓存，没有进入网站 bundle。
7. **Professional 可以解决经合同覆盖的 Swiss 原生源码、数据和使用方式的授权。** 应确认历史 1.76、镜像 DE406、浏览器与公开服务的范围。当前官方合同已更新为 September 2026，旧 `secont_e.pdf` 地址返回 404。[当前合同](https://www.astro.com/swisseph/secont_e_2609.pdf)
8. **Professional 不会自动解决 CReizner 的独立 C# 端口版权。** 不会自动给用户上游 MIT 代码的所有权，也不会自动清除字体、素材、他人资料的限制。Modern 如继续使用这个 AGPL 端口，需要端口权利人的适用授权或继续满足其 AGPL 条件。
9. **正式发布前应完成：**选定组合发布路线，确认权利范围，建立与发布版本对应的完整源码和构建材料，补齐第三方通知并检查所有可获取路径。选择由用户作出，本轮没有新增根许可证，也没有部署。

当前最重要的事实是：Modern 的 AGPL/Swiss 义务已经涉及公开传播；MIT 子文件与组合产品许可要分别处理；Jovian 的外部缓存只是一条工程边界。

当前发现的是需要整改或确认的发布材料缺口，**没有足够证据宣布现有部署存在明确高风险违法，也没有证据可认证部署合规**。公开 GitHub 链接、AGPL 全文和 Swiss notices 已存在；Base 专门 notice 缺失、完整对应源码入口与组合许可范围待确认。具体见 [bundle-analysis.md](bundle-analysis.md)。

## 覆盖范围与证据

`license-inventory.json` 为每个基线 tracked 文件记录 provenance、版本、许可证、修改与分发状态等字段，共 **959 个文件**，并列出 **262 个 npm 锁定依赖记录、5 个恢复的 NuGet 包、2 个 Modern 数据资产、3 个外部 Jovian 输入、1 个本地 native 输出及 .NET/ICU runtime**。

逐项记录使用 `NOASSERTION` 和 `unknown` 表示未得到授权证据的材料。144 项归类为 TD-OHD 原创候选，不能把候选数字当成已确认版权清单。源码比较使用公开上游 snapshot `d2d55083caca6ee7da190bdf1d9a08064cf6410b`；不同 hash 可能来自上游变化，不能全部归因给 TD-OHD。

证据保存在 `evidence/`：公开路径和 blob IDs、网站 runtime manifest、实际下载的文件 hashes、本地静态构建 sourcemap module 列表。没有上传 native 二进制、下载的 `.se1`、账户数据、token 或原始录制资料。

再生成：完成 `npm ci`、`DOTNET=/path/to/dotnet npm run build:pages` 及临时 sourcemap 构建后，运行 `python3 docs/licensing-audit-v1/generate-inventory.py`。再运行 `python3 docs/licensing-audit-v1/validate-audit.py` 检查记录一致性。验证脚本重新检查 tracked 文件和远端 refs，线上/外部下载与构建验证采用保存的审计证据；重新核验线上状态应再次只读 acquisition。脚本只写本审计 JSON，不改变运行程序。审计新增文件不递归列入基线 inventory。

验证见 [validation.json](validation.json)，路线比较见 [decision-matrix.md](decision-matrix.md)，未决项见 [open-questions.md](open-questions.md)。这是技术证据与发布决策准备，不构成法律保证。
