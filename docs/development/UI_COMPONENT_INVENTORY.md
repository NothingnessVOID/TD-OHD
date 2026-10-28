# UI 组件登记

本表登记真实实现，供开发前查阅；不是新组件规划或永久冻结的路径清单。规范见 [ENGINEERING_STANDARDS.md](ENGINEERING_STANDARDS.md)，执行约定见 [../../AGENTS.md](../../AGENTS.md)。

登记日期：2026-10-10，开发分支 `dev/windows-development`。核查起点 `92b60f6`；下方增量登记记录本轮实际接入的实现，表内“起点”描述仅用于说明迁移来源。

| 类别 / 实现状态 | 代码位置及调用入口 | 已使用页面与适用场景 | 尚未统一的问题 |
| --- | --- | --- | --- |
| 页面布局：公共 CSS 与业务布局并存 | `src/styles.css` 的 `.chart-layout`、`.view-container`、`.info-column`；各 view 渲染 | 出生图与普通页面；Team 在 `team-direct.css` 管理固定左栏和右栏滚动；行运时间轴有自身布局 | 不同滚动需求保留独立布局，避免复制面板视觉 |
| 信息面板：公共视觉基础 | `src/styles.css` 的 `.panel`、`.panel-title`、`.panel-heading`、`.panel-content` | 出生图等信息展示，背景/边框/圆角/内边距/阴影由公共 CSS 和 Token 决定 | 起点 Team `.penta-reading-section` 重复了视觉声明，本轮统一到 `.panel` |
| 阅读详情生命周期：公共模块 | `src/lib/detail-dialog.js`：`prepareDetailDialog`、`openDetailDialog`、`closeDetailDialog`、`fitDetailSheetHeight` | 出生图、行运、时间轴、Penta；Escape/遮罩/焦点返回/手机 sheet 高度 | 标题渲染尚有平行实现，不能将共享生命周期等同于全部结构已统一 |
| 出生/行运详情布局：公共模块 | `src/lib/bodygraph-detail-layout.js`：`decorateBodygraphDetail` | `src/views/chart.js` 的出生图与行运详情，以及时间轴调用的详情 | 目前有 natal/transit 激活专用逻辑，不能直接传 Penta 人物假装出生图；标题可独立提取 |
| 操作弹窗：公共视觉、重复生命周期 | `src/styles.css` 的 `.modal-overlay`、`.modal`、`.modal-field`、`.modal-actions`；`src/lib/person-editor.js`；`src/views/team.js` 的 `layer()` | 人物编辑使用 modal；Team 的添加/保存/切换/管理另用原生 dialog | 起点生命周期、关闭/焦点和样式分散，本轮提取共用基础层并实际接入 |
| 人物编辑：公共业务组件 | `src/lib/person-editor.js`：`openPersonEditor(birth, {create,onSaved})`；`src/lib/placesearch.js`：`createPlaceSearch` | 主人物编辑、Team 新建/编辑；地点、时区、未知时间与保存逻辑共用 | Team 选择流程需要增加编辑结束后的恢复入口；人物保存和选人确认必须分开 |
| 人物选择：业务状态独立 | `src/views/team.js`：`picker()`、`addPerson()`；`src/lib/people.js` 人物库接口 | Team 成员选择；全局人物切换器在 `src/main.js` | 起点每次点击立即加入并关闭，本轮改为可取消多选草稿；不强行合并全局当前人物与Penta成员状态 |
| 标题与标签：公共 CSS、部分重复生成 | `src/styles.css` 的 `.detail-label`、`.detail-name`、`.detail-hexagram`、`.channel-detail-heading`、`.circuit-badge`；`chart.js` 与 `shared-object-details.js` | 闸门/通道标题、回路及来源标签 | 起点 Penta 使用 header/h2 平行结构，本轮共用标题渲染；来源标签保留场景语义 |
| 按钮与导航：公共基础 | `src/styles.css` 的 `.btn-primary`、`.btn-secondary`、`.ui-icon-button`、`.ui-back-button`、`.gate-detail-back/close`；各宿主维护导航历史 | 通用操作、详情返回关闭与对象跳转 | DOM 和业务历史仍由宿主负责；Team 不应重复完整按钮视觉 |
| 资料栏目：公共组件 | `src/lib/gate-lenses.js` 的 `renderGateLensSwitch`；`shared-object-details.js` 的 `renderSharedGateReading`、`bindSharedObjectDetails` | 出生图、资料库、Penta；四种阅读栏目和显式activeLines | 部分旧 data 属性为兼容保留，不能新增一套阅读正文 |
| Skin Token：集中设计系统 | `src/lib/skin-registry.js` 的 `SKINS`、`SKIN_TOKEN_GROUPS`；`src/styles/skins/`、`src/styles/tokens/` | 全站11个已注册Skin，包括明、暗和高对比；图表来源/回路/关系有专用语义 | Penta成员序号颜色起点仍局部硬编码，需检查适当的语义扩展；不能用回路颜色冒充成员身份 |
| 普通文案与专业术语：公共模块 | `src/lib/i18n.js`：`t`、`registerMessages`；`src/lib/vocabulary.js`：gate/hexagram/channel/center/planet/line/circuit等名称接口 | 全站 en、zh-CN、zh-Hant；用户人名和团队名保持原输入 | 内部身份保持编号/ID，不能按翻译文字匹配；功能消息可分文件注册 |
| 知识读取：公共内容和适配器 | `src/lib/reference-content.js`：`gateReading`、`channelReading`等；`src/lib/knowledge/registry.js`；`shared-object-details.js`：`pentaDetailAdapter` | 出生图、资料库、Penta；基础资料同源，群体激活显式传入ctx | gate/channel专属解读要求审核与证据通过且`interpretationStatus=verified`；缺失时省略，不拿结构来源摘要冒充解释 |

## 本轮统一后的公共实现

