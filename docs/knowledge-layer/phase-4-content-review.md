# Phase 4C：Human Design 知识正文审核实施

## 基线与范围

从远端 `feature/knowledge-layer-v1` 当前 HEAD `4c80a69f28dfe6794e884f53699714cbc52ca6e9` 创建 `feature/knowledge-content-v1`。阶段 1–3 审计和计算边界成果保留。本轮按用户提供的人工审核机制指令整理内容，以官方公开页面核对结构事实；没有读取老师教材。

## KEEP / CORRECT / ADD

| 分类 | 实施 |
|---|---|
| KEEP | Sharp 计算、adapter-v2 输出与缓存、稳定 Knowledge ID、原始 Gate/Line/Channel/Center 资料链、关系和团队算法、Gene Keys 关键词本身 |
| CORRECT | MG 正式策略/签名/非自己主题，Projector 认可与邀请，Reflector 约 29.5 天；Ego 两类显示名称；Cross 面板未获支持的 70% 文案；Variable 中英并列显示 |
| ADD | 55 个对象的正式三语 Summary/Detail、逐槽来源和版本、Profile 几何、Definition taxonomy/count、稳定术语引用、安全统一详情 renderer |

原 catalog description、Profile theme、Variable legacy explanation 不删除。它们仍可服务旧 chart 契约，但这些对象的正式 Knowledge Summary/Detail 已切换到本轮审核资源。顶部 Type heroSummary 保持独立用途，只纠正 MG 与 Reflector 的明确错误，没有把 Detail 填进去。

## 对象与内容

- **Type：5 个显示身份。** Generator、Manifestor、Projector、Reflector 四种基础 Type；MG 保留独立显示身份，family=generator、taxonomy=subtype。MG 正式策略为等待回应，签名为满足，非自己主题为挫败；informing 和 anger 不再登记为 MG 的第二正式策略或主题。没有修改引擎类型计算。
- **Authority：8 个。** Emotional、Sacral、Splenic、EgoManifested、EgoProjected、SelfProjected、Mental、Lunar 均有独立 Summary/Detail。两个 Ego 身份和正文不合并。Mental 说明无直接内在权威，合适环境和 sounding board 用于听清自身过程，别人不代为决定。Lunar 采用约 29.5 天。
- **Profile：12 个。** 独立短摘要和说明，几何属性为 7 个 Right Angle、1 个 Juxtaposition、4 个 Left Angle。4/1 登记为 Juxtaposition；几何不混入正文机器字段。
- **Definition：5 个可查询身份。** No Definition 是状态，componentCount=0；其余四种是定义类型，对应 1–4 个连接组件。加入审核说明，不改变 Sharp components、bridge islands 或时间轴算法。
- **Variable：24 个。** 四类各六个 Color value 均有独立 Summary/Detail。计算 Color/Tone/Base、direction、valueId 继续在既有计算/派生链；Direction/Tone 不写成 Color 的固定极性。Valleys 说明流动、交换和信息通道；Motivation 说明心智觉知动机，不取代决策权威。现有卡片只读 Summary。
- **Cognition：6 个名称保留。** Summary/Detail 明确 missing，没有编写解释。
- **Cross：1 个共用机制介绍。** 各具体 Cross 继续使用 Sharp raw enum 动态身份、Angle 和四 Gate；具体 192 篇文章 deferred。统一 renderer 单独标示“共用介绍”和“具体正文缺失”，不把介绍伪装为具体文章。

## 四层内容与术语

Name 继续来自 vocabulary；Structured Properties 来自中立 identities 模块或既有结构；Summary 是一句极短定义；Detail 是独立完整说明。三种语言各有相同的 55 个内容 key，正文只存放于正式资源，registry 仅登记引用。

`terms.js` 将 `[[term:type.generator]]`、`[[term:authority.sacral]]` 等稳定 token 经现有 vocabulary/locale 解析。翻译修改可同步全部引用。纯文本和 rich 模式共用解析；rich 模式 escape 普通文字和术语，仅生成固定 strong 标签。未知、畸形、原型属性 ID 显式失败。

`renderKnowledgeDetail()` 是未来出生图、行运、资料库和搜索入口的共同正文 renderer。上下文在独立 aside 中，不改变 article 正文。本轮没有安装这些点击入口、弹窗、搜索菜单或新资料库分类。

## Surface 与语言

