# 组织页商业解读 · 四十闸门正文与来源（维护记录）

日期：2026-11-15
适用分支：`feature/member-business-analysis`
性质：维护记录。页面不展示来源，不提供官方／通俗／原典对照。

## 1. 交付与授权

组织页原有 12 个 Penta 整合闸门与 12 个旧组织闸门正文，其余 40 个闸门此前静默回退全站普通人类图闸门资料。用户授权补齐这 40 个闸门的商业解读，并把详情栏目统一命名为商业解读／商業解讀／Business reading。

- 简中 `role` / `intro` / `application` 由毛毛撰写并交付，主代理已逐条读过并对 40 条、49 个来源做过覆盖与引用核对；项目侧不自行改词。
- 繁中与英文由独立翻译任务在外部文件完成后交付，项目侧逐条比对简中，未重写内容。
- 交付原件在工作室知识库（不进 Git）：`TD-OHD/组织页40闸门商业解读-毛毛-20261115.json`、同名 `.md`（来源说明）、`TD-OHD/组织页40闸门商业解读-20261115-locales.json`（三语）。

## 2. 运行时结构

| 位置 | 作用 |
|------|------|
| `src/lib/wa/org-reading-content.zh-CN.js` 等三份 | 原有 32 条通道 + 12 个 Penta 闸门正文，本轮未改 |
| `src/lib/wa/org-reading-content.gates40.zh-CN.js` 等三份 | 新增的四十个闸门正文，按语言各一份，逐条 `role` / `intro` / `application` |
| `src/lib/wa/org-reading-content.js` | 唯一合并点：两份闸门表在 `indexSource` 之前合并，因此 64 个闸门走同一个规范化与读取接口 |

- 合并顺序：既有闸门优先。四十条若与 Penta 十二条重叠，旧正文保留、新行忽略，避免任何一次合并改写已验收措辞。测试断言两表交集为空。
- 合并结果：每个语言 52 条整合闸门 + 12 个仅有旧组织正文的闸门 = 64。
- `readOrgGateBody(gate, locale)` 签名不变；`orgGateName` 仍按旧组织角色 → 整合 role → 统一闸门词汇排序，十二部门闸门 (21/45/25/51/2/14/59/6/50/27/60/3) 与人事 44/26 的名称不受影响。
- 规范化只保留 `role` / `intro` / `application`（通道另含 `organizationRole`）。`sourceRefs`、`editorialBasis`、`channelId`、`departmentId` 只存在于本记录，运行时不加载外部路径，也不进入 DOM。
- 组织页不再回退全站 `GATE_DESCRIPTIONS`：`renderOrgGateReading` 只读商业正文；若某个已在目录内的闸门暂无商业条目，显示待整理短提示「该闸门的商业解读正在整理。」，不借用普通人类图正文冒充商业内容。普通出生图、参考页与统一词汇的 `GATE_DESCRIPTIONS` 未改。

## 3. 正文口径与边界

1. `intro`：依据公开的一般闸门资料（Get Human Design 各闸门页、Human Design HD 64 Gates 索引）与站内普通闸门资料自写整合，说明所在中心、主要机制与配对闸门。
2. `application`：作者按组织协作情境撰写的商业用法，不是 OC16 官方逐闸门定义，也不是 BG5BI OC16 Role 表的原词。
3. `role`：2–5 字商业简称，参考第三方 BG5 商业命名方向与既有闸门关键词，不宣称是官方 OC16 职位或表格原词。页面把它作为该闸门的商业角色显示，不改写旧部门闸门角色。
4. 格式化能量 9 / 52 / 42 / 53 的表述依据本地 BG5 教材 OC16 章节；42-53「推向成熟与变现」取自教材原句。
5. 不写的内容：未取得资料处的原典定义、固定部门岗位、成功保证、人格评判、数值评分与一票排除规则。
6. 这四十条只属于组织页商业语境，不并入 `content-data.json`、普通闸门词汇或 Penta 目录。

## 4. 四十闸门 → 来源映射

通道与部门归属取自 `src/lib/wa/oc16-catalog.js`，与交付表中的 `channelId` / `departmentId` 逐条核对一致。