| 组件 / 状态 | 位置与 API | 实际消费者 / 场景 | 边界与遗留 |
| --- | --- | --- | --- |
| Panel：共享 CSS，直接复用 | `src/styles.css` `.panel`；`penta-matrix.js` 给分析section应用该类；`team.js`空状态同样使用 | 出生图信息面板、Team概览/六通道/十二门/贡献/背景 | Team只保留业务排版；顶部操作区正常流动，下方复用chart-layout/chart-column/info-column形成52/48双栏。仅图列Sticky，正文随document滚动；已删除内部滚动、负边距补偿和mask |
| Operation Dialog：公共生命周期和既有视觉 | `src/lib/operation-dialog.js` `openOperationDialog({content,onClose,initialFocus})`、`confirmOperation(message)`；`src/styles/operation-dialog.css` | Team添加/保存/切换/管理/新建删除组/确认、`person-editor.js` | 复用`.modal/.modal-overlay`，集中Escape、遮罩、焦点、背景inert、嵌套确认和滚动锁；外观设置原生dialog和账户popover仍独立，未伪称全站均迁移 |
| Object Detail Heading / Navigation：公共无状态渲染 | `src/lib/object-detail-heading.js` `renderGateDetailHeading`、`renderChannelDetailHeading`、`renderDetailNavigation`；回路沿用`channel-badges.js` | `chart.js`出生/行运标题、Penta adapter与矩阵导航 | 数据激活、详情历史和sheet生命周期仍由宿主维护；资料库保留其页面式标题布局 |
| 人物选择：共享业务组件 | `src/lib/person-picker.js` `openPersonPicker({title,multiple,max,selected,exclude,confirmLabel,searchPlaceholder,onCommit,onCancel})`；`src/styles/person-picker.css` | Team添加成员（多选、上限5、编辑返回）；睡眠图比较模式选人（单选、排除当前人物） | 搜索/多选/满员禁用/新建/编辑与"保存后保留搜索词与已选重开"全在共享层；Team只保留revision/teamId/pentaId校验、成员与分组变更、跨组移动确认等业务规则，通过返回字符串报错。Wa的单目标alpha/omega语义仍独立（`wa-composer.js`）。旧`team-picker-*`类名与Team专属弹窗样式已删除，只保留e2e断言的`#team-person-search`/`#team-person-create`/`#team-selection-count`/`#team-selection-confirm`钩子 |
| 行运时刻控件：共享业务组件 | `src/lib/transit-time-control.js` `mountTransitTimeControl({host, idPrefix='transit', onChange, showModeToggle=false, onModeToggle})` → `{getSelection, getResolved, getInstant, isTransitOnly, resolve, setNow, reportError, destroy}`；日历换算仍在 `src/lib/transit-time.js` | 行运页（`idPrefix:'transit'`，`showModeToggle:true`，行运-only 开关属本页）；睡眠图（`idPrefix:'dream-transit'`，无模式开关），宿主 `#transit-time-host` / `#dream-time-host` | markup 由模块渲染进宿主空容器，`index.html` 只留容器，故两页不可能出现两套模板。**行运页保留历史 id**（`transit-date`/`transit-time`/`transit-timezone`/`transit-now`/`transit-choice`/`transit-choice-label`/`transit-status`/`transit-only-toggle`），与共享选人弹窗保留 `team-*` 同一理由：大量既有 e2e 按这些 id 选择。DST 缺时（0 个 instant）报“该当地时间不存在”、回拨（2 个）填 `#*-choice` 让用户选偏移，两条分支都只在本模块。`.tl-toolbar`/`.tl-zone`/`.tl-sr-only`/`.tl-mode-toggle` 复用 `features/transit-timeline/timeline.css`，睡眠图容器带 `.tl` 类；`styles.css` 里原先按 `#transit-choice`/`#transit-status` id 写的样式改为按 `.tl-choice`/`.tl-time-status` 类，前缀换掉后仍生效 |
| Team成员Token：集中语义，不借用回路色 | `src/styles/tokens/team.css`，注册于`skin-registry.js` team组 | 图上成员序号、已选chips、贡献列表、闸门和通道详情 | 恢复Phase1C五种分类色，白色编号；图、Chip、分析及body级详情共享。显示层按memberId维护当前组合的颜色槽，移除其他成员不重编号；不更改存储契约。与P/D来源色分开 |
| 阅读详情可访问性：扩展既有控制器 | `src/lib/detail-dialog.js` | 既有阅读详情消费者 | Tab只枚举可见可用元素；手机高度切换遵守Reduced Motion |
| 字号/间距/圆角尺度：集中 Token，非Skin层 | `src/styles.css` `:root` 的 `--font-size-*`、`--space-*`、`--radius-*` | 出生图与行运的常用组件：panel tabs/content、foundation、center-card、channel/gate 行、表单、按钮、导航、行运日期选择器与完成卡、闸门详情正文 | 尺度不随 Skin 变化，故不放进 `src/styles/skins/`。`--radius`/`--radius-lg` 仍由 new-warm-paper 覆盖为 2px/3px，组件规则继续读 `--radius` 才能继承该覆盖；`--radius-base` 只是同值的命名档位，不是替代品。12.5px/13.5px 半档尚未纳入，留待下一阶段 |

旧 `team-members.css`、`team-visual-polish.css` 作为历史文件保留，Team不再导入。`penta-matrix.css`清除了挂载到body后失效的`#team-view .penta-detail`选择器及已不生成的旧卡片/图例规则。

## 其他已核实入口与尚未统一范围

- 行运和时间轴通过 `src/features/transit-timeline/graph-window.js` 的 `graphPanelMarkup()/renderGraphColumns()` 共享图窗渲染，调用方为 `src/views/transits.js` 与时间轴 `view.js`。它与公共`.panel` CSS是不同层次的复用。
- `src/main.js`的`showView/setupNavigation`提供全站导航壳；页面布局、资料hash导航和详情历史仍独立。关系详情、知识详情各自拼接外壳，生命周期共用`detail-dialog`，未迁移成统一内容模板。
- `src/lib/sync-popover-ui.js`的`syncPopoverHeading/setupSyncPopoverDismiss`供账户浮层使用；`appearance-controls.js`使用原生Skin设置dialog。两者没有在本次Team范围内强制重构。
- 人物入口包括`main.js`页头select、`entry.js`快捷chips、`connection.js`关系选择；它们都读人物库，地点搜索共用`createPlaceSearch`，尚无全站统一人物选择器或出生表单渲染器。
- `channel-badges.js`的`renderChannelCircuitBadges`已用于出生图、关系、资料和行运；本轮Penta标题沿用。业务计数/中心状态标签不是通用Badge组件。
- `reference-catalog.js`的`referenceEntries/searchReference`提供资料索引；资料页默认不开放Penta和cognition全部对象。普通gate/channel/center正文仍走`reference-content.js`，foundation/Penta知识走`knowledge/registry.js`；共享来源不等于所有正文已经搬入同一个registry。
- Skin设置与中心配色分开，`appearance.js`管理`data-skin/data-theme`及`data-center-palette`。Auto按系统明暗选择default-light/default-dark，不给每个特色Skin自动配对。
- High Contrast是已注册Skin。当前没有通用`forced-colors`或`prefers-contrast`适配；`source-contrast.js`只调整指定来源文字对比，不代表全站WCAG审计。动态文案仍需所属页面刷新；时间轴有注入式translator。

## Penta 最终交互增量

`src/lib/penta-state-symbol.js` 的 `renderPentaStateSymbol()` 是小型无状态SVG渲染函数，供左图、图例和右侧通道卡片调用；输入仅为计算结果的状态，不参与计算。断线、同形端点、异形端点接合、双层连接分别表示四种覆盖状态，始终保留文字说明。

Penta六通道使用`detail-label/detail-name`的两级标题，名称取`channelName()`。18张闸门/通道分析卡片使用`role=button/tabindex=0/aria-haspopup=dialog`，无嵌套按钮，支持Enter/Space。图形与成员贡献快捷入口直接进入已有详情；`selectObject`仅管理高亮，不再滚动页面。公共reading/词汇/审核接口保持不变。

## 独立字体设置

`font-preference.js`拥有`td-ohd-font-v1`设备本地偏好，独立于Skin/Center Palette/appearance-v3。`font-controls.js`使用现有`appearance-choice-card`基础视觉，`fonts.css`覆盖字体family轴，不改字号和布局；`font-export.js`按文字范围嵌入当前中文字体。完整范围、许可恢复途径及PNG服务端边界见[FONT-PREFERENCE.md](FONT-PREFERENCE.md)。字体资源版本与转换脚本独立于Skin注册表。

## Issue #24 标签排版修复

`channel-badges.js` 的两个回路分类标签现在由 `.channel-circuit-badges` inline-flex 容器成组承载，内部使用4px gap、零左margin，保持颜色/字体/术语。出生图、行运、资料库、Penta及其他原消费者同步复用。标题靠左排列，空间不足时整组换行；详情标题为顶部导航保留高度。

Penta六通道卡片在600px以下将状态放到标题下方，18px图标与可自然换行的文字首行对齐；仅Penta详情的独立状态badge清除左margin，不全局重置其他badge。状态文字、SVG内容、算法和成员颜色未改。

## Issue #27、#22、#23 详情交互增量

Penta 的对象选中高亮绑定详情生命周期；关闭时清理点击选中及其 `aria-pressed`，Hover、键盘 `:focus-visible` 和成员聚焦独立保留。沿用 `detail-dialog.js` 的关闭、Escape、遮罩，不新增弹窗类型；语言刷新复用矩阵并按稳定对象身份恢复被重绘替换的触发控件焦点。

`chart.js` 的 `renderChannelJump()` 为闸门详情接收可选来源闸门，逐条提供对应闸门入口；中心详情继续使用原有通道列表。对应闸门入口复用已有 `Harmonic gate:` 三语言文案（简中显示“谐波闸门”）；关联卡片仅在含谐波入口时采用三行结构：Flex 左对齐且可换行的标题与回路标签、独立的原状态行、分隔线后的谐波入口。入口保持左对齐及透明背景，顶线使用 `1.5px solid var(--border)`；提示沿用 `--text-secondary`，编号、分隔符与名称放入同一个 `--accent` 链接容器，统一字重及 hover／focus-visible 下划线。桌面点击高度至少30px，手机／粗指针至少44px，文字垂直居中；它与通道卡片均沿用出生图／行运的现有详情历史栈，名称来自 `gateName()`。通道内两张闸门卡片复用 `.detail-label`、`.detail-name` 和现有操作文案，窄屏允许单列，保留来源状态。