- Foundation 只读 Summary；Type 顶部保留独立 heroSummary。
- Variable 卡片只读 Summary，保留 Color/Tone/Base 和方向。
- Detail 不向 Summary 或主页 fallback；缺失是合法状态。
- 英文、简体、繁体各使用正式资源，不依赖运行时翻译或退回英文。
- 移除 Variable 原词、Personality/Design 额外英文标签、Color/Tone/Cognition 英文并列。Cross 面板 Gene Keys 关键词通过现有 API 的单语言选项显示，关键词内容没有改写，其他旧调用保持默认行为。
- 没有布局 CSS 修改。批准的摘要、名称、单语言标签会改变自然换行高度，不能声称所有卡片高度与旧版完全相同。

## 来源与审核状态

正文来源为 `reviewed-hd-content`：用户提供的审核机制基线，由 TD-OHD 组织为三语资源，标 **reviewed**，并非官网原文复制或逐句官方 verified。结构事实使用 `jovian-structure` 单独登记证据与 verified。Name、Summary、Detail、properties、legacy hero 分别记录来源和版本。

官方公开证据链接集中在 sources.js，并自动输出到 provenance.md。旧 NatalEngine 静态来源仍保留历史 lineage，不自动升级成官方。未使用老师来源。`td-ohd-extension`、`teacher-extension` domain 明确 deprecated，仅保留旧 schema 读取兼容；没有新建 TD domain/tab/页面。

## 测试与实际页面证据

统计由 report script 从真实运行日志生成，完整见 [validation.md](validation.md) / [validation.json](validation.json)。

- npm test：262 passed、0 failed、3 skipped。三项为既有 opt-in 网络测试。
- localization：34 passed；timeline：61 passed；build 成功。
- Copy Data、Reference、Planet、Appearance、Sharp、四个 Timeline E2E、Meridian、一般 E2E 均通过。
- 1224 / 903 / 664 / 390 × English / 简体 / 繁体：12 组对照。8 张基础卡、宽度及未改对象文本一致，授权的摘要和单语言标签变化有实际高度记录。
- 向全部现有 Detail 注入超过五万字符，12 组 Foundation 文本/卡片宽高和 Variable 摘要区文本/高度完全不变。
- 64 Gate 三语单语言 Gene Keys 读取与现有正式关键词一致，不改旧 API 默认行为。
- 术语翻译同步、HTML escape、未知 ID、安全失效、动态 Cross、缺失状态、Summary-only 源码约束均有自动测试。

额外历史回归脚本初跑出现四项基线失败，并在未修改服务上复现：语言 select 已采用 clip-path 隐藏，分享已进入更多菜单，图宽硬编码已过期；时间轴 bar 使用派生 `--tl-transit` 而 ring/text 使用独立 semantic token；两项查询样例依赖今天且超出激活日期。只维护测试夹具：按当前几何/控件/颜色契约断言、固定查询日期。产品布局、颜色和查询算法没有为测试调整。维护后四项全部通过。

构建仍保留既有大 chunk 提示，不是失败。验证覆盖代表图与指定语言/宽度，不宣称所有出生图或所有显示入口穷举。

## Phase 5 保留工作

统一详情点击入口、Type/Authority/Profile/Definition/Variable 弹窗、资料库/搜索接入、术语关联导航尚未实现。具体 Cross 文章与 Cognition 解释需后续独立资料审核。没有自动进入 Phase 5，没有 merge main、部署或更新正式 8787 安装。

## 修改文件

- `docs/content-audit/phase-4-resolution.md`
- `docs/knowledge-layer/README.md`
- `docs/knowledge-layer/coverage.json`
- `docs/knowledge-layer/coverage.md`
- `docs/knowledge-layer/missing-content.md`
- `docs/knowledge-layer/phase-4-content-review.md`
- `docs/knowledge-layer/provenance.md`
- `docs/knowledge-layer/validation.json`
- `docs/knowledge-layer/validation.md`
- `scripts/report-knowledge-layer.mjs`
- `src/lib/chart-engine/sharp-contract.js`
- `src/lib/content.js`
- `src/lib/human-design/identities.js`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/lib/knowledge/content/index.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/human-design-foundation.js`
- `src/lib/knowledge/registry.js`
- `src/lib/knowledge/schema.js`
- `src/lib/knowledge/sources.js`
- `src/lib/knowledge/terms.js`
- `src/locales/en.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-CN/vocabulary.js`
- `src/locales/zh-Hant/ui-chart.json`
- `src/locales/zh-Hant/vocabulary.js`
- `src/views/chart.js`
- `tests/browser-comments-e2e.mjs`
- `tests/knowledge-content.test.js`
- `tests/knowledge-layer-e2e.mjs`
- `tests/knowledge-layer.test.js`
- `tests/reference-v1-acceptance-e2e.mjs`
- `tests/review-round2-e2e.mjs`
- `tests/timeline-conditions-e2e.mjs`
