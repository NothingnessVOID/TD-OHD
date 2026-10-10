# Issue #24：通道回路标签与Penta状态标签

起点f20f7a8，工作树干净，远端一致。问题来源：https://github.com/NothingnessVOID/TD-OHD/issues/24 。

两个分类badge原为三个flex项目中的两个，被space-between拉开，并叠加6px左margin。修复在既有renderChannelCircuitBadges中增加专用成组容器，内部4px gap、禁止组内断行；标题改为靠左自然流，容器整体可换行。不全局清除circuit-badge边距。所有既有调用者（出生/行运/资料库/Penta等）同步获得结构。

详情标题取消为导航永久压缩整行宽度的右padding，改为顶部预留24px；手机含拖动条时40px，保留返回/关闭按钮空间。行运带时间区布局沿用现有结构。

Penta补充：600px以下六通道的状态在标题下方显示；图标尺寸18px、与可换行文字首行对齐，5px间距。当前详情状态标签margin-left=0、允许自然换行。四种文字、SVG图案、分类数据、成员颜色、计算和审核完全未改。

## 验证

- channel-label-layout-e2e：出生图、资料库1280/390/320及三语言；真实行运390/320；Penta实际计算得到四状态，390/320三语言。检查两个分类标签同排、间距4px、无越界及导航重叠；6张状态卡图文间距5px、文字首行对齐、标题不被挤压；Penta状态margin为0。11个Skin下标签几何检查通过。
- object-detail-heading单测3项通过。
- 静态Vite构建、diff检查通过。既有字体public相对URL提示和chunk大小提示保留。
- 首轮320px发现导航区域重叠，补手机拖动条高度后复测通过。资料库覆盖页头导致测试不能直接切语言，改为回普通页面操作；合成四状态测试容器独立，避免被页面语言刷新替换。未跳过断言。

未执行全量回归、真实手机/其他浏览器、完整时间轴回归。不关闭GitHub Issue或发评论；只提交开发分支，main及生产不动。

截图在[screenshots/channel-labels](screenshots/channel-labels/)，包含320/390px Penta长状态卡与详情、出生/资料/行运例子，results.json保留测量。
