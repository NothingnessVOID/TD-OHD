# Phase 1B 验收修订：出生校验与多 Penta 小组

基线 `bed1f568c29c1b9c5ac366f5912b50f74e0fb1c4`；修订分支 `fix/team-phase1b-validation-grouping`。

Team v2 保存成员池与 `groups: [{pentaId,label,memberIds}]`。旧 v1 信封在读取时验证全部数据后原子写为 v2，原 memberId、personId、revision 与创建时间不变；旧组超过五人时前五人进入迁移组，余者留在成员池。团队可保存未分组成员与不足三人的草稿组；Penta 分析仅使用当前所选组的 3–5 人。出生时间未知、缺失及日期、时间、时区非法时在计算前逐个报错；合法 UTC+0 保留。

源码变更只在 `PHASE1B-REVISION-SCOPE.json` 列出的 Team 视图、仓储、样式与简繁翻译文件内。六条确切路径及冻结 SHA-256 在清单与 `validate.mjs` 内独立核对。既有 Phase 1A/1B 清单与固定摘要仍保留，修订内容只凭独立新表许可；历史知识回归例外也仅允许新表独立固定的 Team 和两份翻译文件，其他路径继续按原审计基线校验。未登记代码及字节变更必须拒绝。

本阶段不创建 Wa，也不推断分组或进入 Phase 1C SVG。团队只在当前浏览器保存人物引用与名称快照，不包含出生资料、Chart、行星结果。
