# Penta Phase 1A：结构计算契约

基线：`feature/team-phase0-audit`（阶段 0 报告 `PHASE0-AUDIT.md`）；独立 1A 计算层，不接旧 Team 页、不改变出生计算。依据是阶段 0 官方 Penta 配图；不加入商业技能、能力、领导或关系解释。

## 调用

```js
import { analyzePentaStructure } from '../../src/lib/human-design/penta-structure.js';
import { extractTeamActivations, TeamStructureError } from '../../src/lib/human-design/team-activation.js';

const result = analyzePentaStructure([
  { memberId: 'team-member-a', personId: 'people-id-a', displayName: 'A', chart: sharpChartA },
  { memberId: 'team-member-b', personId: null, displayName: 'B', chart: sharpChartB },
  { memberId: 'team-member-c', displayName: 'B', chart: sharpChartC }
]);
```

`memberId` 必须是非空唯一字符串；模块不生成或保存它。`displayName` 和 `personId` 不参与计算，可重名、可同生日；Phase 1B 建立跨次稳定的团队成员与人物关联。`chart` 为现有 `adaptSharpChart()` 生成的 Sharp Chart Contract，`gates.personality` 和 `gates.design` 各含 13 个行星键：`sun, earth, northNode, southNode, moon, mercury, uranus, venus, mars, neptune, saturn, jupiter, pluto`。单侧缺项或非法 gate/line 会拒绝计算。每个行星的 `planet` 字段如存在必须与键一致；未知额外行星键亦报错。`gates.all` 不参与提取或修复。提取输出按成员 ID、人格在前、设计在后、上述行星顺序排序；单独调用 `extractTeamActivations(member)` 返回该成员的 26 条记录。

## 返回结构

结果固定 `modelVersion: 'penta-structure-v1'`、`scope: 'penta'`、`memberCount`、`gates[12]`、`channels[6]` 与 `summary`。目录只在 `penta-catalog.js` 定义，冻结数组及其元素。矩阵按行优先输出：`31,8,33 / 7,1,13 / 15,2,46 / 5,14,29`，`row`、`column` 为 **0 起始**，中心为 `throat/g/g/sacral`。六条通道按该目录固定显示顺序，`gates` 为**自上向下**，`channelId` 为数值升序规范 ID：`7-31,1-8,13-33,5-15,2-14,29-46`。目录包含两端 `endpoints` 位置、`centers` 与 `displayOrder`；结果中通道只带结构字段，无未经证实的技能标签。

每个 `GateCell`：`gate,row,column,center,status,memberIds,activations,activationCount,contributorCount`。`status` 是 `present|absent`；缺门仍返回 cell，计数为 0。`memberIds` 去重排序，`activations` 保留每条 `{memberId,side,planet,gate,line}`，`activationCount` 数原始激活记录、`contributorCount` 数不同成员，门出现只按是否有记录。

每个 `ChannelCoverage`：`channelId,gates,holdersByGate,missingGates,selfCompleteMemberIds,complementaryMemberPairs,status`。`holdersByGate` 的键为门号，值为该端去重排序的成员 ID。`missingGates` 是没有任何成员激活的端点门号，遵循自上向下顺序。`complementaryMemberPairs` 是每个有效**端点分配**一次 `{upperMemberId,lowerMemberId}`，必须不同人，按 ID 排序；若 A、B 各自都有两门，`A上/B下` 和 `B上/A下` 是两个不同端点分配，故都记录。多行星落同门不产生重复配对。

| status | 判定 | 示例（31–7） |
|---|---|---|
| `absent` | 有至少一个端点无成员携带 | 只有 A 有 31，`missingGates:[7]` |
| `selfComplete` | 至少一人自有两门，没有不同人跨端点分配 | A 有 31、7；其他人都无这两门 |
| `crossMemberOnly` | 两端有人、没有单人同时有两门，存在跨人配对 | A 有 31，B 有 7 |
| `both` | 有自有完整通道，也有跨人端点配对 | A 有 31、7，B 有 31 |

`summary` 是 `{presentGateCount,coveredChannelCount,pentaActivationCount,totalActivationCount}`。最后一项统计所有成员 26 条记录，前一项只数 12 个 Penta 门中的激活。**覆盖仅是闸门结构事实**。模块不推断胜任力、角色、团队 Type、组织效能或 Alpha。

以 3 名成员 A（31、7）、B（31）、C（无对应门）为例，31–7 一条的局部输出是：

```json
{
  "channelId":"7-31", "gates":[31,7],
  "holdersByGate":{"7":["A"],"31":["A","B"]},
  "missingGates":[], "selfCompleteMemberIds":["A"],
  "complementaryMemberPairs":[{"upperMemberId":"B","lowerMemberId":"A"}],
  "status":"both"
}
```

## 错误与稳定性

错误是 `TeamStructureError extends Error`，具 `name,code,memberId,path,message`。成员错误精确指出 `chart.gates.personality.sun.gate` 等路径。无有效 ID：`INVALID_MEMBER_ID`；ID 重复：`DUPLICATE_MEMBER_ID`；非数组：`INVALID_MEMBERS`；2 人及以下或 6 人及以上：`PENTA_MEMBER_COUNT`（不会改算 Wa）；无 chart：`INVALID_CHART`；无 gates 容器：`INVALID_GATES`；缺侧：`MISSING_SIDE`；缺/非法行星记录：`MISSING_ACTIVATION`；越界/非整数：`INVALID_GATE`、`INVALID_LINE`；键与记录行星不符：`INVALID_PLANET`；额外未知键：`UNKNOWN_PLANET`。任意成员数据不完整则抛错，不返回部分团队结果。

成员输入顺序不影响结果字节意义：cell 和 channel 固定目录顺序、成员 ID 字典序、P/D 和行星按固定顺序；不会修改输入对象。ASCII/Unicode ID 按 JS 字符串序比较，只用于确定性，不表示人物优先级。

## 与阶段 0 和后续阶段对接

对应阶段 0 的三层：目录的门与连线来自官方图；激活及覆盖属于直接计算事实；矩阵坐标/显示顺序属于产品设计。旧 `penta.js` 和 `team.js` 继续原有调用，1A 没有引用其计算结果。1B 应提供稳定 `memberId` 和 `personId`、校验已存人与临时成员的生命周期、向上述接口传真实 Sharp Chart Contract、将错误转为可理解的成员提示；1C 再接入十二格 SVG 和六边。旧团队类型/九中心角色/招聘建议不得直接迁移。

测试基准为已有匿名 `tests/fixtures/sharp-definition-components.json`（SharpAstrology 原始快照），经现有 `adaptSharpChart()` 适配，核对人格/设计各 13 条、门/爻线及结构结果；其余最小合成成员也严格提供完整 13＋13 结构，绝不使用 `gates.all` 伪装出生图。现阶段未直接链接实时原生 Sharp 引擎，原生构建和全量测试结果以本次提交记录为准。
