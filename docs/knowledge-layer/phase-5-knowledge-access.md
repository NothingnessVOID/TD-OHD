# Phase 5：知识入口与统一详情承载

## 1. 范围与基线

本阶段让已经审核过的知识内容可从出生图和资料库访问。计算结果仍由 Sharp / chart.calculation / chart.derived 提供；解释文字仍在 Knowledge Layer；主页只显示 Summary，点击后才显示 Detail。

基线：`origin/feature/knowledge-content-v1`，精确提交 `ae11ffe27b329dceee1cb679e0b381283fc3e400`。任务分支：`feature/knowledge-access-v1`。没有 merge main、部署或修改8787安装。

## 2. Shared Shell / Separate Renderer

沿用唯一 `#gate-detail`，未新增第二套 Modal 或 Bottom Sheet。`detail-dialog.js` 负责关闭、Escape、遮罩、焦点、owner 与手机高度；`chart.js` 继续负责 BodyGraph 内容，`detail-renderer.js` 负责知识文章。

`openDetailDialog(element,onClose,{owner,label})` 默认 owner=bodygraph、label=既有 Bodygraph details。`prepareDetailDialog()` 在换 owner 或容器时先调用旧清理回调，再允许新 controller 写入状态和 DOM。不能只比较 DOM 容器，因为两个 controller 使用同一个容器。

`fitDetailSheetHeight()` 从 chart.js 原函数逐句提取，参数、35%/82%高度边界、20px余量、260ms曲线保持相同。BodyGraph 和 Knowledge 都调用它，没有复制一套算法。

## 3. Protected BodyGraph Detail

Gate / Channel / Center / Planet 原内容 renderer、history、goBack、resetDetail、Transit context、decorateBodygraphDetail、appendActivations、appendTiming 保留。chart.js 的受保护 renderer 只在写入之前增加 owner prepare，并替换共享高度函数名称。

未修改 `bodygraph-detail-layout.js`、人体图 SVG、Transit / Timeline renderer、算法或 CSS。原手机拖动柄和详情导航 DOM 继续使用既有类。未引入新字体、主题或外壳尺寸。

## 4. Foundation clickable mapping

| 卡片 | Query 身份来源 |
|---|---|
| Type | chart.calculation.type.id，保留旧短显示兼容 |
| Authority | chart.calculation.authority.id，保留 egoManifested / egoProjected |
| Profile | 稳定 profile ID / numbers |
| Definition | chart.calculation.definition.id |
| Cross | raw Cross ID + 当前名称、angle、gates 上下文 |

`access.js` 只做稳定身份映射，不读知识正文。Strategy、主要回路不映射，外层四箭头卡片不映射。增加角色、键盘、指针与 focus 样式，没有改变卡片文字或盒模型。

## 5. Variable mapping

Foundation 四个 slot 和 Variable 面板四卡按 `kind:valueId` 查找24个正式对象。Color/Tone/Base 和 direction 继续来自当前 chart，用独立 context aside 显示；没有写进正文，也没有用上下文改 Knowledge 资料。

Cognition原信息保留，没有新入口、文章或菜单。

## 6. Knowledge controller

`detail-controller.js` 独立管理 query、context、libraryId 与焦点目标，不访问 BodyGraph history / pin / timing。公开 open / close / refresh / state API。

切 owner 时先关闭旧 controller。关闭 Knowledge 清空全部选择；语言重绘导致旧卡片 DOM 被替换时，寻找同一个身份的新卡片恢复焦点。Library action 先关闭弹窗，再通过已有 Reference 导航处理 URL 和视图。

## 7. Reference Library integration

分类顺序：全部、基础知识、中心、通道、闸门、四箭头、行星、回路组。原 concept kind 和深链保留，归入基础分类。

正式 Knowledge：基础31项 + Variable24项。原128项保留，总183项。基础分类另有三个既有概念，总34项。六项Cognition不收录。

目录取自 `listKnowledgeEntries()`；lookup 由 `getKnowledgeEntryById()` 在同一登记表解析。没有另建 ID→文章的手工映射。搜索读取当前语言名称、Summary、稳定ID与objectId别名，例如1/3与hope。

## 8. Routes

新增 Knowledge kind，复用既有 hash / history / 返回列表逻辑：

- `#library/knowledge/hd.type.generator`
- `#library/knowledge/hd.authority.sacral`
- `#library/knowledge/hd.profile.1-3`
- `#library/knowledge/hd.definition.split`
- `#library/knowledge/hd.variable.motivation.hope`
- `#library/knowledge/hd.cross.introduction`

