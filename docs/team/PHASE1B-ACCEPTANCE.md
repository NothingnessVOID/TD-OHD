# Penta Phase 1B 源码范围验收记录

## 范围与门禁

Phase 1B 的独立源码范围限定为以下六个文件，精确 SHA-256 同时固定在 `PHASE1B-SOURCE-SCOPE.json` 与发布校验脚本中：

- `src/views/team.js`
- `src/lib/human-design/team-members.js`
- `src/lib/team-repository.js`
- `src/styles/team-members.css`
- `src/locales/zh-CN/ui-views.json`
- `src/locales/zh-Hant/ui-views.json`

门禁核对清单版本、完整路径集合、脚本内独立摘要和文件当前字节；其余未登记的新增或修改源码会被拒绝。清单单独扩展或改写摘要无法放行源码。原 Phase 1A 固定路径、摘要与基线提交保护保留；1B 六条路径仅穿过旧附加范围枚举，仍由 1B 独立门禁验证。

## 当前状态

六个源码文件已冻结并完成摘要刷新。`PHASE1B-SOURCE-SCOPE.json` 与发布校验脚本中的固定摘要对应同一组文件字节；清单 baseline 记录冻结时所在的完整 HEAD 提交号 `56e9419185d6c7e2edf02278fe208ee7e6443a03`。

## 测试覆盖

`tests/penta-phase1b-source-scope.test.js` 覆盖登记范围接受、未登记源拒绝、六个源码逐一篡改拒绝，以及清单路径/摘要被改写时拒绝。测试在临时目录副本上执行，不需修改并行协作源码。