| 闸门 | role | 通道 | 部门 | sourceRefs |
|------|------|------|------|------------|
| 4 | 解答公式 | 4-63 | 逻辑（logic） | ghd-gate-4, hdhd-gates, local-site-gates, local-oc16-catalog |
| 9 | 专注执行 | 9-52 | 逻辑（logic） | ghd-gate-9, hdhd-gates, local-site-gates, local-oc16-catalog, local-bg5-textbook |
| 10 | 行事准则 | 10-34 | 竞争（competition） | ghd-gate-10, hdhd-gates, local-site-gates, local-oc16-catalog |
| 11 | 构想引擎 | 11-56 | 互动（interaction） | ghd-gate-11, hdhd-gates, local-site-gates, local-oc16-catalog |
| 12 | 表达时机 | 12-22 | 创新（innovation） | ghd-gate-12, hdhd-gates, local-site-gates, local-oc16-catalog |
| 16 | 技能打磨 | 16-48 | 逻辑（logic） | ghd-gate-16, hdhd-gates, local-site-gates, local-oc16-catalog |
| 17 | 观点框架 | 17-62 | 逻辑（logic） | ghd-gate-17, hdhd-gates, local-site-gates, local-oc16-catalog |
| 18 | 纠错改良 | 18-58 | 逻辑（logic） | ghd-gate-18, hdhd-gates, local-site-gates, local-oc16-catalog |
| 19 | 需求感知 | 19-49 | 管理（management） | ghd-gate-19, hdhd-gates, local-site-gates, local-oc16-catalog |
| 20 | 即时表达 | 20-57 | 创新（innovation） | ghd-gate-20, hdhd-gates, local-site-gates, local-oc16-catalog |
| 22 | 社交风度 | 12-22 | 创新（innovation） | ghd-gate-22, hdhd-gates, local-site-gates, local-oc16-catalog |
| 23 | 化繁为简 | 23-43 | 方向（direction） | ghd-gate-23, hdhd-gates, local-site-gates, local-oc16-catalog |
| 24 | 反复推敲 | 24-61 | 方向（direction） | ghd-gate-24, hdhd-gates, local-site-gates, local-oc16-catalog |
| 28 | 风险承担 | 28-38 | 创新（innovation） | ghd-gate-28, hdhd-gates, local-site-gates, local-oc16-catalog |
| 30 | 渴望驱动 | 30-41 | 互动（interaction） | ghd-gate-30, hdhd-gates, local-site-gates, local-oc16-catalog |
| 32 | 持续评估 | 32-54 | 管理（management） | ghd-gate-32, hdhd-gates, local-site-gates, local-oc16-catalog |
| 34 | 行动力 | 10-34 | 竞争（competition） | ghd-gate-34, hdhd-gates, local-site-gates, local-oc16-catalog |
| 35 | 经验推进 | 35-36 | 互动（interaction） | ghd-gate-35, hdhd-gates, local-site-gates, local-oc16-catalog |
| 36 | 危机经历 | 35-36 | 互动（interaction） | ghd-gate-36, hdhd-gates, local-site-gates, local-oc16-catalog |
| 37 | 情感纽带 | 37-40 | 管理（management） | ghd-gate-37, hdhd-gates, local-site-gates, local-oc16-catalog |
| 38 | 坚持立场 | 28-38 | 创新（innovation） | ghd-gate-38, hdhd-gates, local-site-gates, local-oc16-catalog |
| 39 | 激发投入 | 39-55 | 创新（innovation） | ghd-gate-39, hdhd-gates, local-site-gates, local-oc16-catalog |
| 40 | 付出与休整 | 37-40 | 管理（management） | ghd-gate-40, hdhd-gates, local-site-gates, local-oc16-catalog |
| 41 | 想象起点 | 30-41 | 互动（interaction） | ghd-gate-41, hdhd-gates, local-site-gates, local-oc16-catalog |
| 42 | 完成周期 | 42-53 | 互动（interaction） | ghd-gate-42, hdhd-gates, local-site-gates, local-oc16-catalog, local-bg5-textbook |
| 43 | 突破洞见 | 23-43 | 方向（direction） | ghd-gate-43, hdhd-gates, local-site-gates, local-oc16-catalog |
| 47 | 经验领悟 | 47-64 | 互动（interaction） | ghd-gate-47, hdhd-gates, local-site-gates, local-oc16-catalog |
| 48 | 专业深度 | 16-48 | 逻辑（logic） | ghd-gate-48, hdhd-gates, local-site-gates, local-oc16-catalog |
| 49 | 原则把关 | 19-49 | 管理（management） | ghd-gate-49, hdhd-gates, local-site-gates, local-oc16-catalog |
| 52 | 静定 | 9-52 | 逻辑（logic） | ghd-gate-52, hdhd-gates, local-site-gates, local-oc16-catalog, local-bg5-textbook |
| 53 | 开启新局 | 42-53 | 互动（interaction） | ghd-gate-53, hdhd-gates, local-site-gates, local-oc16-catalog, local-bg5-textbook |
| 54 | 上进驱动 | 32-54 | 管理（management） | ghd-gate-54, hdhd-gates, local-site-gates, local-oc16-catalog, hdb-gates |
| 55 | 情绪感染 | 39-55 | 创新（innovation） | ghd-gate-55, hdhd-gates, local-site-gates, local-oc16-catalog |
| 56 | 故事讲述 | 11-56 | 互动（interaction） | ghd-gate-56, hdhd-gates, local-site-gates, local-oc16-catalog |
| 57 | 直觉判断 | 20-57 | 创新（innovation） | ghd-gate-57, hdhd-gates, local-site-gates, local-oc16-catalog |
| 58 | 改进活力 | 18-58 | 逻辑（logic） | ghd-gate-58, hdhd-gates, local-site-gates, local-oc16-catalog |
| 61 | 探究本质 | 24-61 | 方向（direction） | ghd-gate-61, hdhd-gates, local-site-gates, local-oc16-catalog |
| 62 | 精确细节 | 17-62 | 逻辑（logic） | ghd-gate-62, hdhd-gates, local-site-gates, local-oc16-catalog |
| 63 | 质疑检验 | 4-63 | 逻辑（logic） | ghd-gate-63, hdhd-gates, local-site-gates, local-oc16-catalog |
| 64 | 过往梳理 | 47-64 | 互动（interaction） | ghd-gate-64, hdhd-gates, local-site-gates, local-oc16-catalog |

