# Penta 图形与自然滚动修复

基线：本地和远端 `dev/windows-development` 均为 `8d9d141`，开始时工作树干净。仅修复Team/Penta视觉与交互，不改算法、存储契约或知识审核。

## 回退原因与恢复范围

1. `tokens/team.css`把Phase1C的五个成员分类色改为灰度，削弱人物辨识；本轮恢复原五色并保留集中Token。
2. 选人控件和图共占固定高度左栏，图例被压缩，图形可用高度不足。移出操作区后恢复旧版图形几何和图例尺寸。
3. 右侧独立scroll、固定工作台高度、负边距补偿和mask均基于已废弃的交互目标，本轮全部移除。
4. 详情成员仅文本且旧颜色作用域限于`#team-view`，body级弹窗无法得到一致身份标记；本轮图、Chip、分析、两种详情共用五色编号。
5. 操作窗口虽然共用生命周期，管理成员行仍被多个按钮挤碎；本轮只调整层级/间距/动作区。

已查看`5795863`、`fe4e5fd`、`aa345313`历史源码与指定`phase1c-polish/team-desktop-1280.png`。原节点84×64、坐标网格、viewBox 320×410及线条状态保留，不回滚整个renderer或管理流程。历史对照脚本使用同五位虚构人物、同一份当前计算结果和相同440px图形尺寸，分别加载历史/8d9d141/修复renderer；这验证展示差异，不声称重跑历史天文引擎。

## 最终行为

- 顶部紧凑操作面板横跨内容宽度；下方52/48双栏，整体1200px最大宽度，沿用chart-layout/chart-column/info-column与panel。
- 仅左图Sticky，右侧自然document滚动；图尺寸受视口高度和440px上限约束。平板/手机单栏。
- 点击图形通过scrollIntoView和scroll-margin定位正文，顶部导航不遮住标题。删除右侧scrollTop控制，重绘不主动跳页首。
- 五色编号贯通所有成员归属。当前组合显示层保留存活成员颜色槽；移除别人不会使其重编号。颜色槽不写入TeamRepository，刷新/重新加载仍按组合顺序初始化。
- 通道详情顺序为公共标题/回路、当前状态、端点及单人/跨成员贡献、核实专属资料、共用正文、原有transit-detail-link关联闸门卡片。闸门按成员分组，身份色与P/D来源色分开；四透镜不增加第五栏。
- 保存窗口有取消/保存动作区；管理窗口姓名、分组与动作分层；切换入口显示当前组。选择草稿及person-editor不重写。

## 验证

通过：静态Vite构建（复用WASM）、3项object-detail-heading单测、自然滚动浏览器检查、原多人选择流程检查、diff检查。

浏览器覆盖：1440×960、1280×800、1280×640、390×844；document实际滚动、右侧overflow visible/scrollTop为0、Sticky在导航下、图文定位、6通道/12门、多成员详情、关联跳转、成员移除后编号稳定、操作窗口与原选择/保存/冲突流程。主要视觉检查使用默认亮色，附默认暗色和High Contrast的三语言必要检查；没有开展11套Skin精修。

真实文档底部可能仍有空间容纳较短的图，因此不要求它在最后一帧必然上移。另用测试临时尾部空间验证当分析区域底边接近图时，Sticky严格受父区域边界限制；临时元素随后移除，不进入产品。

检查中发现并修正两处测试假设：旧纯文本h4断言更新为彩色编号及同名独立分组；动态导入Team刷新在开发服务中拿到独立模块状态导致超时，改为点击实际语言/Skin控件。滚动截图等待位置及绘制稳定后重拍，避免中间空白帧。

未执行：完整回归、其他浏览器/真实手机、全站可访问性审计、天文重算认证。原大chunk警告保留。先前独立右栏滚动的`team-layout-dialogs-e2e`、`team-ui-unification-e2e`属8d9d141历史验收，滚动断言已被新需求替代，本轮以`penta-natural-scroll-e2e.mjs`验收；未将旧套件声称为通过。

## 实际截图

- [同数据：历史／修改前／恢复后图形](screenshots/penta-restoration/01-graph-history.png)
- [主页面连续滚动与Sticky](screenshots/penta-restoration/02-page-scroll.png)
- [出生图与Penta闸门、多成员贡献](screenshots/penta-restoration/03-gate-details.png)
- [通道及关联闸门卡片](screenshots/penta-restoration/04-channel-details.png)
- [添加、编辑、保存、管理、切换窗口](screenshots/penta-restoration/05-operations.png)
- [桌面、短屏和手机](screenshots/penta-restoration/06-responsive.png)
- [代表Skin与三语言](screenshots/penta-restoration/07-languages-skins.png)

图片为实际浏览器截图缩放拼接。原始图和同一计算上下文在忽略目录`artifacts/visual-review/penta-restoration/`；重现脚本`tests/penta-visual-history.mjs`、`tests/penta-natural-scroll-e2e.mjs`及`tests/assemble-penta-restoration.mjs`。只推送开发分支，不合main，不发布正式站。
