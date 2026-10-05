# Knowledge Layer Round 2B 验收记录

计算结果仍由 SharpAstrology 与既有派生逻辑提供。知识正文继续放在三个独立语言资源中。主页只读取摘要；弹窗与资料库使用同一个详情 renderer。本轮按用户提供的简体稿收口，不读取 Word，不引用外部资料。

## 基线与隔离

- 起始基线：`66185da8071a64b679ce51857c7029556957f038`，`feature/knowledge-access-v1`。
- 最新 main：`bc9b217fab260b1017bfb1478141f864e402289e`，已包含在基线中。
- 本轮分支：`feature/knowledge-review-round2-content`。
- 从 Round 2A `18cc23db9e4f5d4b4be9fb253d0e8957fa07b233` 移植 renderer、controller、CSS 和 Reference 标题层级，未整体 cherry-pick，也未覆盖 runtime 文件。
- 仅提交和推送本分支，不合并、不部署。

## 内容与结构

| 对象 | Summary + Detail 数量 | 本轮简体处理 |
|---|---:|---|
| Type | 5 | 短描述、策略值及说明、气场三词及说明、正向反馈、非我主题 |
| Authority | 8 | 完整新稿，显化与投射意志力权威保持独立 |
| Profile | 12 | 完整新稿；三爻名称为实践家；几何分类不变 |
| Definition | 5 | 完整新稿，包括四分人 8 或 9 个已定义中心 |
| Cross introduction | 1 | 构成、几何、生命主题；具体十字仍显示实际 angle/gates |
| Variable | 24 | 四类别各六篇；两组 Tone 分支、Perspective 分心、Motivation 转移 |
| Cognition | 6 name-only | 不添加摘要或正文 |

55 条 reviewed Summary + Detail 不变，未新增 `hd.strategy.*`。Strategy 是 Type 的第二个首页入口，点击、Enter、Space 均打开同一 ID，并保持返回焦点。

简体正文只存一份。`presentation` 保存正文中的范围索引（JavaScript UTF-16 字符位置），区分 Type 字段与 Variable 的 `intro / tone1to3 / tone4to6 / distraction / transference`。修改正文时应同步索引并通过范围与内容测试，不能依据翻译标题匹配分支。正文摘要与全文各有原稿哈希回归基准。

个人 Variable 通过已有 slot 的数值 Tone 选中一组正文分支，旁边显示轻量“你的”。资料库没有上下文，不显示该标签；两处正文相同。不创建 Tone 知识对象、不复制个性化正文，不判断用户正在分心或转移。Color/Tone/Base/Direction 计算未修改。

公共详情去掉通用 Structured Facts、Detail 标题、family/taxonomy/componentCount、版本、来源和 missing/shared 提示。内部 Registry 身份、来源、审核状态保留。继续使用既有 `#gate-detail` 和 semantic CSS tokens。

## 三语言独立与待编辑项

- `human-design-en.js` 与 `human-design-zh-Hant.js` 与起始基线逐字节一致。
- 两者的 Profile、Variable 等 vocabulary 文件与基线一致。English Signature 保持 Signature；繁体原有 Signature 标签保持原值，不强制改成简体的正向反馈。
- 无自动简繁转换，无 zh-CN → en 翻译，无跨语言正文 fallback。
- 繁体仅追加 Round 2A 已有的三种 geometry UI 标签及气场／你的两个 UI 标签，未改写知识正文。
- **locale editorial pending（en / zh-Hant）**：独立审校的 Type 气场三词和说明、策略长说明；Variable Tone 分支、Distraction、Transference；本轮八权威、十二 Profile、五 Definition、Cross 三段的新版本正文。现阶段保留各自原有资料，通用展示结构只渲染本语言真实具有的内容，不借用简体补齐。

## 页面与回归边界

- 首页卡片数量、列宽和布局代码保持不变；简体使用用户给定的新摘要与名称。
- Detail 增长测试将正文替换为 50k+ 测试文本，首页、Variable 摘要和几何不变。
- 英文和繁体首页文本及卡片宽高与基线一致。
- 简体新摘要发生自然换行，部分卡片及同排卡片高度增加约 19.19px：1224px 的 Type/Strategy，903px 的 Authority/Profile，664px 的上述四卡，390px 的 Profile。无新增详情段落进入首页，没有修改卡片 CSS 扩容，也未缩改用户原文。
- 关系、团队、计算引擎、箭头映射、中心／通道／闸门／Definition components、BodyGraph 核心详情函数保持原样。
- 最新 main 的 frontend runtime / mobile timeline 修复保持原样。
- Copy Data 不增加长文，Reference 旧 Gate/Line/Channel/Center/I Ching/Gene Keys/Meridian 路径保留。

## 验证

完整单元、localization、timeline、production build 和浏览器结果见同目录 `round2b-validation.json`。针对基线保护的测试比较不可变 Git blob，BodyGraph 函数做 AST 范围逐字比较。历史合并校验只增加固定 12 个展示文件的哈希覆盖清单 `round2b-scope.json`，不放宽引擎或 runtime 校验。

初次本机旧临时 SDK 缺少证书程序集，改用已安装的 `/tmp/td-frontend-sdk/dotnet` 10.0.401 后真实构建通过；未修改产品代码绕过构建。一次热更新导致 browser import 状态失效，重启服务后重跑通过。一次 Timeline 鼠标拖动检查未捕获状态变化，重跑完整 suite 后通过，未改时间轴代码或降低断言。

## 未解决项

仅上述 en / zh-Hant 的独立正文编辑待后续任务。其他新增内容审核、教材、关系和团队问题不扩展到本轮。

## 修改文件

- `docs/frontend-knowledge-sync-v1/validate.mjs`
- `docs/knowledge-layer/review-round2-content.md`
- `docs/knowledge-layer/round2b-scope.json`
- `docs/knowledge-layer/round2b-validation.json`
- `src/lib/knowledge/access.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/human-design-foundation.js`
- `src/lib/knowledge/registry.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-CN/vocabulary.js`
- `src/locales/zh-Hant/ui-chart.json`
- `src/views/chart.js`
- `src/views/reference.js`
- `tests/fixtures/knowledge-round2b-content.json`
- `tests/knowledge-access-e2e.mjs`
- `tests/knowledge-access.test.js`
- `tests/knowledge-content.test.js`
- `tests/knowledge-layer-e2e.mjs`
- `tests/knowledge-presentation-e2e.mjs`
- `tests/knowledge-round2b.test.js`
- `tests/traditional-chinese.test.js`
