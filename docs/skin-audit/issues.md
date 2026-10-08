# 结构问题与风险

本文件仅记录当前证据及影响，不实施更改、不裁定将来派生色应保留还是取消。优先级表示值得先理解的结构范围，不表示每个字面量都是 bug。

## 最优先的五项

| ID / 分类 | 证据 | 当前问题与风险 |
|---|---|---|
| SKIN-01 / A 硬编码、B 重复来源 | `src/lib/human-design/svg-renderer.js:29-60,213-225,272-283`；`worker/og.js`、`worker/seo.js:100`、`worker/oauth-ui.js:20-29` | 互动 Token 与服务端 SVG/分享卡/HTML palette 是平行来源。分享 renderer 两种卡还重复 Type palette。暗色/类型当前数值已不同；用户 Skin/override 不能透传，改 SPA 不代表所有视觉输出都改变。 |
| SKIN-02 / D 派生、对比色边界 | `appearance.js:23-37`；classic 的 personality/design/transit-on；`appearance-controls.js:22-27` | 仅 accent-on 有动态阈值；其他 source-on 固定，自定义 source 可能降低数字可读性；固定软色与动态 accent 软色采用不同方式。color input 只按前三数字解析，现代色空间支持需实际验证。未作对比度测量，不能宣称当前所有自定义值都不合格。 |
| SKIN-03 / C 语义耦合 | `views/connection.js:155-158`；`views/team.js:190` | Relationship A/B/bridged 已独立 Token，但 companionship 使用 integration 回路色、compromise 使用 collective 回路色，dominance 使用 text-tertiary。两种知识含义共享入口，回路/弱文字改色会改变关系状态表面。 |
| SKIN-04 / E Skin 覆盖与状态契约 | `human-design-chakra.css`；`appearance.js:41-85`；appearance swatch | Chakra 实际只改九中心；data-skin 网站层没有多个正式 CSS preset 或持久化字段。Skin API 接受任意合法标识，但恢复只白名单 HD 两款。UI swatch 固定，不是当前暗色/override palette。名称与覆盖范围需要读代码才清楚。 |
| SKIN-05 / A 排版规格分散 | `styles.css`、`knowledge/detail-access.css`、`timeline.css`、`view-share.js:75`、SVG renderer/Worker | 字体栈有集中 Token，标题/正文/display 字号、字重、字距、行高缺少统一语义分级；528 行局部排版。Planet glyph、Canvas、服务端字体有独立路径，网站字体变更不自动覆盖全部输出。 |

## A. 其他硬编码与范围区分

- `bodygraph.js:389` 临时定义中心 fill-opacity=.5 与 inactive/hatch 已 Token 化的处理不同。固定值来源是产品视觉选择，审计不自行更改。
- 图表 radialGradient 的中心/半径、条纹宽度/角度、部分 stroke/字体/响应式规格固定；这些是视觉参数，不能把 SVG 几何 paths 全部当成待皮肤化颜色。
- Timeline `--tl-transit` 混入固定 #445457；经典 transit text/soft 和 core 的锚点集中 Token 文件内。固定锚点有特定用途，不宜仅按色值相同归并。
- favicon 内嵌 #c8781d、静态 `public/og.png`、preset swatch 为静态视觉；它们不会继承浏览器当前 override。
- 实际颜色字面量候选共 68 行，详见硬编码表。只含 Token 的 linear/repeating gradient 不计硬编码颜色；透明/no fill/currentColor 是另一类语义。

## B. 重复变量 / 别名

| 例子 | 当前关系 | 风险说明 |
|---|---|---|
| personality / graph-personality / hd-personality | 前两项兼容 alias 指向 canonical | 并非三个独立 palette；新代码误将 alias 当主值时难以追踪 |
| design / graph-design / hd-design；transit-source 系列 | 兼容别名 | 文档/扫描若按变量数量当配色数量会夸大 |
| connection-person-a/b/bridged | 指向 hd-connection-* | 保留旧消费者兼容，不能据存在就判定未 Token 化 |
| center-brown / center-red | 指向 throat/heart | 以色名代替中心语义，且不是多个同色中心的独立入口；九中心 canonical 已各自存在 |
| accent-hover / accent-strong | 自定义 accent 时相同公式；默认值不同 | 只在特定状态同值，不能宣称两个 Token 永久等价 |
| bg/text/accent（SPA / SEO） | 相同名称、不共享 cascade | Token 名称全量表去重，但记录两套值和作用域；同名不代表统一 |

未建议删别名或归并变量，原消费者仍然需要兼容。

## C. 同值不同语义

| 明亮模式示例 | 当前同值 | 仍独立的语义 |
|---|---|---|
| status-success / hd-circuit-integration | #27ae60 | 操作成功 / 回路色 |
| hd-design / hd-type-manifestor / hd-circuit-tribal | #c0392b | 本命来源 / 类型 / 回路组；暗色 design 另有覆盖 |
| hd-selection-ring / hd-type-projector / hd-circuit-collective | #2980b9 | 交互选中 / 类型 / 回路组 |
| accent / hd-electromagnetic | #c47a2a | 站点强调 / 关系电磁；自定义 accent 不会自动改 electromagnetic |
| head / g；throat / spleen / solar / root；heart / sacral | 各组默认同色 | 中心身份独立，Chakra 已体现不同色；不能合并为一个 brown/red |
| on 字色 / undefined-center | 多项 #ffffff | 前景可读性 / 开放中心底色；角色相反 |

上表不意味着所有 Theme/Skin/override 下仍同值。

## D. 派生值状态

- 24 个具名色运算见 README 与全表；85 个颜色 Token 有引用依赖（包括 alias）。两者是不同指标。
- core 是 SVG 渐变高光、transit-text 是文字可读性、tl-transit 是轨道填色；同一源色不等于应该合并用途。
- circuit-soft 当前固定两套明/暗值，没有随主 circuit 动态混色。后续自定义若只改主色，soft 未必匹配；本阶段不新增这种自定义入口。
- Timeline glow 与 Knowledge 分支底色还有 inline `color-mix()` 比例；没有命名为 Token，已记录但不计具名派生色。
- 组合条纹表达「双方/双来源」，不是一个可随意替换的普通单色。

## E. 覆盖/验证空白

- 网站、HD、局部 Timeline/Knowledge、服务端视觉范围不同。Team 使用共享网站与关系状态，不存在完整单独 Penta Skin；本审计不创建。
- Override 五种颜色 + 闸门字号是全局，共用所有 Theme/Skin；并非 UI 所选皮肤的独立设置。Restore 清颜色、保留字号；Reset API 保留 Theme，当前 UI 没有 Reset 按钮。
- `color-scheme: dark` 定义在暗色 selector，明亮模式没有显式 `color-scheme: light`。原生控件在系统暗色下的表现未实测，仅记录差异。
- 字体在线加载，中文与部分 Unicode glyph 可能实际 fallback；未读取机器字体安装情况，不保证不同设备 ink box 一致。
- 审计未运行浏览器与对比度验证；记录的可能风险不等于复现失败。扫描器是静态正则，源值完备性由关键调用路径人工核对补足，未来新增动态结构仍需复查。

没有在本阶段修复以上任何问题。

## 引用但没有定义的名字

- `--bg-card`：`src/lib/local-account.css:4`。属于不存在的变量引用，不计入已声明 Token 数；fallback 或 JS 设置路径需分别理解，不能按拼写推定已有 preset。

字体请求只包含部分 weight，而 UI 会使用其他 weight（例如衬线 500/600）。具体字重可能使用邻近字面或浏览器合成，未在各设备实测，不能把 CSS 数值当成已加载的独立字体文件。
