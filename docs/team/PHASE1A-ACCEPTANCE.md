# Penta Phase 1A 验收补丁记录

基线：`d2abe43c39a6ae3f04c74a6747cb1174d0388052`；只修发布源码审阅门禁和本机 .NET 环境。阶段 0 文档、Phase 1A 三个核心模块、历史 main / Knowledge / Skin / 天文审阅范围和业务 UI 均未修改。

## 审阅依据与范围

Phase 1A 的三份源码由固定的官方 Penta 十二门六通道目录、完整 Sharp Chart Contract 的 P/D 行星来源提取、以及 3–5 人的客观结构覆盖组成。它们在 `PHASE1A-CONTRACT.md` 中逐项规定，`tests/penta-catalog.test.js`、`tests/team-activation.test.js`、`tests/penta-structure.test.js` 针对目录、13＋13 条匿名 Sharp 原始快照适配结果、来源保真、四种通道状态和错误边界验证。审阅对象仅限：

| 路径 | SHA-256 |
|---|---|
| `src/lib/human-design/penta-catalog.js` | `91a6df5319e9bb790a20b517220f4831d9ed9b04267184e4e85bb5ae8f4774fc` |
| `src/lib/human-design/team-activation.js` | `84d48728136abd62b7ca4fb07dad6eca0c24de70ce01c43eafad3f9ffc0dc34c` |
| `src/lib/human-design/penta-structure.js` | `f6f3d722f8c11454bd2864ccf6eb1d56b3e687031e17d75762c73a3987ed15ad` |

`PHASE1A-SOURCE-SCOPE.json` 保存基线和上述精确路径、哈希；`docs/frontend-knowledge-sync-v1/validate.mjs` 内有一份独立固定的三个摘要，并对照基线提交中的原始文件字节。必须同时符合清单、固定摘要和实际文件；添加第四份源码、更改三份文件任意一份、单独改清单均不能通过。历史 `expectedMergedSource`、Skin、天文等保护顺序和原有哈希没有调整。

负向测试在临时目录中模拟未登记的 `src/` 文件、逐个篡改已登记源码、向范围清单添加第四个文件或更改哈希，断言都拒绝；正向测试核对三份提交原件以及原发布校验整体通过。此审阅记录只证明源码范围被固定及相应测试已运行，不为 Penta 技能映射或组织解释背书。

## 环境与验证

两个工程均为 `net10.0`。原 PATH 未包含 dotnet，本机 `~/.dotnet` 有旧使用标记但没有可执行文件；通过微软官方 `dotnet-install.sh` 将 arm64 SDK `10.0.401` 安装于 `/Users/abyssldx/.dotnet`，运行命令前临时在 PATH 前置该目录，未修改仓库构建配置或全局 PATH。

按顺序执行：

1. `npm run build`：成功；SharpAstrology WASM、两份已验证 Swiss 星历及 Vite 打包完成。
2. `npm test`：409 项，406 通过，0 失败，3 跳过。
3. Phase 1A 独立测试（包括发布门禁正反向）：15 项，15 通过，0 失败，0 跳过。原发布校验与新门禁单独组合运行 9 项，9 通过。

剩余失败：无。3 项跳过属于全量套件原有的跳过项目，不作为已执行通过。Phase 1B 尚未启动；旧 Team 页仍使用旧接口。
