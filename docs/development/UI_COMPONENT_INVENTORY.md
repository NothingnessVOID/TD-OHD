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
| Team多选：独立业务草稿，公共弹窗承载 | `src/views/team.js` `picker()`；`person-editor.js`增加兼容`onCancel` | Team当前组合；搜索/多选/满员替换，编辑返回 | 确认才提交组合，人物资料保存本身独立；全局选择器、首页chips、关系选择器仍有不同业务语义 |
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