## 关联通道状态复用

闸门详情底部的关联通道状态复用完整通道详情的 `tl-activation-label`、`tl-detail-channel-status` 及出生来源类；出生完整通道沿用 `Birth activations`，其他来源和未完整文案保留原上下文判断。复用现有 CSS，不修改中心详情、回路标签、谐波入口、通道标题或持续时间布局。

## Penta 内容包 v1 接入

原有 `hd.penta.*` 21条身份扩充正文并追加8条机制，共29条（12门、6连接、11机制）。内容与来源登记保存在 `knowledge/content/penta-v1.json`，由原 `penta-foundation` 记录接口接入，结构证据与编辑审核分开。`knowledge/penta-reading-policy.js` 统一审查资格及独立摘要读取；公共 Knowledge 文章与安全段落渲染器承载正文，不新建资料弹窗系统。

Team 增加一个 Penta 资料库入口，原背景区增加更多机制入口；资料库提供 Penta 知识及机制分类。图形、成员贡献及布局保持原实现，条目采用 Penta 专属名称，卦名复用 `hexagramName()`。Summary与Detail不互相回退，缺失／未知来源继续拒绝。

## Wa v1 独立组织工作区

`src/views/wa.js` 的 `mountWa()` 接入独立导航，复用 PeopleStore、现有出生图计算、Operation Dialog、Detail Dialog、公共安全段落、i18n 与 Skin Token。组织示意图仅表示手动 Alpha 与三个分组；六沟通主题及贡献独立显示，成员列表承担实际分配操作。

`src/lib/wa/model.js` 与 `schema.json` 提供 refs-only 配置和标准／观察布局校验；`repository.js` 使用独立 IndexedDB 事务保存与恢复追加修订，不修改 TeamRepository v2。`analysis.js` 使用现有激活提取与 Penta 子组分析，Wa 六门对覆盖和 diff 单独计算；`content.js` 映射14篇三语资料与 canonical 门对，缺语种不回退。自动 Alpha、正式 Gap、Triggering、自动 Powerbases 和评分排名仍为明确未支持的扩展边界。

## Penta / Wa v2 增量

Penta 资料沿用原有 registry、独立 Summary/Detail 与严格语种读取，增至30条；Wa 仍14条。新增 Triggering 仅提供资料，不新增图形或算法。v1 身份及历史来源保留，当前正文使用独立 v2 来源记录。

Wa 的人工记录折叠区复用既有表单、按钮、Operation Dialog 和 Skin Token；咨询、分组业务说明、Gap 意向、盟友及有向人工联系都经 `updateWaAnnotations()` 更新。文字输入保持原 DOM 节点，支持中文组合输入和原生撤销；引用清理确认绑定显示时的草稿快照与代次。恢复旧修订时使用同一确认弹窗提示注释差异。

组内沟通和手动 Alpha 并入观察复用六主题卡片，作为两个独立范围呈现；贡献追踪只解释输入变化。`prepareWaMembers()` 是新增的输入准备边界，调用原出生图 provider，不复制算法。DB2 保留原 stores/history 并阻止旧客户端覆盖新字段，refs-only v1 不编辑新字段时保持旧契约。

## Wa OC16 配置编辑器（preview-first 阶段一）

`src/views/wa-composer.js` 提供 `openWaComposer({snapshot, peopleStore?, listTeams?, target?, mode?, validate?, onCommit, onClose?})`，返回 `{close,getDraft}`。`target` 是 `'alpha'` 或稳定 pentaId；`mode:'import'` 配合 pentaId 直接打开导入，默认 `'people'` 打开人物选择。`quickCommit:true` 让主页面目标入口一次确认即提交；完整编辑入口仍保留外层草稿。Alpha 使用可直接替换的单选，跨组占用继续明确拒绝。外层组织名称、Alpha 与 Penta A/B/C 卡片持有独立草稿，子选择器采用 Team 成熟的搜索、多选、显式确认原则；公共 Operation Dialog 负责嵌套、Escape、inert、焦点与滚动，公共 Person Editor 保存人物后返回原选择器。新增 `.wa-composer` scoped 样式使用 Skin Token，专属消息在 `composer-messages.js` 注册三语，不更改 Team 或主 Wa 消息。

`src/lib/wa/configuration.js` 的 `replaceWaSelection(snapshot,patch,peopleMap,{confirmAnnotationCleanup})` 原子克隆后只映射 personId 至 Wa memberId，保留原成员池、组 ID 和全部未受影响的人工记录；跨目标冲突拒绝，不静默移动。`ensureWaComposerSlots()` 仅补缺失角色，`waPersonIdsFromTeamGroup()` 按已保存团队的 group 解析人物引用，不复制 Team memberId、birth 或 chart。单组最多五人，允许零至两人；Alpha 可空，不提供模式选择器。

`validate()` 应捕获宿主对象与代次，组件在选择、清理确认后及提交前核对。`onCommit(next, {originalSnapshot,annotationChanges,isCurrent})` 只更新宿主草稿，返回 false 或抛错保留编辑器。每条 `annotationChanges` 包含 `{beforeSnapshot,issues}`；用户确认后才能清理失效引用，宿主负责保留历史。异步宿主回调应在最终更新前再次调用 `isCurrent()`。组件不调用 WaRepository，不触发整份组织保存，不删除人物资料。公共人物编辑器的保存独立于配置取消，并在 UI 中明示。

## Wa / OC16 分析页（首轮视觉验收候选）

旧 Wa 管理/人工表单界面由 `wa.js` 重做为顶部配置、左侧 Sticky 主图、右侧自然滚动分析。手机人员编组默认收起为摘要，图形与结果上下排布。`wa-diagram.js` 是纯 SVG 展示层，六条真实核心门对互不额外连接，四支柱仅加环标识；状态图例复用 `renderPentaStateSymbol()` 并补单端符号。支柱、核心和支持门对都通过公共 Detail Dialog 展示具体成员/行星/人格设计/爻来源，并接现有 gate/hexagram 词汇与共享知识阅读。

`oc16-catalog.js` 固定用户提供的6部门、32门对、64门一次性分区；`oc16-analysis.js` 复用既有 `collectPair`、激活提取和 Penta 分析。预览仅对原快照验证后的运行时副本使用 observation，标准状态与覆盖统计分离，不回写模式。`analysis.js` 原算法唯一变化是导出既有 collector。

Wa DB2、refs-only schema 与 repository 不改。隐藏的人工记录继续保留，修订/备份集中在打开组织的次级界面；已确认清理前的临时配置可在当前页面实例导出，已保存历史不会被删除。新首轮浏览器用例为 `wa-oc16-preview-e2e.mjs`，完整矩阵及旧固定源码审计的后继适配等待用户视觉确认。

## Wa / OC16 第二轮：范围与贡献详情

`resolveWaViewScope()` 只映射查看范围和成员身份：全组织固定含 Alpha，切到任一组默认不含 Alpha，当前范围及人数用于图形、概览、详情同一条数据链。`nav.team` / `nav.organization` 是独立导航文案，不覆盖页面内 Penta、Wa 专业名称。

`createWaDetailRenderer({getResult,nameOf})` 为部门门对行、部门/通道/闸门详情和紧凑图下摘要复用纯展示函数；`renderActivationRows()` 按 memberId 分组但保留每条行星/侧别/门爻记录。端点直接消费已有 holders/gateRecords，跨成员组合先按 canonical gate 归属再转换展示顺序，不重新计算或补组合。人格/设计来源使用出生图的 `--hd-birth-*` 色点/边框和 `--source-birth*-text` 可读文字Token，随Skin、自定义颜色实时更新。

