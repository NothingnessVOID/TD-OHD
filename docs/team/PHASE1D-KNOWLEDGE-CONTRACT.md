# Phase 1D｜Penta 与 Knowledge Layer 接入契约（设计稿）

本阶段只制定契约，不改源码、公开 API 或历史审计。依据 [来源登记](PHASE1D-SOURCE-REGISTER.md) 与 [证据矩阵](PHASE1D-EVIDENCE-MATRIX.md)，所有拟入库文字先区分结构事实、体系定性解读与尚无判据的建议。当前 Knowledge Layer 已有稳定身份、独立 summary/detail 槽和逐槽来源版本，见 R2。

## 身份与查询

未来增量优先沿用 `domain:'human-design'`，提出新的 `objectType:'penta'`，而非启用已 deprecated 的 extension domain。建议 `objectId`：`introduction`（共用介绍）、`gate:31` 等十二门、`channel:7-31` 等六通道；稳定 ID 使用 `hd.penta.introduction`、`hd.penta.gate.31`、`hd.penta.channel.7-31`。门号与 channelId 来自 R1；`channelId` 的数字升序与展示门序分离。身份示例**尚不可直接调用**，因为 `schema.js` 的 `OBJECT_TYPES` 尚无 `penta`，`foundationRecords` 也未注册。

不将团队实例（成员姓名、生辰、成员 ID、分析结果）作为静态 Knowledge Entry；由 Team 的计算状态向详情 renderer 提供上下文。不要为每一种小组组合或缺门情况生成固定知识条目。

## 入库字段与状态分层

| 层 | 推荐内容与来源 | 条件 / 状态 |
| --- | --- | --- |
| identity/name | 稳定门号与通道拓扑（R1，与 J1、B2 核对） | 结构命题 `verified`；译名另行审校，不把课程标题当完整定义 |
| properties | gate、row、column、center、channelId、端点与层级；只复用 R1 固定拓扑 | 不写 `canPerformRole`、`functional`、`isGap` 等未经证实字段 |
| summary | 共用的简短 Penta 范围与家庭/商业语境（J1、B1）；具体门若仅有标题则保持缺失 | 有正文审核和逐句来源后才能设为 `reviewed`；目录标题不能充当 Summary |
| detail | 经核对的实际可见正文所支持的机制、明确标注第三方解释与适用边界 | J5 目录及未见页码不生成 Detail；没有合格正文时 `null` |
| provenance | 每个字段/文字槽携 sourceId、URL、具体段落/页码、访问日期、版本和复核人 | 分开登记官方/第三方、网页正文/课程标题/目录/样章正文；仅登记实际读到的证据范围 |
| evidenceStatus（新增设计层） | `verified` / `inferred` / `missing`，对应**具体命题**及 source IDs | 不塞入当前 `reviewStatus`：该枚举只有 `unreviewed/reviewed/verified/custom`，且表示编辑审核，不表示证据推理等级 |

例如第三方 T3 的门 31 → Administration 可作为 `inferred` 的单独候选命题储备，不能因为 B1 官方列了 Administration、B2 官方列了 7–31 就升级成官方逐门映射。家庭标签 T2 与企业标签 B1/T3 的出处分别保存；不得共用一个不带语境的解释槽。

## 读取与展示（后续实施前需评审）

1. 新条目需先注册 source ID、schema 身份和知识记录，再为三语准备经人工审核的文字。`getKnowledgeSummary(query)` 只读 Summary，`getKnowledgeDetail(query)` 只读 Detail；缺失返回 `null`。`getKnowledgeEntry(query)` 的 `hasSummary/hasDetail` 和状态应真实反映槽位，无摘要与详情互相回退。
2. Team 展示现有 R1 的 `present/absent` 门覆盖和 `absent/selfComplete/crossMemberOnly/both` 通道结构；详情点击可以用稳定 ID 查知识，但未知对象、未写的正文保持 `missing`。界面不能将 `missingGates` 字段命名为官方 Gap，也不能将 `coveredChannelCount` 文案写作“功能完整度”。
3. `inferred` 候选若未来显示，需明确“第三方解释／待原始材料核实”并给出处。不得将结构覆盖推成现实中的岗位胜任、团队绩效、招募建议。原有成员出生资料与结构计算不传入静态注册表。
4. 任何未来知识迁移须单独扩展 `schema.js` 的 `OBJECT_TYPES`、`sources.js` 来源白名单、注册 records、三语内容与读取验证；保留现有 `domain:'human-design'`、独立槽协议和老条目行为。这些是**后续建议**，本轮未执行。

## 进入实施阶段的验收门槛

核实每条命题的来源与范围，区分正文、目录、课程大纲；按十二门六通道逐项核对身份唯一性；验证缺槽 `null`、来源白名单、三语身份一致、摘要不会读取详情；Team 结构状态与知识内容隔离。Gap 公式、functional 判据、成员岗位在获得足够材料并形成可复核规则以前保持待决。
