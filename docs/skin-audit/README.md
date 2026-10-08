# 全站视觉系统审计 V1

本次只盘点网站现有视觉来源，没有改变颜色、字体、布局、Skin 行为或任何计算。基线为最新远程 main `a5485015f23ef31ca8227df2a2eaf2290a08e266`，工作分支为 `audit/skin-system-v1`。

## 总体结论

互动网站已经有网站、Human Design、关系合图的语义 Token。实际视觉还来自局部 CSS、SVG 几何与透明度、用户 inline override，以及独立的服务端分享图和 HTML 模板。现有 Chakra 是九中心配色，不是覆盖整个网站的完整皮肤。网站 Skin API 已预留，但实际只有 default 样式。

| 指标 | 数量 / 口径 |
|---|---|
| 全仓可解码文本文件 | 1,116；Git 跟踪文件，排除本次审计目录与二进制 |
| 唯一视觉 custom property 名称 | 191；含兼容别名、局部变量、字体/布局与游标位置 |
| 颜色 Token | 156；含透明填色和别名，不含阴影复合值 |
| 阴影 Token | 4；site-auth-shadow 仅存颜色，计入颜色 Token |
| 字体、尺寸、透明度、布局等非颜色 Token | 30 |
| 有色运算/条件计算的颜色 Token | 24；不把纯 `var()` 别名算作色运算 |
| 含 `var()` 依赖的颜色 Token | 85；与上述 24 有重叠，不可相加 |
| 集中 Token 文件之外的硬编码颜色候选 | 68 个源码行；一行多个字面量仍计一处 |
| 第一方运行源视觉命中 | 1,585 行；包括继承、透明、动态属性和非颜色规格 |
| 第一方排版命中 | 528 行 |
| 全仓原始视觉命中 | 1,892 行；含测试/历史文档/工具，不能当成生产缺陷数 |

统计是源码范围，不是页面执行次数，也不是唯一色值数量。`--bg` 等同名变量在 SPA 与 Worker SEO 分属不同文档；名称去重仅用于盘点。191 不等于 191 个可选皮肤设置。

## 文件与证据

- [Token 全表](token-inventory.md)：每个声明的值、条件、引用位置、语义、派生/别名、用户自定义入口。
- [硬编码](hardcoded-visuals.md)：68 行运行颜色候选及非颜色固定参数。
- [字体](typography.md)：字体加载、使用路径和完整排版命中。
- [运行逻辑](appearance-runtime.md)：选择、存储、覆盖、恢复与通知链。
- [问题与风险](issues.md)：结构问题分类；没有实施方案或改动。
- [机器证据](scan-evidence.json)：全部命中原行和 Token 依赖，含测试/文档/工具的独立标记。
- [扫描器](scan.py)：只读取 tracked 文件，仅重写本审计目录的证据与三份盘点文档。复查命令：`python3 docs/skin-audit/scan.py`。

本次进行了全仓文本扫描，再检查实际 renderer 和消费路径。未执行 app/build/E2E，未安装浏览器或编译工具；没有以静态审计替代视觉或可访问性测试的结论。

## 按表面分类

