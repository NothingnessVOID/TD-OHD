# Frontend runtime E2E 对照证据

## 对照环境

- PR 工作区：`fix/connection-structure-phase1`，`HEAD 9a90b53`，Vite `http://127.0.0.1:5241`
- main：`origin/main`，`a5485015f23ef31ca8227df2a2eaf2290a08e266`，独立 worktree `TD-OHD-main-runtime-check`，Vite `http://127.0.0.1:5242`
- 两侧共用同一 `node_modules`、PR 工作区构建的 `public/engine` 资产、已安装 Chrome；调用均为 `CHROME_CHANNEL=chrome E2E_URL=... node tests/frontend-runtime-e2e.mjs`。

## 结果

恢复 PR 引擎资产后，使用未修改的原始 `tests/frontend-runtime-e2e.mjs` 分别执行：

- PR 5241：通过，输出 `Runtime restore, Chinese default, language persistence, no sync requests, Connection/Team autosave passed.`
- latest main 5242：通过，输出相同信息。

main 与 PR 的原脚本在 line 47–50 的重复计算检查相同：安装 `MutationObserver`，再次点击 `#conn-calculate`，等待 `window.saves > 0`，随后断言人物仍唯一。当前共同测试环境没有复现 line 49 超时，因此不能确认原先推测的原因是第二次提交仍选择已保存人物、导致手动表单无输入。

## 无效运行记录

早期对照错误使用旧 main `bc9b217`，并且 main worktree 的引擎资源映射没有就绪，脚本在启动阶段等待 `#chart-view` 超时，不能作为 line 49 证据。另一次 PR 启动阶段超时发生在我误删其 `public/engine` 构建产物之后，同样无效。随后已用指定 dotnet 可执行文件重建 PR 引擎，确认 `public/engine/_framework/dotnet.js` 存在且 5241 返回 200；main `public/engine` 仅以 symlink 指向该资产目录。两侧原脚本的有效复测均通过。

我曾短暂尝试修改第二次点击前的表单选择步骤，但已撤销；`tests/frontend-runtime-e2e.mjs` 当前与 PR 原始 HEAD 一致。没有改动人物 autosave 逻辑、超时或断言。