## 5. 来源清单（49）

### 5.1 公开来源（46）

| id | 标题 | 发布方 | 类型 | URL |
|----|------|--------|------|-----|
| `ghd-gate-4` | 人類圖：4號閘門：公式化（蒙） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-4-formulization/ |
| `ghd-gate-9` | 人類圖：9號閘門：專注（小畜） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-9-focus/ |
| `ghd-gate-10` | 人類圖：10號閘門：自我行為（履） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-10-behavior-of-self/ |
| `ghd-gate-11` | 人類圖：11號閘門：新想法（泰） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-11-ideas/ |
| `ghd-gate-12` | 人類圖：12號閘門：謹慎（否） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-12-caution/ |
| `ghd-gate-16` | 人類圖：16號閘門：技能（豫） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-16-skills/ |
| `ghd-gate-17` | 人類圖：17號閘門：意見（隨） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-17-opinions/ |
| `ghd-gate-18` | 人類圖：18號閘門：糾正（蠱） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-18-correction/ |
| `ghd-gate-19` | 人類圖：19號閘門：想要（臨） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-19-wanting/ |
| `ghd-gate-20` | 人類圖：20號閘門：當下（觀） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-20-now/ |
| `ghd-gate-22` | 人類圖：22號閘門：開放（賁） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-22-openness/ |
| `ghd-gate-23` | 人類圖：23號閘門：同化（剝） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-23-assimilation/ |
| `ghd-gate-24` | 人類圖：24號閘門：合理化（復） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-24-rationalizing/ |
| `ghd-gate-28` | 人類圖：28號閘門：玩家（大過） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-28-game-player/ |
| `ghd-gate-30` | 人類圖：30號閘門：感覺（離） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-30-recognition-of-feelings/ |
| `ghd-gate-32` | 人類圖：32號閘門：持續（恆） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-32-continuity/ |
| `ghd-gate-34` | 人類圖：34號閘門：強大（大壯） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-34-might/ |
| `ghd-gate-35` | 人類圖：35號閘門：改變（晉） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-35-change/ |
| `ghd-gate-36` | 人類圖：36號閘門：危機（明夷） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-36-crisis/ |
| `ghd-gate-37` | 人類圖：37號閘門：友誼（家人） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-37-friendship/ |
| `ghd-gate-38` | 人類圖：38號閘門：戰士（睽） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-38-fighter/ |
| `ghd-gate-39` | 人類圖：39號閘門：挑釁者（蹇） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-39-provocateur/ |
| `ghd-gate-40` | 人類圖：40號閘門：獨處（解） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-40-aloneness/ |
| `ghd-gate-41` | 人類圖：41號閘門：收縮（損） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-41-contraction/ |
| `ghd-gate-42` | 人類圖：42號閘門：成長（益） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-42-growth/ |
| `ghd-gate-43` | 人類圖：43號閘門：洞見（夬） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-43-insight/ |
| `ghd-gate-47` | 人類圖：47號閘門：領悟（困） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-47-realizing/ |
| `ghd-gate-48` | 人類圖：48號閘門：深度（井） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-48-depth/ |
| `ghd-gate-49` | 人類圖：49號閘門：拒絕（革） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-49-rejection/ |
| `ghd-gate-52` | 人類圖：52號閘門：靜止（艮） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-52-inaction/ |
| `ghd-gate-53` | 人類圖：53號閘門：開始（漸） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-53-beginnings/ |
| `ghd-gate-54` | 人類圖：54號閘門：野心（歸妹） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-54-ambition/ |
| `ghd-gate-55` | 人類圖：55號閘門：精神（豐） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-55-spirit/ |
| `ghd-gate-56` | 人類圖：56號閘門：刺激（旅） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-56-stimulation/ |
| `ghd-gate-57` | 人類圖：57號閘門：直覺（巽） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-57-intuition/ |
| `ghd-gate-58` | 人類圖：58號閘門：活力（兌） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-58-aliveness/ |
| `ghd-gate-61` | 人類圖：61號閘門：神秘（中孚） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-61-mystery/ |
| `ghd-gate-62` | 人類圖：62號閘門：細節（小過） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-62-detail/ |
| `ghd-gate-63` | 人類圖：63號閘門：懷疑（既濟） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-63-doubt/ |
| `ghd-gate-64` | 人類圖：64號閘門：困惑（未濟） | Get Human Design (gethumandesign.com) | 二手 · general-gate | https://www.gethumandesign.com/zh/docs/gates/gate-64-confusion/ |
| `hdhd-gates` | Human Design Gates | Human Design HD | 二手 · general-gate | https://humandesignhd.com/pages/human-design-gates |
| `hdb-gates` | The 64 Gates, Read for Work | Human Design Business | 二手 · bg5 | https://www.humandesignbusiness.com/gates |
| `bg5bi-toolkit` | BG5 Career Design Full Analysis Toolkit | BG5 Business Institute | 一手 · bg5 | https://bg5businessinstitute.com/digital-products/133/bg5-career-design-full-analysis-toolkit |
| `bg5bi-oc16-cert` | OC16 Large Business Consultant Certification | BG5 Business Institute | 一手 · oc16 | https://bg5businessinstitute.com/education-curriculum/oc16-certification |
| `bg5bi-large-group` | Unlocking the Power of Large Group Dynamics | BG5 Business Institute | 一手 · oc16 | https://bg5businessinstitute.com/resources/264/unlocking-the-power-of-large-group-dynamics |
| `jovian-penta-wa` | Penta & Wa | Jovian Archive | 一手 · oc16 | https://jovianarchive.com/collections/penta-wa |

