# Phase 1D｜Penta 来源登记

核查日期：2026-10-09。`verified` 表示**本条来源在标明范围内确实写了所列信息**，并非验证了人类图理论的经验有效性。`inferred` 表示跨来源拼接、第三方转述或尚待原始材料确认的解读；`missing` 表示本轮未获得足以核实该命题的材料。来源身份和命题状态分别记录：第三方正文可以被准确核对，但不会因此成为官方规则。

| ID | URL / 仓库路径 | 来源类别、可见范围 | 可支持的主张及边界 | 状态 |
| --- | --- | --- | --- | --- |
| J1 | https://jovianarchive.com/blogs/deeper-mechanics-system-theory/the-penta | Jovian 官方，Ra Uru Hu 公开文章正文 | Penta 为群体形态；Sacral→G→Throat；家庭与小型商业同机制、keynoting 不同。文章举三人同处一室的例子；没有完整 Gap 算法 | verified |
| J2 | https://jovianarchive.com/products/group-mechanics-the-penta | Jovian 官方产品介绍、可见简介 | 教材存在及课程主题；本轮未取得全本正文 | verified |
| J3 | https://jovianarchive.com/products/you-and-your-family | Jovian 官方产品介绍、可见简介 | 家庭分析主题；不能据此推出单门成员职责 | verified |
| J4 | https://jovianarchive.com/blogs/deeper-mechanics-system-theory/why-the-title-is-wa-immersion | Jovian 官方公开文章正文 | 对 Gap 的定性表述（开放、吸引注意）；未给从 gate/channel 状态到 Gap 的可执行公式 | verified |
| J5 | https://s3.amazonaws.com/archives.jovianarchive.com/Books/Group%20Mechanics%20The%20Penta%20-%20eBook%20Sample.pdf | Jovian 官方公开样章 PDF；本轮可见封面、目录 i–iii、导言 iv 和正文开头约 1–3 页；网页 PDF 文本抽取；本轮未读到全本 | 目录列门 15、46、14、5、29、2、1、8 的章节主题，亦列「Whatever Is Missing Becomes the Problem」「The Gaps in Pentas Create Suffering」等；目录只证明有这些章节。可见正文谈 trans-auric forms、家庭情境及商业咨询关联；未见目录所列后续章节正文 | verified |
| B1 | https://bg5businessinstitute.com/institute/business-success-code | BG5 Business Institute 官方公开正文 | 3–5 Unified Group、十二项 Business Skills 名单及官方对功能/Gap 的定性主张；未列逐门编号 | verified |
| B2 | https://bg5businessinstitute.com/courses/1959/bg5-business-consultant-certification-program | BG5 官方 Semester 3 公开课程说明、课表与项目要求 | Class 4–6 标题列 5–15、46–29、14–2、1–8、7–31、13–33；列 Gap Analysis、Triggering 等课程主题。标题不提供课程教学法或 Gap 判据 | verified |
| B3 | https://bg5businessinstitute.com/p/curriculum---bg5-certification | BG5 官方公开课程大纲 | 学期安排、Penta/技能分析教学范围；不能充当正文中的逐门机制证明 | verified |
| T1 | https://www.gethumandesign.com/zh/docs/relationships/ | 第三方繁中公开正文，含「團體動力：Penta」段 | 区分两人合图与 3–5 人 Penta；其第六人、角色空缺等说法仅记为该站主张 | verified（第三方陈述） |
| T2 | https://www.gethumandesign.com/zh/docs/relationships/penta-group-dynamics/ | 第三方繁中公开正文、交互范例说明与六通道主题表 | 给出六通道家庭/商业主题和「通道未补全即缺口」的自身定义；招募、岗位、绩效、类型组合等推论不能升级为官方算法 | verified（第三方陈述） |
| T3 | https://humandesignbusiness.com/penta | 第三方从业者公开正文及逐门技能表 | 十二门各配一项 Business Skill；与 B1 名单、B2 门对兼容，但官方公开资料未独立确认逐门一对一 | inferred（用于逐门映射） |
| R1 | `docs/team/PHASE0-AUDIT.md`、`src/lib/human-design/penta-catalog.js`、`src/lib/human-design/penta-structure.js` | 项目内部审计与实现；以本分支版本为准 | 三列四层展示、十二门六通道固定拓扑、3–5 人结构覆盖；是产品实现事实，不是外部机制来源 | verified（仓库事实） |
| R2 | `docs/knowledge-layer/README.md`、`src/lib/knowledge/{schema,registry,sources,human-design-foundation}.js` | 项目现有契约与源码 | 查询身份、摘要/详情独立槽、来源注册及 schema 枚举；不能由本阶段文档自动产生新知识条目 | verified（仓库事实） |

## 读取边界

- 旧链接 `https://www.jovianarchive.com/Stories/73/The_Design_of_Forms-_The_Penta` 在本轮不可抓取，以 J1 可读的 Jovian 迁移文章为替代；不把两个页面当作两条独立证据。
- 资料登记以**实际可见范围和可追溯出处**为准，保留核实机制所需原文及对应位置。本轮读到的是 J5 样章，尚未读到教材全本。可见目录中的例如「Gate 14: Capacity」（目录第 ii 页指向正文 33 页）和「Gate 1: Implementation」（目录第 iii 页指向正文 42 页），只作为章节标题的原文短摘，不当作已读到 33/42 页正文。导言 iv 页提及 Penta 对家庭的影响；正文开头提及 BG5/OC16 的商业咨询用途。未取得的正文保持 `missing`。
- 本机 PDF 阅读预检缺少 `markitdown`、`pdfplumber`、`pypdf`，未安装依赖、未用本机 PDF worker；J5 的可见文字来自公开 URL 的 PDF 网页抽取。未核实图像与非抽取文字。
- 原站关于「功能稳定」「可据此聘人」等主张是该体系/站点的解释，不是产品可承诺的绩效结果。