以上六种 direct reload、Back / Forward 已实测。原 Gate、Channel、Center、Planet、Group、Concept 路由继续走原 renderer。

## 9. Same-body guarantee

弹窗和资料库都调用 `renderKnowledgeDetail()`。查询对象和稳定ID都由 registry读取同一资料；外壳、导航和上下文位于 article之外。测试比较完整 Knowledge article HTML，而不仅比对摘要。Type / Authority / Profile / Definition / Variable × 三语言共15组完全一致。

## 10. Cross behavior

出生图详情显示当前 Cross 译名、角度、四 Gate 和明确标注的共用机制介绍。当前具体Cross的 `detailStatus=missing` 保持真实；界面隐藏具体文章缺失的突出提示。

资料库只有 `hd.cross.introduction`，没有创建192个空文章或伪条目。动态Cross弹窗的资料库链接明确转到共用介绍。

## 11. Localization

沿用现有 locale、vocabulary 和三语言正式正文资源。弹窗在语言变更后按原 query 和原计算 context 重新渲染；标题、Summary、Facts、Detail、上下文、Library按钮和ARIA名称即时更新。

只新增访问入口的UI译词，并将四箭头caption title改为现有本地化值。没有修改审核过的知识正文。三语言纯语言检查和新入口实时刷新已通过。

## 12. Accessibility

卡片具备 role=button、tabindex=0，支持 Enter / Space。保留 Escape、遮罩关闭、aria-modal、共享焦点循环；焦点列表支持按钮、链接和tabindex=0目标。关闭后回到原卡片，包括语言重绘后的对应卡片。

共享owner关闭回调的执行顺序、监听清理和焦点恢复有单元测试。浏览器测试覆盖桌面与手机、遮罩、Escape、focus trap、owner互换和状态清空。

## 13. Regression testing

详细命令与结果见 [validation.md](validation.md) 和 [phase-5-validation.json](phase-5-validation.json)。

- npm test：269 passed，0 failed，3 skipped（原在线测试）；新增7项访问边界单元测试。
- localization：34 passed；timeline unit：61 passed。
- 12组精确布局对照：1224 / 903 / 664 / 390 × en / zh-CN / zh-Hant。基础卡和Variable卡可见文字、宽高完全相同。
- P0：1224与390下共24组BodyGraph DOM、可见文字、关键类及几何比较，位置容差1px。
- Timing：duration、start、end、source、≈、full-range、range-note和顺序显式断言；full-range另用固定fixture覆盖。
- 原有25个相关浏览器脚本和新增2个专项脚本通过。

对照服务器使用相同的外部字体阻断和回退字体环境、固定行运时刻及代表图。没有修改baseline设计。证据覆盖指定宽度、场景和图，不宣称穷举全部图与字体加载条件。

原V1验收手机动画在并行运行的一次尝试中出现“高亮轨道可见”失败，隔离复跑通过；未修改时间轴或削弱该断言。新测试初始发现的字体Promise返回值、手机返回列表和隐藏控件操作问题仅修正测试步骤。

## 14. Deferred work

Cognition Detail、192篇Cross具体正文、Strategy独立对象、Circuit知识改造、Gate/Channel/Center知识迁移、Relationship redesign、Team/Penta/Wa和更大视觉改造继续deferred。

本轮没有新增知识大篇正文、读取老师教材、修改Sharp、本命/行运/时间轴计算、关系或团队算法。Copy Data仍输出结构与短名称，没有加入长文章。Phase4C历史报告和来源资源保持原样。

## 修改文件

- `docs/knowledge-layer/README.md`
- `docs/knowledge-layer/coverage.md`
- `docs/knowledge-layer/missing-content.md`
- `docs/knowledge-layer/phase-5-knowledge-access.md`
- `docs/knowledge-layer/phase-5-validation.json`
- `docs/knowledge-layer/validation.md`
- `package.json`
- `src/lib/detail-dialog.js`
- `src/lib/knowledge/access.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/registry.js`
- `src/lib/reference-catalog.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-Hant/ui-chart.json`
- `src/main.js`
- `src/views/chart.js`
- `src/views/reference.js`
- `tests/bodygraph-knowledge-regression-e2e.mjs`
- `tests/knowledge-access-e2e.mjs`
- `tests/knowledge-access.test.js`
- `tests/reference-catalog.test.js`
- `tests/reference-e2e.mjs`
