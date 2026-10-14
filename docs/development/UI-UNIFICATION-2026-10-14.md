# 全站 UI 统一（design/unified-ui，基于 PR #29 `3fb74af`）

预览优先阶段：只做构建与启动检查，全量回归待用户确认设计后执行。

## 审计发现的不一致
- 关闭按钮：出生图/资料库 32px 圆、Wa 阅读层手机 44px、操作弹窗被 `.operation-dialog [data-close]`/`button{min-height:44px}` 撑成 44px，Team 弹窗另有 44px 规则；关系页关闭按钮无 `aria-label`、无导航行。
- 返回按钮：各处同 class，但 Wa 阅读层把导航行改成带分割线的独立顶栏（无返回时是一条空栏），其他详情是右上角悬浮行。
- 弹窗标题：`.modal-title` 衬线 19px；Wa「已保存组织」裸 `h2`（默认 26px）；Team 用 `h3`；人物编辑用 `div`；确认框无关闭按钮。
- 页面标题：Wa `组织 · Wa` 无衬线 26px/-0.02em；关系/团队 `.view-title` 衬线 300 28px（团队 24px 覆盖）；资料库 25px。
- 关系页、知识资料详情各自手写导航 DOM，未复用 `renderDetailNavigation()`。

## 本轮实现
- 新增 `src/styles/ui-system.css`（在 `main.js` 最后导入）：`--ui-*` 尺寸 Token；页面标题（采用 Wa 标题样式）；`.modal` 标题栏；统一关闭/图标按钮（桌面 36px，手机 44px 触控）与返回胶囊；详情导航行几何与首行留白。颜色只用 Skin 语义 Token。
- `operation-dialog.js` 新增 `renderDialogHeader(title)`；Team、人物编辑、Wa 已保存/修订历史、Wa 成员选择、确认框统一使用。
- 关系页闸门/中心详情、知识详情改用 `renderDetailNavigation()`（知识详情去掉 `data-shared-back`，避免与出生图共享绑定重复触发）。
- 删除 Wa 阅读层导航、标题、手机关闭尺寸覆盖；删除 styles.css / operation-dialog.css / team-direct.css 中被取代的重复规则。
- 无新增文案（Close/Back 已有三语言）；不改计算、ID、存储。

## 验证
- `vite build` 通过；9961 dev server 无页面错误。
- 相关单测：失败 4 项与 `3fb74af` 基线一致（浅克隆缺历史提交、i18n 导航旧断言），本轮未引入新失败。
- 截图：`/workspace/ui-audit/before-*.png`、`after-*.png`（无人物数据，主要覆盖 Wa 与入口页）。
- 未验证：有人物数据时的出生图/行运/时间轴/关系/团队详情、各 Skin（暗色/高对比）逐一目检、手机阅读层。
