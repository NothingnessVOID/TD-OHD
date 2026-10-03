# Sharp Swiss upstream patch preparation

四项修复在 upstream 最新默认分支仍存在；没有已经由 upstream 修好的项。此目录已可供人工审核和按顺序提交 stacked PR series，尚未实际提交。

推荐顺序 **A UTC/UT1 → B frame bias → C Moon → D True Node**。每个补丁保留独立 commit。A 带公共测试工具；导出的补丁和测试使用前一项作为 parent，因此这一包按累计序列验证。若改成各自直接基于 upstream 的独立 PR，需先 rebase 并重新验证，不能直接把累计测试当作独立 PR 证据。

| PR | 天文 source files | test files | 总 files | 数值案例 | 结果 |
| --- | ---: | ---: | ---: | ---: | --- |
| A | 1 | 3 | 4 | 6 | PASS |
| B | 5 | 2 | 7 | 45 | PASS |
| C | 2 | 2 | 4 | 25 | PASS |
| D | 2 | 2 | 4 | 25 | PASS |

正确性来源是未修改 Swiss C 2.10.03，使用 hash 固定的 DE441 `.se1`。101 个 before/after 数值案例全部通过，每个修复均有可检测旧 bug 的 negative baseline 和保持相同的控制组。补丁还带 frame-bias、Moon Earth-center 和 True Node source-spy 合成保护。详细 residual 和剩余局限见各 PR 文件及 JSON；没有 Gate、Profile、Human Design 或产品逻辑。

未 fork upstream，未 push upstream，未创建 issue、PR 或评论。仅此 TD 准备分支会 push 到 TD origin。标准 patch 的作者 header 已使用通用 contributor 占位信息，人工提交时可按实际作者署名。

## 复现

需要 Git、Python 3、.NET 10 SDK、可加载的原版 Swiss C 2.10.03 shared library，以及上述 JSON SHA 对应的 DE441 `sepl_18.se1` / `semo_18.se1`。二进制和星历不在补丁中。原版 C 可按以下方式编译：

```sh
git clone https://github.com/aloistr/swisseph.git swiss-c
cd swiss-c
git checkout 175e1fcb3108bcd5c0d146c803f51dcf23508012
cc -O2 -fPIC -shared -o libswisseph.so sweph.c swephlib.c swedate.c swehouse.c swecl.c swejpl.c swemmoon.c swemplan.c swehel.c -lm
```

macOS 可将 `-shared` 改为 `-dynamiclib` 并输出 `.dylib`。验证工具拒绝 source fallback。设定 `SWISS_C_LIBRARY`、`SWISS_EPHE_PATH`、可选 `DOTNET` 为本地工具/数据路径，不需要仓库内写死路径。

```sh
git clone https://github.com/CReizner/SharpAstrology.SwissEph.git sharp-swiss
cd sharp-swiss
git checkout -b review/swiss-c-parity 342a57997c1b987e7949acc98897c8b73d05939a
git am "$PR_PACK"/000*.patch
```

按四个 PR 文档中的命令执行验证。脚本从指定 commit 的 archive 建立临时 source 和独立 harness，运行 before/after 并检查 oracle、时间 round-trip、exact vector controls 和 after synthetic guards。库项目不添加 test Compile glob 或强制 TD dependency versions。

`commit-map.json` 保存本地原始 commit SHA；经 `git am` 后 committer 信息变化可能产生新 SHA，验证时将 `--before/--after` 换为本地对应 parent/commit（A: HEAD~4/HEAD~3，B: HEAD~3/HEAD~2，C: HEAD~2/HEAD~1，D: HEAD~1/HEAD）。

## 范围限制

此包验证 Swiss DE441 geocentric 数值及 synthetic source/observer guards；没有宣称完整 JPL kernel、真实 topocentric velocity、SPEED3 或整个 upstream API 达到零残差。已知普通行星微小剩余差异、topocentric observer velocity 与 SPEED3 策略都留在现有边界内。没有改生产引擎或根许可证。
