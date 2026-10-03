# 当前 Modern / browser bundle 实测

审计日期：2026-10-04。只用公开 HTTP GET 读取 [Netlify 网站](https://td-ohd.netlify.app/)，没有访问部署账号或修改站点。本地在 audit worktree 构建同一源码基线。浏览器 UI/WASM lazy load 调用链来自 `src/lib/chart-engine/sharp-provider.js`，C# ProjectReference 来自 `engine-wasm/SharpChartEngine.csproj`。

## 当前公开站点确实在提供什么

从公开 `_framework/dotnet.js` 内嵌配置解析资源，再逐个下载并校验 manifest 的 SHA-256：

| 线上对象 | SHA-256 / 证明 | 许可边界 |
| --- | --- | --- |
| SharpAstrology.Base WASM | `7eb00b40a026e98040b34ce1604f16416ae6c315787c260b85252a91daa24eb0` | exact Base 0.14.0 NuGet metadata: MIT |
| SharpAstrology.HumanDesign WASM | `0d8a9ba7880764be0b76a93b3648cc7769cbb053f355fa2827e04628513c7aac` | 1.2.0 MIT |
| SharpAstrology.SwissEph WASM | `09e2e9220bb526cd037b781220beb4761c0613d8387bad86337b1524808b40f1` | CReizner AGPL port; vendor source modified by TD-OHD |
| SharpChartEngine / SharpTransitCore | 下载后与线上 manifest hash 一致，完整值见 `evidence/live-artifacts.json` | TD-OHD bridge / shared adapter original candidates；combined-distribution analysis required |
| System.Numerics.Tensors WASM | manifest hash 一致 | MIT NuGet 10.0.7 |
| .NET native runtime / standard libraries / ICU | manifest enumerated;未逐一下载完整系统程序集 | .NET MIT + bundled third-party and ICU notices |
| `ephe/sepl_18.se1` | `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66` | Astrodienst compressed DE441 |
| `ephe/semo_18.se1` | `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7` | Astrodienst compressed DE441 |

两个 `.se1` hash 与 tracked `engine-wasm/ephemeris-manifest.json` 完全一致；二进制文件头标明 DE441，创建日期 2026/05/26。它们不是 Jovian DE406，即使文件名相同。线上 app JS 含 Modern signature `59b90e629033cc7faf95`，与 pinned patch manifest 一致。当前浏览器 manifest 和 app 没有 Jovian 1.76 native module；该结论限于实际枚举的当前 resources 和 app，不是对服务器所有隐藏文件的推断。

当前站点公开配置可以直接证明组件存在；patch manifest + app signature + ProjectReference 支持 TD-OHD patch 使用判断。本机重建的部分 assembly hash 和 fingerprint filename 与线上不同，因此未宣称对整个线上部署实现字节级可重现性。

## 义务已经涉及公开传播

WASM 到浏览器是 object-code 提供，不因页面没有服务器计算而免除 AGPL 的传播规则。需要保留许可、修改声明，提供适用 combined work 的对应源码和构建材料，并安排有效获取路径；若有第 13 节规定的远程网络互动，也需按实际软件行为履行对应源码 offer。不能只检查第 13 节然后忽略第 5/6 节。[GNU AGPL 正文](https://www.gnu.org/licenses/agpl-3.0.html)

Modern C# port 明确写 AGPL-3.0 license file，独立商业授权尚未提供。Swiss 数据也有单独 license-bearing 边界。[当前 Swiss notice](https://github.com/aloistr/swisseph/blob/master/LICENSE)要求开发者在传播/公开服务之前确定适用许可，并保持原声明。此审计没有替用户确认哪一种授权已经取得。

## 已有通知和可能缺口

线上 `/engine/THIRD_PARTY_NOTICES.md` 与四个 license 文本均返回 200，内容与本地 distribution 对应：HumanDesign MIT、SwissEph AGPL、SwissEph Swiss notice、Swiss ephemeris notice。NatalEngine 和 hdkit 完整 MIT 通知已包含在 THIRD_PARTY_NOTICES。首页 footer 有公开 GitHub source link。源 snapshot 在仓库中保留，patch manifest 列出 **8 个被修改文件**。

需要补齐或确认：

* Base 0.14.0 专门 MIT notice 不在复制到 `dist/engine/licenses` 的文件集，对预期 Base 文件路径的线上 GET 返回 404。已有 prose 只描述 Base 的依赖版本，未包含其完整版权/许可通知。
* 根 LICENSE 和 package license 没有定义组合发布许可；缺少根 LICENSE 不能单独证明违法，但无法把整个网站宣称为 MIT。
* GitHub 普通 source link 存在；需要更明确地对应实际线上 object code 版本、完整源码、构建材料、NuGet 内容及 license grant。没有审核全部公开历史 refs 或用户可能持有的商业合同。
* app bundle 的 html-to-image notice，以及 .NET runtime/ICU third-party notices，未见集中的完整发行通知。需要检验版权通知是否嵌在资源、随许可页提供，及各组件实际要求。
* 原有 THIRD_PARTY_NOTICES patch prose 使用早期 `td-ohd-swiss-parity-v1`，实际 patch manifest revision 包含 true-node-light-time，建议后续同步发行身份材料。

这些是具体发布材料问题。现有源码和通知已经公开，所以证据不足以确认必须立即下线的高风险违约。它们也不足以确认当前分发完全合规。后续若确认授权或必要源码确实缺失，需要用户先选择补齐许可/源码或切换发行路线，本轮不做生产改动。

## npm、worker 与静态构建

在本地 `npm ci`、正式 static build 后进行临时 sourcemap build，共 99 个 module sources，npm 中只看到 **html-to-image** 进入该浏览器 bundle，MIT notice 应保留。所有 262 个 npm lock records 都在 inventory；optional OS binaries 与 dev/worker packages 不等于 browser runtime。

`@resvg/resvg-wasm`、better-auth、Cloudflare OAuth、MCP、字体等属于 worker/service 路径。当前 static build 不把它们送进 app JS；不能据此免除未来 worker 或本地产品发行的 LGPL/MPL/Apache/OFL 条件。lock 和本地 `@better-fetch/fetch` package metadata 缺少 license declaration，保持 NOASSERTION。

## Jovian 本地隔离

外部 source archive、DE406 两文件和 native binary 重新 SHA-256，匹配 acquisition manifest（具体见 `evidence/external-asset-hashes.json`）。实际 `sweph.c` notice 是 GPL version 2 or later / Professional，不能套用现代 AGPL 文本覆盖这个历史授权。本地编译不把它转成 MIT。`jovian-engine/native_state.c` 是自己的附加 instrumentation 候选，而原 Swiss C 保留在外部完整源码包。

本地源码 acquisition/bridge 文件已公开；外部 Swiss source/data/native 二进制没有进入 tracked repository 和此次 static build。未来集成浏览器 C/WASM、提供公开服务或分发 native package，需要新的许可 gate；Python/IPC 不是法律豁免。
