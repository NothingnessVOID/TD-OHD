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

## 数据边界

共用展示不共享业务状态：Penta使用当前`result/people/groupLabel`，出生图与行运通过自己的图表与上下文传入。稳定人物、成员、组合ID及TeamRepository v2由既有业务层维护。本轮UI统一不改天文计算、Penta拓扑或知识审核状态。