逐门通用闸门页（`ghd-gate-<n>`）各对应一个 gethumandesign.com 闸门页；`hdhd-gates` 为 Human Design HD 的 64 Gates 索引页，用于交叉核对每门 gift / challenge 摘要。

### 5.2 本地只读资料（3）

| id | 名称 | 范围 | 知识库相对位置／项目文件 | 用途 |
|----|------|------|--------------------------|------|
| `local-bg5-textbook` | 人类图BG5（教材 Markdown 版） | course | 天道人类图/20_内部资料/三一人类图/03_教材/Markdown版/人类图BG5.md | 只读；OC16 六部门通道表、格式化能量 9-52 / 42-53 说明、36 种商业优势条目 |
| `local-site-gates` | 网站现有普通闸门资料（简中） | general-gate | src/locales/zh-CN/gates.json | 只读；与站内一般闸门口径对齐 |
| `local-oc16-catalog` | OC16 部门与通道目录 | oc16 | src/lib/wa/oc16-catalog.js | 通道与部门归属唯一依据（feature/member-business-analysis HEAD 1a290c32，node 读取） |

本地资料只读引用，不改课程原件，不把原件内容复制进运行时源码。

## 6. 未取得与不可声称

- BG5BI 的「Updated OC16 Spreadsheet including the OC16 Role of each Trait」属于付费认证课程内容，本次未取得；任何一条 `role` 都不是该表原词，也不得在页面或文案中被称为官方 OC16 角色表。
- Jovian Archive 的 Penta / Wa 课程正文为付费内容，未取得逐闸门定义。
- 第三方 BG5 商业命名页（humandesignbusiness.com）仅作措辞旁证；其单闸门页跳转术语表，未取得正文。
- 因此这四十条属于「组织协作情境下的整合商业解读」，不是原典授权文本。

## 7. 维护与替换

- 替换正文时只改对应语言的 `org-reading-content.gates40.<locale>.js`，保持 `gates: { <gate>: { role, intro, application } }` 形状；合并、规范化与读取接口无需改动。
- 新增闸门不得覆盖既有 Penta 十二条或旧组织正文；如需覆盖，先由内容负责人明确裁决，再改对应旧文件。
- 来源增删改同步更新第 4、5 节；`sourceRefs` 只写在本记录，不进运行时模块。
- 不提交抓取原始 HTML、原始响应、私人人物资料或本机绝对路径；本文件中的本地资料只用知识库相对路径与项目内路径。

## 8. 验证位置

- `tests/wa-org-gate-business.test.js`：三语 40 条非空、两表无交集、64 闸门渲染均为专用商业正文、0 共用回退、0 待整理、64 个标题三语正确、旧部门角色优先、32 通道正文与标题未变、单通道详情仅一条解读、来源元数据不入 DOM、缺条目时显示待整理且不借用普通正文。