公共 Detail Dialog 生命周期不改；Wa 自己的历史 frame 保存滚动、折叠、阅读 lens 和焦点键，关闭恢复最初入口与页面位置。主图 SVG 字节保留，短屏取消过度压缩并使用正常文档流；页面删除无选择时的独立面板和反复声明，异常、数据损失确认与存档警告保留。当前为第二轮体验验收候选，完整回归仍在用户确认之后。

## Wa 页面交互收口（当前候选，合并 PR #29 布局）

组织配置现在直接显示在页面：Alpha 更换/清空，Penta 各组独立成员 chip、添加、移除、导入及组名输入；保存位于组织名称旁。旧的统一 composer 窗口已退出实现，`openWaMemberPicker()` 只处理一个目标，选择/导入共享单层 Operation Dialog。公共 Person Editor 临时替换选择窗并返回，原始人员资料与组织保存仍独立。`prepareWaSelectionChange()` 复用原模型的原子替换与注释清理确认，不清库、不删除人物。

`createWaMemberMarkers()` 从完整组织引用池生成编号，并复用 Penta 的五个成员色 Token；同一编号贯穿编辑 chip、SVG 闸门、图例和通道卡片。图只取当前真实 gateRecords 的成员；多行星不重复人数，编号不随查看范围和编组切换。六条核心连接保留，行高随标记行数增长。图作为分析 grid 内的 sticky item，ResizeObserver 只调整偏移，长图自然滚动后粘住并受分析区域底部约束，无独立滚动工作台。

右栏 `renderChannelCards()` 是轻量通道/两端成员/参与人数卡片；核心常显，其他通道展开。明细只在公共 `gate-detail` / `gate-detail-card` 阅读层显示，返回/关闭使用 `renderDetailNavigation()` 与原 Detail Dialog。人格/设计仍取出生来源颜色，成员编号取独立成员色，互不混用。

`reading-presentation.js` 是受审查的展示摘录，不改作者 JSON。六核心读取自己的 Wa 记录；其他通道及闸门读取所属部门的 Wa 主题，保留原标题和源 ID，不回退到个人通道或闸门正文。固定段落选择保留主题与组织例子，精确短语映射改为自然表达，工程说明保留在原数据中。未来原文段落/词句漂移会拒绝未经审核的展示映射。

## 数据边界

共用展示不共享业务状态：Penta使用当前`result/people/groupLabel`，出生图与行运通过自己的图表与上下文传入。稳定人物、成员、组合ID及TeamRepository v2由既有业务层维护。本轮UI统一不改天文计算、Penta拓扑或知识审核状态。

PR #29 布局合并：配置区默认展开，可收起为一行摘要；chip 内直接 ×移除、虚线「＋」添加，组名在卡片标题内联编辑。查看范围使用页面级分段按钮（`[data-scope-option]`）。概览合并四支柱与「尚未激活的闸门」。部门卡片默认展开为紧凑通道行（`.wa-channel-row`：通道、两端闸门 + 成员编号、完整/一端/未激活状态），收起后回到 `.wa-pair-token` 标记条。图下成员图例可点选（`[data-member-focus]`），仅在 DOM 上高亮该成员激活的闸门与通道行，不改计算或范围。旧 `renderChannelCards()` 仍保留供详情复用。详见 [WA-OC16-ROUND3-UI.md](WA-OC16-ROUND3-UI.md)。

## 全站 UI 统一（2026-10-14，design/unified-ui）

| 组件 | 位置 / API | 消费者 | 说明 |
| --- | --- | --- | --- |
| UI System 样式层 | `src/styles/ui-system.css`（`main.js` 最后导入），`--ui-control*`、`--ui-icon-size`、`--ui-dialog-*` | 全站页面标题、`.modal`、关闭/返回按钮、详情导航行 | 唯一定义处；功能 CSS 不再覆盖尺寸 |
| 操作弹窗标题栏 | `operation-dialog.js` `renderDialogHeader(title,{level})` | Team、人物编辑、Wa 档案/历史/成员选择、确认框 | 标题+统一关闭，`data-close` 由生命周期绑定 |
| 详情导航 | `renderDetailNavigation()` 扩展到关系详情与知识详情 | 出生图、行运、Penta、Wa、关系、资料库 | 详见 UI-UNIFICATION-2026-10-14.md |
| 出生激活列（中心对称） | `src/features/transit-timeline/birth-activations.js`：`birthActivationsMarkup()`、`renderBirthActivations({root, chart, planets, fixings, translate, interactive, onSelect})` | 行运时间轴的出生列、行运页的出生列（经 `graph-window.js`）、关系合图两侧各一人 | 设计｜行星｜人格的排布、来源色、固定标记与标题只此一处；只画传入的单张图，不读行运或合图状态。`fixings` 缺省时只显示激活，关系合图即用此形态 |
| BodyGraph 图壳 + 侧栏 slot | `src/lib/graph-shell.js`：`graphShellMarkup({left, right, graph, className})`、`fitGraphShell(root, {aspect, idealWidth, minSlotWidth, fitHeight, minCanvasWidth, maxSlotRatio})`、`measureSlotContent(shell)`、`slotContentWidth(shell)`、`observeGraphShell(root, options)`；样式 `src/styles/graph-shell.css`（`.ohd-graph-shell`、`.ohd-graph-slot`） | 关系合图 `src/views/connection.js` 的 `#conn-shell`：左 slot 一人、右 slot 一人、中央合盘 SVG。首页出生图的左右行星列沿用同一放置规则 | 唯一的“画布 + 左带 + 右带”放置规则：画布铺满容器到参考宽度，侧栏绝对叠在画布左右边缘，各宽度都不堆到图下。带宽由宿主在 slot 内容上声明 `--ohd-slot-content-width`，图壳不猜宽度，并同时封顶在「容器一半」与「画布 28%」以内，带宽随画布缩小、两侧永不在图心相遇。图壳只管几何，slot 内容仍由宿主决定语义与样式 |
| BodyGraph 尺寸适配（公共入口） | `src/lib/graph-fit.js`：`graphFitBudget(root, {fitHeight, chrome, requireSticky})`、`cardChrome(card, graph)`、`observeGraphFit(root, apply, {fitHeight, shouldApply, alsoObserve})` | 见下方消费者表 | 只共用“图有多少地方可用”与“什么时候重算/怎么清理”，不共用“怎么用这块地方”。`graphFitBudget` 给出可用宽与可用高：宽 = 容器 clientWidth 减左右内边距；高（`fitHeight` 时）= 视口高 − 图列 sticky top − `chrome`（调用方实测自己包在图周围的高度）。`observeGraphFit` 统一首次、rAF、ResizeObserver（元素 + 父级 + 额外节点）、`resize`、`visualViewport.resize`，返回 `disconnect()` 供重渲染时清理 |
| 尺寸适配消费者 | — | ① 首页出生图 `views/chart.js` `armNatalFit()`；② 关系合图 `views/connection.js` 经 `graph-shell.js` | ① 出生图：`fitHeight` 常开且不要求 sticky（它的 stage 决定列高），`chrome` = 容器上下内边距 + 边框 + 12；拿到预算后仍用它自己的行星列高度、变量箭头上/下行、`tight` 档位、四个宽度候选与整体缩放算出 `--bg-stage-*`。② 关系合图：`fitHeight` 仅在列真的 sticky 时生效（`requireSticky`），`chrome` = 卡片高 − 图形高；预算换算成画布宽上限，再按 `maxSlotRatio` 缩侧栏 |
| 尺寸适配未接入的入口 | — | 关系页 `#conn-graph-a` / `#conn-graph-b`（“分别查看两人的本命图”）、行运页与时间轴的图窗（`.tl-graph-panel`）、团队页 | 关系页两张单图在 `<details>` 里，`.bg-compact .bodygraph-svg { width:100%; height:auto }` 已经按宽度等比缩放，没有第二套约束需要统一。行运与时间轴走 `--tl-canvas-height` + `.tl-graph svg { width:100%; height:100% }`，是把 SVG 拉伸填满固定画布，不是等比适配问题，套 `graphFitBudget` 反而会与时间轴自己的画布高度打架。团队页渲染的是 Penta 矩阵（`createPentaMatrix`），不是人体图 |
| 关系页图/信息双栏 | `.chart-layout` + `.chart-column` + `.info-column`（与首页、Team 同一套容器）；`src/styles.css` 的 `#connection-view` 规则 | 关系页：左列是 `#conn-shell` 合图，右列是既有关系分析（概览、四种通道连接、中心状态、桥接、总结） | 只覆盖参数不重写布局：外层宽度、gutter 用 `--page-max-width` / `--page-gutter`，列模板用 `--page-columns`，粘附与滚动沿用 `.chart-column`。断点就是全站的 `--above-phone` / `--phone`（641 / 640），本页没有自己的断点：≥641px 双栏、≤640px 单栏，与首页同宽同列数。窄双栏不靠提前竖排，而是让图按可用宽高缩小（641px 时图列取 `--page-columns` 的 320px 下限、画布约 270px） |
| 关系图按视口高度适配 | `fitGraphShell(..., {fitHeight: true})` 与 `lib/graph-fit.js` 的预算 | 关系页合图（图列 sticky 时生效） | 与首页 `armNatalFit()` 同一条预算：`viewport − sticky top − chrome`，据此反推画布宽度上限，让吸附住的一整块卡片完整落在视口内。视口够高仍取 510 参考宽；矮桌面窗口（1440×700、1280×620 实测）精确贴合、零裁切。高度不受 `minCanvasWidth` 地板保护（宁可图小也不能被裁）；视口矮到连卡片都放不下（≤480px，如手机横屏 844×390）时图列改为 `position: static` 随页滚动，图回到按宽度定尺，避免永久裁切 |

