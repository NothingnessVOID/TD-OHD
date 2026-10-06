# Variable 29 最终正文落地

计算仍由 Sharp / chart calculation 与 derived 数据负责。解释在 Knowledge Layer 的三语言正式资源中；首页只读 Summary，弹窗和资料库共享 Detail renderer。

## 基线与范围

- 仓库：NothingnessVOID/TD-OHD
- 分支：`fix/variable-copy-localization-v1`
- 起始 SHA：`efe59fdc863f409a66eb0c0eaaea73f09f324119`
- 唯一内容来源：用户提供的 `TD-OHD-Variable-29-final-content-zh-CN.md`
- 来源 SHA-256：`1e182d176f64e4df889ae0c87a7e99f81b0e98716addd996cbaa336a28c401ad`
- 最终提交 SHA 以 Git HEAD / 交付报告为准；未合并 main，未部署，未更新本机 8787。

## 覆盖

|类别|完成|三语言|
|---|---:|---|
|公共说明|5/5|zh-CN、zh-Hant、English|
|Determination|6/6|全部|
|Environment|6/6|全部|
|Perspective|6/6|全部|
|Motivation|6/6|全部|
|合计|29/29|87 条正式语言记录|

公共对象 ID：`hd.variable.introduction`，以及 `hd.variable.{determination,environment,perspective,motivation}.introduction`。公共文章各登记一次，24 篇 Color Detail 的阅读末尾链接到对应公共说明；分类公共说明连接总说明，总说明连接四分类。资料库、弹窗沿用同一 registry / renderer / navigation，不复制公共正文到 Color。

## 正文、翻译与来源

zh-CN 按附件原段落、列表和强调落地，未压缩、摘要或另写核心解释。仅作 section 拆分与显示格式调整；偏离部分原有 A → B 标题交由已验证 flow 结构显示，正文完整保留。Taste 的例外见冲突记录。

zh-Hant 由最终 zh-CN 忠实繁体转换；English 按同一分段完整翻译，未继续使用旧英文短版。三语言 section ID、顺序、关系和信息结构一致。现有 canonical 名称和 Environment 子类型保留，包括 Wanting 的既有中文名称；知识正文按附件使用其原词。

来源 `variable-final-content` 标记用户批准的最终内容与转换／翻译，版本 3。reviewed 表示本轮最终内容批准，不宣称原课程已独立核验。没有读取或寻找其他教材、访问外部知识来源。

## 展示结构

- Determination：core → 两张 Tone 卡 → lifeAdvice。
- Environment：core → Tone → physicalEnvironment → lifeAdvice → businessScenario。
- Perspective：core → Tone → distraction；没有自行补 correctState。
- Motivation：core → Tone → correctState → transference，偏离位于最后一个正文区块。
- 原有 deviation flow、配对身份、当前 Tone 高亮、Color/Tone/Base 与方向 badges 保留。
- 附件偏离正文放在 flow 之后；已有通用机制说明作为次级补充放在正文之后，不覆盖附件。
- 列表与强调经转义后格式化，不执行附件内 HTML。

## Summary 与首页

18 个有明确副标题的 Color 使用其副标题作为 Summary，Environment 六项没有副标题，保留现有短 Summary。公共入口以附件提供的标题作为短标签。没有将长 Detail 当 Summary。

首页的 Variable 短文因批准的副标题而变化；这是本轮明确要求。基础卡片的文字、数量和尺寸与基线一致。修改或注入长 Detail 不改变首页任何文字和卡片尺寸，12 组浏览器验证通过。首页 renderer 文件完全未改。

## 不变边界

计算、Sharp contract、Color/Tone/Base、Variable notation、方向、箭头位置、激活来源、导出、出生图、行运、时间轴、关系、团队均未修改。非 Variable 的 31 个 Knowledge 正文对象三语言逐字段相同。旧 Round 2C/2F/2G fixtures 保持不变，以不可变 Git 快照继续验证历史；新增最终源文件和 87 条记录 fixture 验证当前授权内容。

`variable-29-scope.json` 将受保护源码例外限定为 8 个 Knowledge 运行文件及其精确哈希。原 429 个源码保护检查和产物身份核验继续有效。

## 验证

具体统计见 `variable-29-validation.json`。

- npm test：353 passed、0 failed、3 skipped（默认不启用的联网测试）。
- Knowledge 专项：66 passed；新 Variable 29 内容测试：6 passed。
- localization：34 passed；timeline：63 passed。
- build：passed，现有大 chunk 建议仍存在。
- Variable 浏览器：348 组，29 × 3 语言 × 4 宽度；完整弹窗／资料库正文、入口、Tone 与无横向溢出。
- 长 Detail：首页 12 组文字及几何完全相同。
- Knowledge presentation：132 组共享弹窗／资料库对照。
- Knowledge access：12 组基础卡完整文字／尺寸、键盘和入口；15 组同正文／语言，6 条刷新深链。
- Copy Data：三语言真实剪贴板、出生／行运／时间轴、无额外计算通过。
- Reference：桌面／移动通过。
- BodyGraph：24 组 DOM、文字和几何对照通过，覆盖出生、四个 Lens、行运、时间轴时序。

BodyGraph 首次对照因点击后浏览器滚动位置不同而失败，DOM 和正文相同。测试在采集几何前复位同一弹窗滚动状态，未改页面代码或容差，重新通过。

本地化首次命令缺少 dotnet PATH，补足已有 SDK 环境后 34 项通过。没有安装新运行时。

## 未解决项

仅保留两个按任务明确禁止修改的来源冲突，见 `variable-29-conflicts.md`。没有功能阻塞项；没有对最终教材做外部真假审核，译文仍可后续人工校审。

## 修改文件

- `docs/frontend-knowledge-sync-v1/validate.mjs`
- `docs/knowledge-layer/variable-29-conflicts.md`
- `docs/knowledge-layer/variable-29-restoration.md`
- `docs/knowledge-layer/variable-29-scope.json`
- `docs/knowledge-layer/variable-29-validation.json`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/human-design-foundation.js`
- `src/lib/knowledge/sources.js`
- `tests/bodygraph-knowledge-regression-e2e.mjs`
- `tests/fixtures/variable-29-content.json`
- `tests/fixtures/variable-29-source-zh-CN.md`
- `tests/helpers/knowledge-round2f-contract.js`
- `tests/knowledge-access-e2e.mjs`
- `tests/knowledge-access.test.js`
- `tests/knowledge-content.test.js`
- `tests/knowledge-layer.test.js`
- `tests/knowledge-round2b.test.js`
- `tests/knowledge-round2c.test.js`
- `tests/knowledge-round2d.test.js`
- `tests/knowledge-round2f.test.js`
- `tests/knowledge-round2g.test.js`
- `tests/reference-catalog.test.js`
- `tests/reference-e2e.mjs`
- `tests/variable-29-content.test.js`
- `tests/variable-29-e2e.mjs`
