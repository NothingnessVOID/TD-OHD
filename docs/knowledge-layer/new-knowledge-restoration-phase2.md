# 新增 Knowledge 正文恢复 Phase 2

基线：`fix/variable-copy-localization-v1` @ `71405704668baa7d52a3f9a77cec1404706e17eb`。

本轮 zh-CN 正文来自用户批准的 `TD-OHD-new-knowledge-restoration-phase2.md`。繁体为忠实转换，英文为完整翻译。没有搜索、读取或推测原始教材，也没有新增外部知识审核声明。附件中面向执行者的备注没有混入公开正文。

## 已落地

- 新增 `hd.type.introduction`、`hd.authority.introduction`、`hd.profile.introduction`、`hd.definition.introduction`。
- 五篇 Type 按附件扩充，保留共享 Strategy / Aura / Signature / Not-Self Theme 展示及原计算属性。
- 八篇 Authority 中七篇原样；Lunar 仅去掉精确天数。Reflector Detail 和三语言短介绍也去掉精确天数。
- 十二篇 Profile、五篇 Definition、Cross 和 Variable 29 项的数据与 presentation 保持基线。个体基础页增加独立「了解…」action。
- 四个总页使用同一正文标题、段落、列表渲染路径。Profile 总页不进入个体爻线拆分或 Geometry 徽章路径。
- 十三个星体现有 Summary 原样保留，集中在 `planet-reference.js` 新增三语言 Detail。资料库与出生图星体弹窗共用这些资料及转义段落渲染。
- Design / Personality 原文保持；Transit 使用附件完整正文。
- `knowledge-restoration-phase2` 来源记录仅表示本轮用户批准的资料包，没有标为外部官方验证。

## 必要手动确认

5211 预览已确认四个总页三语言均能打开。简体四个个体页的「了解…」导航均跳转成功，繁体 Profile 导航也已确认。英文 Reflector、简体太阳、繁体冥王星、英文和繁体 Transit 已现场确认段落和列表显示。渲染未见明显错误。

差异核对：三语言现有 Knowledge 内容仅五篇 Type 和 Lunar Detail 改变；新增四个总页。其余原记录保持。用户可见 Knowledge 正文中的「公共说明／基础说明／技术说明／Public Overview／Basics」计数为零。

按用户要求，本轮没有运行 unit、E2E、responsive 或 build。现有计数快照、历史正文快照、发布范围守卫留到最终 Knowledge 统一验证阶段同步，不以旧期望值改回已批准的新内容。

## 保留问题

- 完整月亮周期的精确天数差异不在本轮裁决；公开 Lunar / Reflector 文案只写完整月亮周期，计算与时间算法未动。
- 全套回归及相关计数、快照、范围守卫的同步待最终统一验证。
- 完成资料库现场确认后预览服务退出，已在同一 5211 端口重新启动。再次连接旧浏览器错误页被浏览器安全策略拒绝，因此星体弹窗的最终现场复核留待下次浏览器访问；未绕过该策略。

未 merge main，未部署，未进入下一阶段。未修改 Centers、Gates、Channels、Circuit、Variable、任何 chart engine 或星体位置计算。

## 修改文件

- `docs/knowledge-layer/new-knowledge-restoration-phase2.md`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/human-design-foundation.js`
- `src/lib/knowledge/sources.js`
- `src/lib/planet-reference.js`
- `src/locales/en.js`
- `src/locales/ui-contexts.json`
- `src/locales/zh-CN/vocabulary.js`
- `src/locales/zh-Hant/vocabulary.js`
- `src/views/chart.js`
- `src/views/reference.js`