| 关系页窄屏留白 | `.composite-wrap` 在 `--phone` 下 `padding: 24px 8px`；`.conn-person-side` 用 `@container` 按列宽声明 132px / 112px / 88px，图壳再按画布 28% 封顶 | 关系合图 | 与首页“画布画到容器边缘”一致，避免卡片内边距叠加图壳内边距把可点闸门挤到侧栏下面。带宽跟列宽和画布变，而不是跟视口变，因为双栏下的图列在宽屏上也可能很窄；1440/1280/1200/1199/1024/768/641/390/360 九档实测 52 个激活格全部可见、73 个中心与闸门零遮挡 |
| 图浮层与悬停反馈：共享定位机制 | `src/bodygraph.js`：浮层为 `popover="manual"` 的 `.bg-tooltip`（`showTooltip()` / `hideTooltip()` / `positionTooltip()`、`bg-focus` 类）；`src/styles.css` 的 `.bg-tooltip`（top layer 复位）、`.bg-gate-path.bg-focus`、`.bg-center.bg-focus`、`.bg-selected` | 全部 `renderBodygraph` 交互图：出生图、行运、时间轴、关系合图、睡眠图单人／合图 | 浮层是 `position: fixed`，但图壳画布 `.ohd-graph-canvas` 带 `translateX(-50%)`，且壳上还有 `container-type: inline-size`（`.dream-shell` / `#conn-shell`）与 `contain`，都会成为固定定位后代的包含块：睡眠合盘实测指针 (802,606) 而浮层落在 (1108,907)，右移 306、下移 301 并超出 1000px 视口。改为 top-layer popover 后浏览器按视口布局（实测 transform / `contain: layout` / `container-type` 三种祖先下 `left:100/top:50` 均解析为视口坐标），元素仍留在图内，因此生命周期与图同生共死：重绘随其它子节点一起替换、移除图或容器即消失、视图隐藏时 0 个 client rect 不落任何痕迹；无需共享层、注册表、观察器或额外监听，也就没有可累积的东西（e2e 以“同一容器重绘后仍只有 1 个浮层、移除后文档里浮层数量不变”锁定）。同时删除 `z-index`：top layer 不参与普通层叠，且点击闸门会立即隐藏浮层，避免它盖在详情卡之上；`inset/margin/overflow/color` 为抵消 UA popover 盒（top-layer popover 需 Chrome 114+/Safari 17+/Firefox 125+）。反馈侧：`.bg-reveal` 由 `fill-mode: both` 改为 `backwards`，否则入场动画的最终 `opacity:1` 永久压过 `.bg-dimmed .bg-center` 的 0.35，关系合图中心从不淡出（实测闸门 0.18、中心 1）；悬停/键盘焦点/固定选择除数字圆环外还给闸门楔形或中心描边（`paint-order: stroke fill`，保留来源双色填充，`.bg-selected` 自带 `--focus` 描边色），`bg-selected` 每轮对闸门与中心都按 `pinned` 重算（此前中心只移除 `bg-lit`/`bg-focus`，关闭详情后粗描边会永久残留）；键盘 `:focus-visible` 触发同一套预览，Reduced Motion 关闭过渡 |
| 图内命名覆盖：可选挂钩，默认不变 | `src/bodygraph.js` `renderBodygraph(container, chart, {naming})`：`naming.gate(gate)`、`naming.gateTooltip(gate)`、`naming.channelTooltip(channel)`、`naming.center(center)`，内部 `nameOfGate`/`nameOfCenter`/`nameOfGateTooltip`/`nameOfChannelTooltip` 统一消费 | 需要给共享拓扑换称呼的宿主（首个消费者：睡眠图把 1-8 叫「启发通道」而非清醒目录的「灵感通道」） | 只覆盖“图说出来的名字”：闸门/中心 aria、tooltip 标题、通道备注与合盘通道行。`gate`/`center` 收稳定 ID 返回纯名称；`gateTooltip` 返回纯闸门名（替换默认的 `formatDisplay('gateTooltip', 名, 卦名)`，所以不再自动附清醒卦名）；`channelTooltip` 返回纯通道名，闸门对由两处模板各自追加（单图通道备注与合盘通道行都读成「启发通道（1-8）」）；返回 falsy 回落共享词汇。不传 `naming` 时输出与之前逐字相同，其他页面零变化；自动生成的图 aria 摘要里的通道名仍取清醒目录（睡眠图已整体传入 `ariaLabel`，不受影响） |

## 梦境图 / DreamRave 睡眠图（本轮增量）

