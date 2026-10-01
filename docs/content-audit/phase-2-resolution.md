# Phase 2 status：追加记录

2026-10-02；阶段 1 审计 `23a4032` 原报告保持不变。

| 问题 | 状态 | 本轮结果/保留边界 |
|---|---|---|
| LOSS-01 | resolved | 保留 raw.authority，egoManifested/egoProjected 分开；旧 family 与显示兼容 |
| LOSS-02 | resolved | 保留每中心 ActivationTypes；既有中心定义判断不变 |
| LOSS-03 | resolved | C# 输出原 ConnectedComponents，JS 保存并规范化；320 图与 bridge islands 一致，不替换时间轴算法 |
| MIX-01 | partially resolved | raw/calculation/derived 分层；Variable 知识原文搬家；旧 catalog 兼容字段仍附加 |
| DUP-01 | partially resolved | 正式 geneKeySpectrum API + 明确 fallback；两份物理资料未删除，正文待审 |
| DUP-04 | partially resolved | 主要回路、资料库、行运正式分类同用 topology；受保护的关系/团队作者启发式仍保留旧输入，未迁移 |
| 其他文案/翻译/来源问题 | deferred | 未顺手修改；老师来源仍仅预留 |

## 本轮额外记录

- 旧主要回路曾独立统计 integration；现有 topology 将其归 individual。320 图中132图统计变化。这是有效分类入口统一的结果，通道激活、天文计算与正文未改。
- 若未来统一关系/团队内部 circuitBalance 等分类，会改变其作者分析输出，需要单独授权及新基线测试。本轮未改变。
- 旧合成测试 DTO 缺 connectedComponents 时使用 componentCount=null；生产 v2 C# 输出应具有此字段，不能把缺字段视为已验证零岛。
- 类型、权威与定义敏感度仍有旧 display-name 比较入口；本轮保存更细 ID，但不扩大修改到该判断策略。后续应考虑使用 stable ID。

具体技术契约见 [chart-contract/README.md](../chart-contract/README.md)。未进入下一阶段、未推送、合并或部署。
