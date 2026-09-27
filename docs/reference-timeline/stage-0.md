# 阶段 0：原版基线

日期：2026-09-27。资料包：`TD-OHD_Codex_Handoff_V1_2026-09-27.zip`，SHA-256 `f9b7208de23cc3264e7686b3ee9c6ebeaaf52536c9c4eb39671d36508a5c986a`。

- 本地开发仓库 `main` 与 GitHub `main` 均为 `14ae78a8a3c086138812f7c9879acbd68c54cf86`；其文件树为 `9f76c924f6f0b9f46cd065bc565d57ad09405298`。
- 从该提交建立独立工作区 `TD-OHD-reference-timeline-v1` 和分支 `feature/reference-timeline-v1`。原开发仓库停留在干净的 `feature/knowledge-workspace`；正式本机服务仍在 `127.0.0.1:8787`，未触碰账户数据或安装目录。
- `package-lock.json` SHA-256：`7396e9ce66bb551e8fd509338a51139dcecd52822dd0e94de82ff454b5fb9b4e`。测试环境 Node.js `v26.0.0`，复用同锁文件已安装的 `node_modules`。
- 原版 `npm test`：144 项中 142 通过、2 失败。失败是 `tests/mcp.test.js` 中在线地理编码请求的 `fetch failed`，发生在本阶段改代码之前。
- 原版 `npm run build:pages` 和 `npm run check:pages-bundle` 通过。浏览器基线使用合成出生数据 `1990-06-15 14:30 UTC-6`；桌面 1380×900、手机视口 390×844，截图见 [`baseline/`](baseline/)。截图是视口模拟，不是手机实机测试。

实验分支复用判断：

| 功能 | 处理 |
|---|---|
| 资料目录、搜索、拓扑辅助函数 | 参考数据结构与交互，按原版弹窗正文重新实现；不整支合并。 |
| 原版内容适配、详情弹窗、多体系切换 | 直接保留并抽取共享正文渲染。 |
| 实验资料库独立正文、来源抽屉、顶层爻线/整合网络、课程与概念扩写 | 不移植。 |
| 观察记录、关注、A/B、固定详情卡 | 不移植；既有人物与账户存储不删除。 |

回退：此工作区从固定基线独立建立。保留该基线提交即可对照或重新建立工作区；正式安装无需回退。