| 组件 / 状态 | 位置与 API | 实际消费者 / 场景 | 边界与遗留 |
| --- | --- | --- | --- |
| BodyGraph 拓扑选项：复用渲染器，不复制图形 | `src/bodygraph.js`：`renderBodygraph(container, chart, {topology, ariaLabel, transitModel, …})`；内部默认值 `STANDARD_TOPOLOGY`（`0 0 851.41 1309.4`，九中心全序，`gates`/`pathGates` 为 `null`，`rotate: 0`，`pathOverrides: null`）与新导出 `BODYGRAPH_PAD = 16` | 原有全部调用方（我的图／出生图、行运、时间轴、关系合图、团队、组织、Wa、Penta）不传 `topology`，行为与几何零变化；睡眠图传 `DREAM_TOPOLOGY` | 拓扑只收窄“画什么”（`gates`、`pathGates`、`centerOrder`、`viewBox`）与“怎么摆”（`rotate`、`rotateCenter`、`pathOverrides`），不改任何稳定 ID、Skin Token、高亮与行运叠加机制；被收窄拓扑排除的闸门其半通道路径一并省略，避免朝已移除中心悬空。渲染器仍无梦境专属分支。`BODYGRAPH_PAD` 此前是渲染器内部私有常量 16，本轮导出供宿主推导画布宽高比 |
| 图形旋转：新增可选能力，默认关闭 | `src/bodygraph.js` 读 `topology.rotate`（度，默认 `0`）与 `topology.rotateCenter`（`{x, y}`）：几何三个分组包进一个 `<g transform="rotate(90 cx cy)">`，defs / pattern / tooltip 留在页面坐标系；闸门数字单独加 `rotate(-90 tx ty)` 反向旋转 | 仅睡眠图（`DREAM_ROTATION = 90`、`DREAM_ROTATION_CENTER = {x: 271.4, y: 823.205}`，即正立内容盒外扩 `BODYGRAPH_PAD` 后的中心） | `rotate: 0` 时不产生包裹组，也不加反向旋转，现有页面的 SVG 结构与之前相同；旋转中心必须取“外扩后的”盒中心，取内容中心会让图形在 SVG 内偏心（单测 `tests/dream-topology.test.js` 锁定）。反向旋转只转字形，文字锚点在父级旋转下位置不变 |
| 半通道路径覆盖：新增可选字段，默认 null | `src/bodygraph.js` 的 `topology.pathOverrides`（gate → path data）；渲染时优先取 `topology.pathOverrides` 中该闸门的路径，没有才用原 `GATE_PATHS`，仅在该闸门属于 `pathGates` 时生效 | 仅睡眠图的三个门户存根（`DREAM_PORTAL_STUBS` 含 12 与 19；62 的清醒路径本就是 51.2 单位，无需 override） | 只替换 `d`，不改条宽、方向、点击热区、高亮或激活判定；默认 `null` 时走原路径。存根长度 `DREAM_PORTAL_STUB_LENGTH = 51.2`，保留目录标准的 17.4 单位条宽，只截长度 |
| 图摘要可访问名：新增可选覆盖 | `src/bodygraph.js` 的 `opts.ariaLabel`：传入时直接作为图的 `aria-label`，否则用既有自动生成的行星／类型摘要 | 睡眠图（自动摘要基于清醒图的行星与类型，与五中心睡眠拓扑不符） | 纯覆盖，不改自动摘要的生成逻辑；不传的现有消费者完全不变 |
| 几何派生：存根与旋转 viewBox 来自脚本测量 | `dev/measure-dream-viewbox.mjs`（已扩展）：从静态几何推导并输出存根路径、正立 viewBox、旋转后 viewBox、旋转中心、存根与被移除中心的相交检查 | `src/lib/human-design/dream-topology.js` 的 `DREAM_PORTAL_STUBS`、`DREAM_VIEW_BOX`、`DREAM_ROTATION_CENTER` 取自该脚本输出 | 属可复现的测量而非手填常量，重跑脚本即可校验；`tests/dream-topology.test.js` 另用同一套路径走查复算面积与转置关系，防止手改常量后失去同步 |
| 图壳与侧栏放置：直接复用 | `src/lib/graph-shell.js` 的 `graphShellMarkup({className})`、`observeGraphShell(root, {aspect, idealWidth})`；样式 `src/styles/graph-shell.css` | 睡眠图 `.dream-graph-shell`：中央画布 + 醒时／睡时两条激活侧带；`aspect` 由 `DREAM_VIEW_BOX` 与 `BODYGRAPH_PAD` 推出（(978.13+32)/(558.3+32) ≈ 1.711，横向）；`idealWidth` 由 440 调为 720 | 睡眠图只提供自己的宽高比，不重写“画布 + 左右带”规则；`--ohd-shell-*` 仍由图壳测量写入。**已知遗留**：`dream.css` 里测量前的 CSS 回退仍是正立时代的 `--dream-graph-aspect: 513 / 904`、`* 904 / 513` 算式与 `--dream-graph-ideal: 510px`，只在图壳被测量前及壳外的 `.dream-compare-graph` 生效（内联 `--ohd-shell-*` 优先），尚未同步为横向比值与 720 |
| 结构 ID 与资料同源 | `src/lib/human-design/dream-topology.js`：`DREAM_CHANNELS = CHANNELS.filter(channel => channel.gates.every(isDreamGate))`（保留 catalog 原对象引用），闸门中心沿用 `catalog.js` 的 `GATES[gate].center`，中心键沿用 `throat/g/spleen/sacral/root` | 睡眠图五中心、十五闸门、六通道、三夜域（`light/earth/demon`）与三门户（`62/12/19`） | 未复制任何一套闸门／通道／中心定义；`tests/dream-topology.test.js` 以引用相等 + 诱导子图完整性锁定，将来 catalog 增删通道会自动反映到睡眠图 |
| 术语 display(field) 模式：新增平行命名空间 | `src/lib/dream-vocabulary.js`：`dreamGateName`、`dreamLineTheme`、`dreamRealmName`、`dreamTypeName`，读 `getLocaleResources().vocabulary[field]`，缺失回落 en | 睡眠图三夜域面板、闸门行、爻主题、睡眠类型 | 与 `src/lib/vocabulary.js` 同构但独立命名空间：同一个闸门夜里含义不同，睡眠名不覆盖清醒名（`gateName/lineName` 未改）。中心、行星、通道名仍走共享 `vocabulary.js` |
| 睡眠计算层：必须新增 | `src/lib/dream-chart.js`：`solveLunarArcInstant({birthUtc, natalMoonLongitude, arc = 88, snapshotAt})`、`dreamTypeOf(definedCenterKeys)`、`dreamTypeName(id)`、`computeDreamChart(chart, {transitInstant, transit, design, snapshotAt})`、`dreamGraphChart(dream)`、`buildDreamTransitGraph(dream, mode)` | 睡眠图页面与比较模式；`dev/verify-dream-native.mjs` 用原生 SharpAstrology/SwissEph 校验真实月弧 | 引擎只给太阳 −88° 的设计时刻，没有月弧求解器，故在此用 Newton 迭代复用行运快照接口（`snapshotAt` 可注入，单测不加载 WASM/.NET、不联网）。**这一落点是定稿而非临时方案**：求解不含天文计算，实测收敛残差 0.26 毫角秒，远小于引擎自身的 20771 毫角秒月亮残差，迁到引擎层无精度收益（详见 `SLEEP-CHART-PLAN.md` §4）。睡眠类型只有 generator/projector/reflector：五中心图里喉只连 G（1-8）与脾（20-57），两者都不是马达，显示者与显示生产者结构上不可能出现，故不能沿用清醒的类型／定义规则 |
| 行运叠加模型：镜像既有契约 | `buildDreamTransitGraph(dream, mode)` 返回与 `src/lib/transit-graph.js` `buildTransitGraph()` 完全同名的字段：`mode/natalGates/transitGates/activeGates/channels/natalCenters/definedCenters/gateSource/channelSource` | 睡眠图单人页常开行运叠加（`mode:'overlay'`），以及 transit-only 分支 | 唯一差异是通道集合换成六条梦境通道，所以清醒通道（如 `34-57`：57 是梦境闸门、34 不是）结构上不可能点亮睡眠图。`dream.transit` 为 `null`（比较模式）时降级为空行运集合，不抛错 |
| 页面、样式与导航装配 | `src/views/dream.js`：`setupDreamView`、`renderDreamView`、`refreshDreamLanguage`、`invalidateDream`、`chooseComparisonPerson`、`startComparison`、`activationColumn(side, activations, when, owner)`、`fillSlot(shell, slot, columns)`；`src/styles/dream.css`（全部 `var(--…)` 与 `color-mix` 派生，0 处硬编码颜色）；`index.html` 的 `#dream-view` 区块（`#dream-time-host` 时刻控件容器、`#dream-compare`、`#dream-subtitle`）与 `data-view="dream"` 导航项；`src/main.js` 装配及语言／外观刷新钩子 | 顶级页面「Sleep chart」：时刻控件 + 左图右析，三个夜域列在图下；工具栏只剩 `#dream-compare`（「与另一个人合图」/「更换人选」） | 合盘入口在本页内：按钮 → 共享选人弹窗（单选，`exclude:[当前人物id]`）→ `getPerson` + `birthFromPerson` + `computeChart` 算第二个人的清醒图 → `setDreamComparison` 落状态。合盘记住产生它的 `forChart`，换人即丢弃。比较模式传 `{transit:false}`；`{design}` 复用已解出的月弧。**旧的 `#dream-refresh`「刷新天时」按钮已删除**：其功能被共享时刻控件的 Now 按钮完全覆盖，留着就是第二个同一动作的入口（`ui-dream.json` 的 `"Refresh night sky"` 键同步删除）。时刻变化走 `computeDreamChart(chart, {transitInstant, design: 上次的 solve})`：同人同刻直接用缓存模型不重算，改时刻只花一次星历快照，月弧牛顿迭代不重跑（e2e 以 `#dream-provenance` 文案不变锁定）。合图模式下 `#dream-time-host` 置 `hidden`，因为合图不叠加行运，摆一个改不动的时刻会误导 |
| 合图与单人同一套组件 | `drawComparison()` 复用同一个 `graphShellMarkup({className:'dream-graph-shell'})`、同一个 `renderBodygraph(…, {topology: DREAM_TOPOLOGY, planetColumns:false, composite})`、同一个 `activationColumn()` 与 `fillSlot()`；侧栏行复用 `bindRowHover()` + `bindGateDetails()` | 单人：左插槽 = design 列，右插槽 = personality 列（各 1 列，markup 与之前完全一致）；合图：左插槽 = A 的 design + personality，右插槽 = B 的 design + personality（每侧 2 列，包在 `.dream-columns` 里） | `side` 语义与 `dream-column-${side}` 类名不变，`owner` 只加在标题前缀（`本人 · 睡眠设计`，用 `formatDisplay('separator')` 拼接，不新增 join 键）与 `data-owner` 上。合图侧栏行点开的是 `detail.showGate()`，`detailContext` 是 `{composite:{labelA,labelB}, a, b, dream:null, model:null}`，弹窗报「谁携带这个闸门」，与图的 `onGateClick` 同源，不会串到单人语境（e2e 断言弹窗里没有「清醒人格」三来源块）。归属色仍取 `compositePalette()`（`skin-registry.js`），dream 内不定义第二份 |
| 睡眠图详情的信息层级（本轮修正） | `src/lib/dream-detail.js`：`dreamGateHeading()`、`dreamChannelHeading()`、`showType('waking'|'dream')`、`renderDreamTypeReadingBody()`；`src/views/dream.js` 的 `typeStrip()` 把两颗类型 chip 变成按钮（`data-dream-type-open`）；`src/styles/dream.css` | 睡眠图的闸门/通道/六爻弹窗、类型条、三域面板与合盘 | 弹窗只承载一层内容：闸门/通道/六爻只印梦境解读，清醒长文不进（原先并排的 `[data-waking-reading]` 块与 `renderSharedGateReading`/`renderSharedChannelReading` 的两个消费者已移除；共享资料本身未动）。标题走梦境词汇：闸门=`dreamGateName`、通道=`dreamChannelName`，清醒名与卦名都不打印，夜域/门户降为次级 tag，重复对象名的 `.dream-detail-tag-name` 已删除。类型条是「清醒 [类型] → 梦境 [类型]」两颗按钮，类型名为纯名称（`DREAM_TYPE_ZH` 去前缀），各自开一个类型详情：清醒侧读共享 `typeDescription()`/`strategy()`/`signature()`/`notSelf()` 并显式接收本人物睡眠模型里的清醒类型名，梦境侧读 `dreamTypeReading()`；两者复用 `detail-dialog.js` 生命周期与 `.detail-label`/`.detail-name` 标题类。行星阅读移到激活来源之后、六爻之前。六爻仍是六份共享，只去掉「清醒状态」那一段显示，`DREAM_LINE_READING_*` 正文未改。通道标题去掉了清醒体系的回路 badge（`renderChannelCircuitBadges` 不再被消费），中心详情改用共享 `.detail-name`（`centerName()`，中心的标识就是名字，故不加眉标），不再用 `.panel-title`。英文显示「Dream personality / Dream design」由英文消息表覆盖这两个稳定键实现（键名与 `dream-chart.js` 的 label 契约未动，`tests/dream-chart.test.js` 不受影响）。**合盘事实块每人四个按钮**：A/B × 清醒/梦境，chip 复用单人的 `.dream-type-chip`，`showType(side,'a'|'b')` 带 owner 打开对应人物的类型（`data-owner` 可定位，不读全局当前图），标题里的姓名单独成 `.dream-detail-label-owner`（`.detail-label` 会转大写，姓名是数据）。**合盘通道完成度**：`compositeChannelStatus()` 用渲染器的 `channelDynamic()` 判完成、用两人各自闸门集判 a/b/both/halved，与页面通道行同一口径（原先读 `data.model`/`data.dream`，两者在合盘为 null，于是所有通道都写成「未完整」而正文按已接印）。单人仍走 `model.channels` + `channelSource()`。**弹窗生命周期**：关闭同时清 `history` 与 `current`，关闭 A 再开 B 不会凭空出现「返回」；`kind:'type'` 走 `setPinned(null)`，不向渲染器 pin 不存在的几何对象；换模式（单人 ↔ 合盘）时类型弹窗关闭而不是换人重画。**高亮双向**：`dreamHighlightRows()` 是一个共用 `onHighlight` 回调（对齐 `views/chart.js` 的 `highlightPanelRows()`），单人睡眠图与合盘图都传，重绘时按 gate ID 点亮 `.dream-column-row` / `.dream-realm-row`，两条闸门同时点亮才点亮通道行；`.row-lit` 的样式由 `dream.css` 为自己的行声明（共享 `styles.css` 未改）。**触摸一致**：合盘补 `touchPreview: true`，拖动不开详情、轻点预览、再点打开。**命名接口调用已接**：`views/dream.js` 的 `dreamNaming`（`gate`/`gateTooltip`=`dreamGateName`、`channelTooltip`=裸梦境通道名、`center` 沿用共享默认）传给单人与合盘两处 `renderBodygraph()` 的 `opts.naming`（接口由图形实施在 `cd717f3a` 提供，本分支未改渲染器；真实 tooltip 待两路集成后验证） |
| 睡眠图触控目标：只在粗糙指针/手机放大 | `src/styles/dream.css` 的 `--dream-tap`（默认 `0px`，`@media (pointer: coarse), (--phone)` 置 `44px`）与两条规则：`.dream-row-open`（同时 `min-width`，360px 下它只有 18.8px 宽）、`.dream-type-chip` | 睡眠图页面自有入口：夜域闸门按钮、类型 chip（单人 2 个、合盘 4 个） | 桌面细指针保持原紧凑行高。实测触控上下文 360/390：`.dream-row-open` 16.8→44（宽 18.8→44）、`.dream-type-chip` 23.4→44（合盘四个均 44），页面横向溢出 0，`tests/mobile/dream-mobile-acceptance.mjs` 40/40。**`.dream-column-row` 有意不放大**：激活列位于 `.ohd-graph-slot`，按 `graph-shell.css` 的设计压在画布之上（"both over the canvas"），360px 下 `elementFromPoint()` 在闸门 8 圆心已经命中 `.dream-column-row`；把 16.8px 行填到 44px 会堵住行间缝隙，翼侧闸门被列表抢走（`every gate is reachable` 变红，实测 38→8、20→57）。要两者兼得需外壳为侧带留空间或手机下移到画布下方，属 `graph-shell.css` 的范围。图内闸门命中圆未改（360px 15px、390px 16px），放大到 44 会让相邻闸门重叠 |

