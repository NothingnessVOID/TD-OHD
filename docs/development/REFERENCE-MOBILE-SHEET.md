# 资料库手机详情补修

基线25cf0f0。手机资料库复用detail-dialog生命周期、renderDetailNavigation及gate-detail底部弹窗样式，真实遮罩取代伪元素。右上返回退关联历史一级，关闭/Escape/遮罩直接回列表；正文点击不关闭。

关闭沿列表来源的History depth返回列表；无列表来源的深链以replaceState切到列表。路由重绘/离开视图只清理sheet，不触发用户关闭回调。列表滚动和焦点恢复，popstate/hashchange连续重绘时保留焦点。桌面详情节点回原双栏，不改变桌面样式。

验证：reference-mobile-sheet-e2e在320/390×三语言通过，覆盖闸门、通道、中心、回路/回路组、行星、知识、无效地址、正文/遮罩/Escape、返回/关闭、深链与前进后退、列表位置/焦点、Tab循环、桌面resize。既有reference-e2e桌面/手机通过；静态Vite构建与diff检查通过。未运行全量回归或真实手机/Safari。现有字体路径运行时解析提示和chunk提示保留。

截图见[screenshots/reference-mobile-sheet](screenshots/reference-mobile-sheet/)。本轮不改Issue24或Penta样式，不合main、不部署。