| 实际用途 | 当前来源 / 消费者 |
|---|---|
| 页面、卡片、浮层、下沉背景 | `site-default.css` 的 bg/elevated/sunken；Header、Form、Reference、Popover、dialog 消费 `styles.css`；图表面板另外经过 `--hd-*-bg/border` 别名 |
| 主/次/弱文字与边框 | text/secondary/tertiary、border/subtle；Knowledge 局部 `--knowledge-color` 默认 accent |
| Accent、hover、状态、focus | accent 系列、独立 status 系列；focus 跟随 accent；类型产品 badge 与 HD 类型颜色分别存在 |
| Shadow、遮罩 | shadow-sm/normal/lg、lens-active-shadow、site-auth-shadow；modal-backdrop 与 modal-overlay 不同表面、透明度不同 |
| 本命激活来源 | HD personality/design/both 及 on 字色；Both 有色 Token，也有双方斜纹，不能视作所有 Both 显示都用单色 |
| 行运 | hd-transit 原色、transit-text 可读文字、transit-soft 浅底、tl-transit 时间条派生色；对应消费路径与用途不同 |
| 未激活与未定义 | inactive 通道/闸门底、inactive-on 数字、undefined 概念、undefined-center 实际中心底、undefined-fill 透明占位各自独立 |
| 九中心 | 9 个 edge 与 9 个 core；`bodygraph.js` 动态读取，中心 SVG radialGradient；Chakra 改 edge，core 继承计算 |
| 类型与回路 | 5 个 hd-type 颜色；individual/collective/tribal/integration 主色与 soft 色；子回路 badge 继承父组色，未建七套新 palette |
| 图表交互 | graph-bg、panel、tooltip、detail、legend、selection-ring；数字字号/字重/基线、通道/圆底/斜线透明度、外圈宽度已有 Token，临时中心 fill-opacity=.5 仍写在 renderer |
| Relationship | A/B/bridged、on/core 已 Token 化；Both 为 A/B 条纹并有独立字色；电磁独立 token；companionship/compromise 借用回路色，dominance 借用弱文字色 |
| Team / Penta | `views/team.js`、角色卡/缺失状态与共享网站 Token；关系项目借用 electromagnetic；计算文件 `penta.js` 未承担皮肤选择 |
| Typography | font/font-serif、局部字号/字重/行高/字距；BodyGraph 数字部分 HD Token；Planet glyph 直接 Georgia；Canvas 与服务端 SVG 单独控制 |
| 分享与服务端 | 浏览器 PNG 克隆当前 computed SVG；`svg-renderer.js` 为 Worker OG/chart.svg/MCP 输出独立 light/dark palette；SEO/OAuth/邮件/MCP HTML 有局部颜色/字体 |

公共 Back/Close/Icon 已共享 `.ui-back-button`、`.ui-icon-button`；Timeline 以 `--ui-icon-*` 局部覆盖 surface/border/text。Reference/Knowledge 的卡片、modal/popover/header/form大多继承网站 Token；字号与透明度仍局部定义。没有把所有 inline style 都判成硬编码：关系颜色等 inline style 的值实际来自 Token。

## 24 个派生色 Token

| 族 | 个数 | 当前运算 / 原因 / 消费 |
|---|---:|---|
| accent-soft/hover/strong/on | 4 | 默认是固定值；用户自定义 accent 后，soft=accent16%+bg，hover/strong=accent75%+text，on 用亮度阈值选择深/白字；按钮、强调文字、选中态 |
| 九中心 core | 9 | 与 white 混色；明/暗比例不同（全表列明），用于中心径向高光；Chakra edge 自动参与，不是第二份固定中心色 |
| transit-text/soft | 2 | 文字明亮模式 transit65%+#16130f、暗模式直接原色；浅底明亮 transit9.8%+bg、暗 transit10%+#111516；行星列/fixing 与浅底 |
| connection a/b/bridged core | 3 | 与 white 混色，明73/69/71%、暗86/82/85%；关系中心径向高光 |
| tl-transit/date-even/date-odd/day-even/day-odd/day-divider | 6 | 行运75%+#445457；日期格surface85%+secondary、surface92%+tl-transit；日覆盖sunken13%/transit6%+transparent、分隔secondary12%+transparent；时间轴轨道背景 |

另有没有命名 Token 的派生表达式：Timeline 选择 glow 70%/67%/50% 与 mobile 浮层 surface94% 混透明、Knowledge 分支选中底 knowledge-color7%+sunken。它们记录在原始属性证据中，不混入 24 的具名计数。渐变条纹也不是颜色 Token 运算。

## 审计边界

1. 所有 Git 跟踪文本均扫描；PNG、字体、WASM 等二进制不作字面量统计。`public/og.png` 是静态分享视觉，不能随当前用户 Skin 变化。年度 JSON 是计算数据，不按数值或字段名称推测成 palette。
2. 不扫描本机账户资料库、历史 Downloads/教材或 node_modules。未读取外部内容，不研究 Human Design 文案。
3. 原始扫描并非完整 CSS/JS parser；声明和人工核对的动态中心读取已纳入，URL 编码 favicon 已解码。DOM computed 值、浏览器字体实际 fallback 和对比度未实测，风险明确标记。
4. Worker 表面是否上线取决于部署路由。这里只证明第一方代码有输出路径，不宣称 Netlify 的每个 Worker endpoint 都在运行。
5. 源文件只读，审计修改仅在 `docs/skin-audit/`。没有修改 Relationship、Penta、DreamRave、Skin UI 或引擎。
