# Penta 最后一轮交互与细节优化

基线本地/远端均为fbda783，起点干净。开发分支dev/windows-development；不合main、不部署。

## 改动

- 六条通道标题使用公共detail-label/detail-name视觉，编号通过t、名称通过channelName；正文和状态/贡献保留。
- penta-state-symbol.js提供同一SVG符号：断线空心端点=未覆盖；实心同形端点连接=单人完整；实心/空心异形端点加接合点=跨成员补全；双层轨道=两种连接同时成立。图、图例、卡片共用，保留文字。未更改节点/连线坐标、线条状态、五成员色或算法。
- 图形、六通道/十二门整卡、成员贡献快捷入口均调用现有showDetail，不自动滚动。整卡没有嵌套按钮，具备role=button、tabindex、aria-haspopup，支持Enter/Space、可见焦点和轻微hover背景。
- selectObject仅更新高亮；关闭/返回/焦点由既有公共详情控制器管理。

## 资料同源核查

chart.js出生与行运路径、reference.js资料库、Penta adapter均调用renderSharedGateReading/renderSharedChannelReading，最终读取reference-content.js的gateReading/channelReading。公共标题模块及页面名称使用vocabulary的gateName/hexagramName/channelName，回路来自channel-badges。没有新增名称映射或复制正文。Penta贡献/状态显式传ctx，专属解读仍执行现有review/evidence/interpretationStatus门槛。本轮未修改知识正文、审核数据、存储或计算。

## 验证

以下在9961隔离虚构浏览器上下文通过：

- penta-direct-details-e2e：18张可访问整卡且无内部交互嵌套；图形按钮、SVG连线、整卡、贡献快捷入口打开/关闭不改变页面位置；焦点返回、Enter/Space、手机触控；六条标题逐项核对三语言；使用真实Penta计算构造四种状态并核对三个展示位置图标。
- penta-natural-scroll-e2e：原定位断言改为直接详情/页面位置不变；Sticky、主页面滚动、6/12数量、成员编号稳定、1440/1280/390和短屏保持。
- team-selection-flow-e2e：3–5人、多选取消/编辑返回、保存、跨组与revision冲突等通过。
- team-direct-e2e：将旧checkbox+calculate界面迁移到当前多选自动分析，保留2/3/5和上限、十人5+5保存重开、未知时间、修改删除与跨标签失效检查，直接弹窗键盘路径通过。
- team-layout-dialogs、team-ui-unification、object-detail-heading浏览器脚本同步移除旧定位/独立按钮断言，并通过当前交互。已有Skin捕获循环仅做功能检查，没有精修。
- object-detail-heading单测3项通过；静态Vite构建与diff检查通过。既有chunk大小提示保留，复用现有WASM。

初次三语言断言因detail-label的CSS uppercase导致innerText为CHANNEL而失败，改读textContent核对翻译；视觉继续沿用成熟样式，未改变术语。

未运行全量测试、完整天文/时间轴回归、真实移动设备或其他浏览器。历史审计问题仍按已有记录保留。

## 截图

[桌面与标题](screenshots/penta-direct-details/01-desktop.png) · [四种符号](screenshots/penta-direct-details/03-four-states.png) · [手机详情](screenshots/penta-direct-details/05-mobile-detail.png)

同目录包含英文、繁体和简体六通道标题的实际截图。截图和测试均为虚构人物，不涉及用户浏览器资料。
