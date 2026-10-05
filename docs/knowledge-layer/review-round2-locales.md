# Knowledge Round 2C：独立英文与繁中正文

## 基线与范围

从远程 `feature/knowledge-review-round2-content` 的 `292edc9b5aa8f7c6b1fa5e3055c4c76cba8c52b3` 创建 `feature/knowledge-review-round2-locales`。本轮提交并推送该分支，不合并、不部署。

用户提供的 English 和 zh-Hant 编辑稿各自作为正文输入。内部 localization audit 只用于检查要求，没有进入公共资源，也没有根据其中的来源描述进行网络或教材检索。两个输入文件的 SHA-256 和每篇正文的摘要／正文哈希见 `tests/fixtures/knowledge-round2c-content.json`。

## 内容与身份

每种语言均保留 55 篇 Reviewed Summary + Detail：5 Type、8 Authority、12 Profile、5 Definition、24 Variable、1 Cross introduction。另有 6 个 Cognition name-only，不新增分支 Knowledge ID。

英文与繁中分别写入原来的独立资源文件。没有 runtime 翻译、繁简转换或跨语言 fallback。原 registry 身份、属性、来源与审核元数据继续保留；它们不进入公共详情。

英文使用 Signature、Not-Self Theme 和编辑稿的 Profile／Geometry。繁中使用薦骨、標誌、非我主題，以及各自的专业词。繁中编辑稿本来包含 Tone、Left、Right 和 subtype 英文词，因此测试检查错误术语与内部备注泄露，不再把所有英文字母视为错误。

## 简中改动边界

48 篇资源与 Round 2B 对象完整一致。剩下 7 篇：

* Taste：只修正两个 Tone 分支标题、正文与位置元数据。摘要与 intro 不变。
* 6 Environment：只在 Tone 标题追加子类型名称并更新位置元数据。摘要、intro 和分支正文不变。

Taste 三语言统一：Tone 1–3／Left = Open；Tone 4–6／Right = Closed。

| Environment | Tone 1–3／Left | Tone 4–6／Right |
|---|---|---|
| Caves | Selective | Blending |
| Markets | Internal | External |
| Kitchens | Wet | Dry |
| Mountains | Active | Passive |
| Valleys | Narrow | Wide |
| Shores | Natural | Artificial |

## 展示结构

Type 和 Variable 使用同一个 renderer。正文只存一次；presentation 用 UTF-16 start/end 范围引用原文。Variable 继续使用 intro、tone1to3、tone4to6、distraction、transference。没有 Core 的编辑稿保持空 intro，不把 Summary 复制成正文。

Profile 增加本地 presentation.geometry，供同一个 renderer 显示各语言编辑稿的几何术语，不改变计算中的 geometry。空范围不生成空段落。

“你的”由 tone 数值决定。资料库无个人标记。Distraction／Transference 为普通正文，没有警告样式或用户状态推断。

## 页面与保护

没有修改 CSS、主页卡片结构、modal shell、资料库菜单。英文与繁中摘要按新编辑稿更新，其自然换行可能影响卡片高度；不宣称新旧文案或所有高度完全相同。布局比较允许指定摘要更新，保持卡片数量与宽度，验证 Detail 增长不影响主页。

未修改 SharpAstrology、TransitCore、adapter、出生／行运／Definition／Variable 计算或四箭头映射。protected BodyGraph 函数及原详情布局模块与基线一致。关系、团队、Gene Keys、I Ching、Meridian 运行链不改。

`round2c-scope.json` 为历史 release source guard 增加独立的 5 文件许可层，旧 Round 2B scope 不改；其他受保护源码继续匹配历史基线。

## 验证

具体结果见 `round2c-validation.json`。新增测试覆盖 55 篇正文哈希、三语言 ID、一致数量、简中严格边界、六组子类型、24 Variable × 6 Tone × 3 locale、Type 标签、Profile 几何、独立 locale loader 和受保护计算文件。测试夹具没有公共文案副本。

本轮没有扩大知识审核范围。后续正文审核、资料来源核查和正式上线仍需另行任务。

## 修改文件

* `docs/frontend-knowledge-sync-v1/validate.mjs`
* `docs/knowledge-layer/review-round2-locales.md`
* `docs/knowledge-layer/round2c-scope.json`
* `docs/knowledge-layer/round2c-validation.json`
* `src/lib/knowledge/content/human-design-en.js`
* `src/lib/knowledge/content/human-design-zh-CN.js`
* `src/lib/knowledge/content/human-design-zh-Hant.js`
* `src/lib/knowledge/detail-renderer.js`
* `src/locales/zh-Hant/ui-chart.json`
* `tests/fixtures/knowledge-round2c-content.json`
* `tests/knowledge-access-e2e.mjs`
* `tests/knowledge-content.test.js`
* `tests/knowledge-layer-e2e.mjs`
* `tests/knowledge-presentation-e2e.mjs`
* `tests/knowledge-round2b.test.js`
* `tests/knowledge-round2c.test.js`