### Skin 与设计系统

`dream.css` 只声明 Token 与墨色，不声明第二套布局：页面外框宽度、居中与 gutter 继续来自 `.view-section` / `.view-container`。全部颜色都是既有 Skin Token 或对它的 `color-mix` 派生——`--dream-surface: var(--hd-graph-panel-bg)`、`--dream-edge: var(--hd-graph-panel-border)`、`--dream-column-accent` 取 `var(--hd-design)` / `var(--hd-personality)` / `var(--hd-inactive)`、`--dream-realm-hue` 与 `--dream-realm-ink` 取 `var(--hd-transit)` / `var(--hd-both)` / `var(--hd-design)` / `var(--hd-inactive)` 及其 `-on` 对应项——间距、字号、圆角、阴影沿用 `--space-*`、`--font-size-*`、`--radius-*`、`--shadow-sm`。因此没有新增 `skin-registry.js` 分组，也没有自己的明暗分支，全部已注册 Skin（含明暗对与高对比度）自动生效，`--dream-*` 只是本页可读性别名而非新颜色语义。

### 多语言与术语

睡眠专属名词走 locale 的 `vocabulary.dream*`：en 内联在 `src/locales/en.js`，zh-CN 与 zh-Hant 各新增 `dream.js` 并由各自 `index.js` 挂载；页面文案在 `src/locales/zh-CN/ui-dream.json` 与 `src/locales/zh-Hant/ui-dream.json`，英文原文即 key，经 `t()` 与 `setMessage()` 渲染，与 Team／Wa 的分文件注册方式一致。内部身份始终是编号与稳定 ID（闸门号、`1-8` 形式的通道 key、`light/earth/demon`、`generator/projector/reflector`），翻译文字不参与对象身份或匹配。术语来源登记见 [../../THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。

**行运术语统一**：睡眠图曾把同一批叠加激活叫「天时／night sky」，与行运页的「行运／流日／Transit」分叉。现全部改走共享 UI 键 `"Transit"`（`src/locales/{zh-CN,zh-Hant}/ui-transits.json`，en 为源 key 本身），页面内只留一个 `transitTerm = () => t('Transit')` 取值点；`ui-dream.json` 里 6 个相关键改成参数化（`{transit}` 注入），独立标签键 `"Night sky"` 删除，调用处直接读 `transitTerm()`。要改回「天时」只动 `ui-transits.json` 的 `"Transit"` 一处（以及 `"Transits"` 导航键）。页副标题带参数，故由 `setTransitSubtitle()` 用 `setMessage()` 写入——参数随节点记录，`translatePage()` 在语言切换时能正确重填。

### 数据上下文独立性

`computeDreamChart(chart, options)` 只消费传入的 chart 与注入的 `snapshotAt`，不读全局当前人物，也不改传入对象；`dreamGraphChart(dream)` 是显式适配层，把睡眠模型整形成 `renderBodygraph()` 既有消费契约（`gates.personality/design/all`、`channels`、`centers.definedNames`、`type.name`、`positions.personality.date`、`positions.design.date`），共享渲染组件不等于共享业务状态。行运时刻显式传 `transitInstant`，缺省才取 `Date.now()`；`contractVersion: 'dream-v1'` 标记模型契约，计算规则与存储契约未改。

### 已验证与未验证

已验证（`node --test tests/dream-topology.test.js tests/dream-chart.test.js`，本轮实测 29 项全绿）：十五闸门／六通道／三门户／**十五**路径闸门／三夜域划分的定义性不变量；梦境通道与 catalog 引用同源且诱导子图无遗漏；十五闸门全部落在五个保留中心内，四个被移除中心无残留闸门；不存在连接喉与马达的梦境通道，`dreamTypeOf` 对 32 种中心组合只返回三种类型；门户存根是沿清醒方向的短条（中线长 ≈ `DREAM_PORTAL_STUB_LENGTH`、条宽与清醒路径一致、仍贴着闸门圆），且 12 与 19 的存根与四个被移除中心均不相交，62 与 ajna 的重叠被锁定为 10 单位以下的小缺口；`DREAM_VIEW_BOX` 四值为正有限数、宽高比落在 1.6–1.9（横向）、面积等于正立内容盒外扩 `BODYGRAPH_PAD` 后的面积且两边互换、`Object.isFrozen`；`DREAM_ROTATION = 90` 且旋转中心等于外扩后盒的中心、旋转前后两盒同中心；`DREAM_TOPOLOGY` 形状契约（含 `pathOverrides` / `rotate` / `rotateCenter`）与 `CENTER_SHAPES` 键存在性；月弧求解在合成星历（瞬时速率 11.38–14.98°/天）下收敛，残差 <1e-6、步数 ≤12、`snapshotAt` 调用次数等于步数，0° 缝合两侧（target 与迭代路径）均正确；错误路径（非有限 `birthUtc`/`natalMoonLongitude` 抛 `RangeError` 且不消耗引擎往返、快照缺 `moon.longitude`、月亮不动报 did not converge 且迭代有上限）；非梦境闸门 30/44/64/14/34 在三侧全部被过滤；`gates.all` 升序去重；通道—中心—类型自洽；三夜域行归属与门户保留规则；`dreamGraphChart` 的渲染消费契约；`buildDreamTransitGraph` 的四态 `gateSource`、三态 `channelSource`（含天时补全 `completed`）、transit-only 只含天时闸门、清醒通道 `34-57` 不可出现、构建过程不改动输入模型；`{design}` 复用只花一次天时快照、`{transit:false}` 完全不触星历。

真实浏览器已实测（主代理，1440×1000 视口）：SVG 720×421、宽高比 1.71；五个中心方位为 throat cx=930 / g cx=777 / sacral cx=557 / root cx=399（同在 cy=639 水平带）、spleen cy=401 在上；15 个闸门数字 bbox 均高大于宽（两位数 16×19），证明文字正向；390×844 手机视口横向溢出 0px。旋转前的 e2e 另有 13 项通过记录（5 中心、15 闸门、viewBox 精确匹配、类型条、三域、行运叠加、溯源行、悬停联动等）。

本轮（行运术语、共享时刻控件、合图双侧行星列）实测：`node tests/dream-e2e.mjs` 41 项全绿（含新增的时刻控件挂载、改时刻后叠加确实变化且月弧不重算、合图左右插槽各 2 列且左右归属正确、合图侧栏行开合图归属弹窗、合图时控件隐藏、单人仍是 design+personality 两列、语言切换后状态行不复活）；行运侧 `sharp-transit-e2e`、`transit-window-reuse-e2e`、`reference-v1-acceptance-e2e`、`chart-data-export-e2e`、`e2e`、`timeline-mobile-layout-e2e`、`timeline-gestures-e2e`、`transit-source-strategy-e2e` 全通过。视觉实测：1440×900 与 390×844，单人／合图，default-light／default-dark／high-contrast，简中／繁中／英文；手机合图横向溢出 0px，4 列堆叠于两侧 88px 带内（`--ohd-slot-content-width` 随容器查询由 108→128→88），画布 342×200。

本轮顺手修掉的既有缺陷：`#dream-status` 用 `setMessage()` 写入后只 `replaceChildren()`，节点上残留 `data-i18n`，导致计算完成后切换语言会把「正在计算睡眠图……」重新写回已完成的页面（基线 9702b9d 同样可复现）。现由 `clearStatus()` 同时清 `dataset.i18n` 与文本。

**页面状态边界**（`tests/dream-state-boundaries-e2e.mjs`，12 项）：三个「异步求解回来时页面已不是发起时的状态」的竞态已修——合盘发起时捕获主人物身份与 B 的出生指纹（合盘另有独立 `comparisonSequence`）、无效时刻三态区分且阻止求解并显示 `.dream-moment-invalid`、B 的身份与指纹由本页自己的 `onPeopleChange` 订阅守卫（删除／改出生字段丢合盘并提示，仅改名保留已解模型只换标签）。另补了三个跨计数器空洞：单人慢解不能盖合盘、`samePairIsCurrent()` 自己读实况（不再是死代码）、B 在计算期间被删/改时不再空转到永久 Computing。测试用拦截模块 + 测试显式放行门确定性地制造交错；未修基线首轮 6/9、第二轮 2/12 失败。细节与运行方式见 [SLEEP-CHART-PENDING.md](./SLEEP-CHART-PENDING.md) §3.14。

未验证：真实 SwissEph/WASM 星历下的月弧数值与 `daysBeforeBirth` 实测分布（`dev/verify-dream-native.mjs` 需要本机 DOTNET，不在单测内运行；合成星历下同一相位差可落在 5.93–7.59 天，即 6.0–7.5 的窗口是夹具性质而非普适上界）；旋转与存根之后的全量 e2e 重跑、全部已注册 Skin 在横向图下的逐个视觉走查、键盘与触控、语言／外观切换重绘、横向图与三域面板的重排；合盘 composite 与点击详情弹窗仍由并行实例施工中，本文档不宣称其可用。按 AGENTS.md 的 preview-first 节奏，全量回归等用户验收方向后再跑。
