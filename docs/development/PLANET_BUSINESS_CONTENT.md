# 星体详情双分类 · 人类图与商业正文（维护记录）

日期：2026-11-15
适用分支：`feature/member-business-analysis`
性质：维护记录。页面不展示来源、教材原文、编辑说明或版本对照，只呈现一套整合后的说明。

## 1. 交付与授权

用户授权星体详情弹窗参照现有闸门 `.lens-switch` 增加“人类图 / 商业”两种含义分类，商业分类采用指定 BG5 教材的 13 条星体内容，允许做前缀与展示语气的轻整理。

- 三语正文均基于指定教材的星体章节整理；繁中与英文为同源适配，未经过独立译者复核。项目侧接入冻结文本，没有另写一套商业解读。
- 交付原件在工作室资料库（不进 Git）：`TD-OHD/教材十三星体商业解读-20261115-locales.json`，冻结版 sha 以交付方为准；产物内记录 `document: 人类图BG5`、`section: 星体 (Planets) 商业驱动力与资源`、`lineRange: 319-333`。父代理另按 `python3 /tmp/check_planets_biz.py` 逐条核对 13 条 × 3 语齐全、与教材正文行 321–333 对应。
- `venus` / `jupiter` / `uranus` 三语正文经父代理二次口径微调后冻结：只写直接释义，不写“观察线”“不是……而是……”式编辑判断与免责句；教材原句完整保留在本记录第 5 节。

## 2. 运行时结构

| 位置 | 作用 |
|------|------|
| `src/lib/planet-business-content.json` | 唯一运行时数据，顶层只有 `zh-CN` / `zh-Hant` / `en` 三语表，每语 13 个星体，字段 `theme`（教材短主题）与 `body`（完整 1–3 段） |
| `src/lib/planet-business-content.js` | `PLANET_BUSINESS_LOCALES`、`hasPlanetBusinessContent(planet)`、`planetBusinessCopy(planet, locale)`；稳定 ID 来自 `PLANET_REFERENCE_IDS`，不合法 ID 与未知语种都返回 `null`，不回退其他语言 |
| `src/lib/planet-reading-perspectives.js` | `PLANET_READING_LENSES`、`resolvePlanetLens`、`planetReadingBody`、`renderPlanetReadingPerspectives`、`bindPlanetReadingSwitch` |
| `src/lib/reading-lenses.js` | 通用 lens 按钮基础渲染，`renderReadingLensSwitch({className, lenses, selectedLens, dataAttribute, aliasAttribute})` |
| `src/lib/gate-lenses.js` | 闸门四分类 wrapper，继续输出原 `lens-switch gate-lens-switch` 与 `data-lens` / `data-reference-lens` |
| `src/lib/planet-reading-perspectives-messages.js` | 两个分类与“待整理”提示的三语界面文字 |

- 教材元数据（`source`）与编辑说明（`editorialNotes`）不进入运行时 JSON，只在本记录与交付原件中维护。
- 人类图分类继续读取 `planet-reference.js` 的原 `summaries` / `details`，**未改一字**；商业分类只读取独立的商业文案表。
- 来源标签、激活闸门块、graph pin、详情导航与 sheet 生命周期仍由宿主负责，本模块不接管。

## 3. 教材条目 → 界面稳定 ID 与主题

教材列序为太阳、地球、南交点、北交点、月亮、水星、金星、火星、木星、土星、天王星、海王星、冥王星；界面按稳定 ID 组织，`southNode` 对应过往环境、`northNode` 对应未来环境，不按教材顺序错配。

| 稳定 ID | 教材条目 | 简中主题 | 繁中主題 | English theme |
|---|---|---|---|---|
| `sun` | 1 太阳 | 核心表达 | 核心表達 | Core Expression |
| `earth` | 2 地球 | 落地支撑 | 落地支撐 | Grounding |
| `northNode` | 4 北交点 | 未来环境 | 未來環境 | Future Direction |
| `southNode` | 3 南交点 | 过往环境 | 過往環境 | Past Direction |
| `moon` | 5 月亮 | 驱动力 | 驅動力 | Driving Force |
| `mercury` | 6 水星 | 商业沟通 | 商業溝通 | Business Communication |
| `venus` | 7 金星 | 核心价值观 | 核心價值觀 | Core Values |
| `mars` | 8 火星 | 竞争野心与摩擦 | 競爭野心與摩擦 | Ambition & Friction |
| `jupiter` | 9 木星 | 扩张与律法 | 擴張與律法 | Expansion & Law |
| `saturn` | 10 土星 | 约束与惩罚 | 約束與懲罰 | Rules & Penalty |
| `uranus` | 11 天王星 | 独特性 | 獨特性 | Uniqueness |
| `neptune` | 12 海王星 | 隐藏事物 | 隱藏事物 | What's Hidden |
| `pluto` | 13 冥王星 | 蜕变与真相 | 蛻變與真相 | Transformation & Truth |

## 4. 展示口径与边界

1. 本分类是**教材整合整理**，沿教材原意做前缀、语气与流畅度整理，不是官方 BG5 逐条定义的精确复述，也不宣称官方原词。
2. 不显示“70%”等未经系统计算的权重：如太阳条目把“占据个人 70% 的商业能量”改写为“最集中的表达位置”，页面不把它变成评分、百分比或排序。
3. 不做星体 × 64 闸门组合解读，不算盈利、离职或风险评估，不设阈值与一票排除规则，不修改任何计算、激活、颜色/基调/基底与人物存储。
4. 商业分类只描述教材给出的星体主题在商业情境中的位置；人类图分类继续回答星体在个人图里的传统含义。两者共用同一个弹窗骨架，不并列展示“官方版/通俗版”。
5. 未知星体 ID 不生成区块；某语言缺条目时只显示“商业解读待整理”，不借用其他语言或人类图正文。

## 5. 教材原文 → 展示调整（13 条）

原文为教材原句，仅作维护追溯，不进入页面。

| 星体 | 教材原文 | 展示调整 | 依据 |
|---|---|---|---|
| sun | 1. 太阳 (Sun) — 核心表达 (Core Expression)： 占据个人 70% 的商业能量。这是你向外界输出的最强卖点、个人IP的核心标志，以及企业必须死守的主打产品线。 | 删除编号、星体名重复前缀与英文括号；不显示「70%」，改为「最集中的表达位置」；「死守的主打产品线」整理为「最需要守住的主线」；补一句关于定位的表达。 | 70% 不是系统计算出的权重，界面不展示未经计算的精确比例。 |
| earth | 2. 地球 (Earth) — 落地支撑 (Grounding)： 维持你商业模式与核心品牌不崩盘的底盘力量。太阳负责吸引客户，地球负责将理念变现、扎根于现实市场，确保现金流和业务的稳定性。 | 删除编号与括号；内容拆为两段；「确保」改为「撑住」降低绝对化；末句补「一个负责发光，一个负责站稳」。 | 除流畅度整理外沿用教材原意，不新增概念。 |
| southNode | 3. 南交点 (South Node) — 过往环境 (Past Direction)： 你在职业生涯前半程（约 40 岁前）所处的商业生态与客户群体特征，这是你积累原始资源的“舒适区”和初始舞台。 | 键名 `southNode` 对应「过往环境」；「约 40 岁前」改为「前半程」，40 岁说明统一放到北交点条；「初始舞台」补「起步时」限定。 | 不给个人确切的年龄切换点；避免南北交点键名按教材顺序错配。 |
| northNode | 4. 北交点 (North Node) — 未来环境 (Future Direction)： 你职业生涯后半程必须去开拓的全新商业舞台。从南交向北交的战略转移，标志着个人 IP 或企业定位的破局与维度升级。 | 键名 `northNode` 对应「未来环境」；「从南交向北交」写为「从南交点向北交点」；「必须去开拓」改为「需要去开拓」；「标志着」改为「往往对应」；补一句转移是渐进的。 | 将南交／北交简称展开为完整名称，属于显示用语统一，不判作教材笔误；整理必然性与确定切换时点的表述，保留职业舞台升级主题。 |
| moon | 5. 月亮 (Moon) — 驱动力 (Driving Force)： 商业行为的底层发动机。这是在没有外部 KPI 考核时，依然能让你持续投入精力的内在焦点，也是精准激发员工或合伙人自驱力的核心指标。 | 删除编号与括号；「精准激发……核心指标」整理为「观察自驱力来源的指标」，补「知道对方真正被什么牵动」。 | 保留驱动力原意，把效果承诺整理为观察性表述。 |
| mercury | 6. 水星 (Mercury) — 商业沟通 (Communication)： 你的公关口径、营销话术以及向市场传递信息的特定方式。它决定了你的目标受众能否精准“听懂”你的商业主张并为此买单。 | 删除编号与括号；英文 theme 由 Communication 写为 Business Communication；「精准听懂」改为「听懂」；补一句表达方式影响市场信号。 | 去掉绝对化的「精准」限定，保留商业沟通原意。 |
| venus | 7. 金星 (Venus) — 核心价值观 (Core Values)： 建立商业信任的道德准则。这是你在合伙人架构与客户管理中最看重的底层文化。在 BG5 架构中，**金星的理念冲突是导致高管离职和团队解散的首要原因**。 | 删除编号、加粗与括号；不保留「首要原因」的原因排名，也不写「观察线／不等于散伙」这类编辑判断与免责句，改为直接释义：价值准则、合作双方重视什么、如何建立信任、差异如何反映在协作中。 | 页面呈现直接释义；离职/解散的原因排序无独立证据支持，不进入正文。 |
| mars | 8. 火星 (Mars) — 竞争野心与摩擦 (Ambition & Friction)： 极具爆发力但容易失控的职场冲劲。它是你在红海市场中撕开缺口的“尖刀”，也是日常管理中最容易引发团队内部摩擦与公关危机的燃爆点。 | 删除编号与括号；「燃爆点」改为「位置」表述；末段补「用得好和用过头，差别在有没有留出出口与边界」。 | 保留两面性描述，去掉夸张比喻，改为可操作的边界说明。 |
| jupiter | 9. 木星 (Jupiter) — 扩张与律法 (Expansion & Law)： 你的“内部商业法”。只要在经营中顺应木星闸门的特质，就能以最小的力气撬动最大的资源，获得丰厚的利润回报。 | 删除编号与括号；去掉「一个贴近实际的读法」「这更接近观察」「而不是保证某个具体结果」等页面元说明，改为直接释义：扩张、律法与内部商业原则，关注顺应特质、调动资源、建立合作与投入回报关系。 | 正文只说明星体含义，不出现编辑口吻与免责句；结果承诺不进入展示层。 |
| saturn | 10. 土星 (Saturn) — 约束与惩罚 (Rules & Penalty)： 职场短板与风险控制红线。当你偏离自身正确轨迹或过度消耗时，土星所在的领域就是你面临财务损失、项目停滞或遭遇“行业毒打”的惩罚区。 | 删除编号与括号；「财务损失、项目停滞、行业毒打的惩罚区」整理为「进展受阻、成本上升、反复补课」并说明是反馈机制；「惩罚区」改为「常被形容为」。 | 保留约束与代价主题，不写成必然的财务灾祸或因果惩罚判定。 |
| uranus | 11. 天王星 (Uranus) — 独特性 (Uniqueness / Unusualness)： 颠覆行业常规的技术与模式创新力。代表你不按理出牌的独特视角，是企业寻找蓝海、实现产品差异化竞争的切入点。 | 删除编号与括号；英文 theme 只取 Uniqueness；第二段由「不是做得更好，而是换一条路径」的对比句式改为直接释义：寻找蓝海、形成差异化的切入点，提示如何按新路径推进技术、产品与商业模式。 | 去掉对比式编辑句式；术语统一，英文主题不并列同义词。 |
| neptune | 12. 海王星 (Neptune) — 隐藏事物 (What's Hidden)： 缺乏数据支撑的市场第六感与商业盲区。它既是超前的战略灵感，也是规划中最容易产生泡沫、过度乐观、引发内耗或遭遇商业欺诈的“幻觉区”。 | 删除编号与括号；「遭遇商业欺诈」整理为「对合作方判断失准」；「幻觉区」改为「最容易起泡沫的部分」；末段补「关键决策仍要回到数据和验证」。 | 不写成必然遭遇欺诈或医学式判定，给出偏保守的使用方式。 |
| pluto | 13. 冥王星 (Pluto) — 蜕变与真相 (Transformation & Truth)： 触及行业底层的残酷真相与深度洗牌。它不涉及表面的业务优化，而是迫使企业或个人经历阵痛后，实现脱胎换骨的业务重组与商业重塑。 | 删除编号与括号；「迫使」改为「把……推到必须重组的位置」；保留「阵痛」「脱胎换骨」；去掉「残酷」的程度词。 | 保留蜕变与真相原意，去掉宿命式强迫语气，不新增业务断言。 |

## 6. 交互与宿主契约

- 分类按钮：`div.lens-switch.planet-lens-switch` 内两个原生 `button`，属性 `data-planet-lens="hd"|"business"`，激活态 `class="active"` 与 `aria-pressed` 同步；标签三语为「人类图／人類圖／Human Design」与「商业／商業／Business」。`hd` 为默认，未知值回落 `hd`。
- 阅读区块：`section[data-planet-reading][data-planet][data-planet-lens-current]`，正文子区 `[data-planet-reading-body]`。切换只替换这个子区与两个按钮的 active/aria-pressed，不重绘激活块、详情导航、来源标签或整个 sheet，不重算图，不改 gate／line／color／tone／base，不移动 graph pin。
- 共用控制器：`bindPlanetReadingSwitch(root, { onLensChange })` 返回 `dispose()`；同一 root 重复绑定会先解绑旧监听，宿主在关闭、语言重绘与重新打开时解绑，不残留监听。按钮不重绘，点击后焦点仍在被点的按钮上；手机高度沿用既有 `fitDetailSheetHeight`。
- 出生图／行运／时间线（`src/views/chart.js`）：详情帧新增 `planetLens` 字段。`showPlanetDetail({source, planet, activation, planetLens})` 读取并写回当前帧；切换时只更新 `currentDetail.planetLens`，不 push history，不改闸门详情的 `currentLens`。从星体进闸门再返回时恢复原分类；语言刷新与行运 context 刷新保留当前分类；真正关闭后重开默认人类图；`resetDetail` 与 `clearCurrentChart` 会解绑控制器。
- 资料库（`src/views/reference.js`）：同一套正文与切换，`planetLens` 独立于闸门 `lens`；新选星体、离开星体详情或手机 `closeToList` 时重置为人类图，同一星体的语言刷新保留当前分类；`build()` 每次都重新绑定控制器，不会出现有按钮却没事件。
- 样式：只复用既有 `.lens-switch` 轨道与文字层级（`.planet-reading-lead` / `.planet-reading-body`），40px 触控高度沿用与闸门 switch 同一条规则 `.gate-lens-switch button, .planet-lens-switch button`，未新增弹窗、tabs 或自造视觉；Skin token 与明暗主题由既有变量承担。

## 7. 验证

- `tests/planet-perspectives.test.js`：13 星体 × 三语非空与稳定 ID、运行时 JSON 只含三语表、未知星体/未知语种不造资料、人类图分类输出与 `renderPlanetReading` 完全一致、闸门四分类 DOM 逐字契约、商业区块转义且不泄漏维护元数据、三语标签、未知分类回落，以及两个宿主的接线与重置规则（源码级）。
- 另跑相关既有定向检查（`i18n`、`localization`、`traditional-chinese`、`shared-object-details`、`reference-catalog`）通过。
- 未执行：完整回归、全部 Skin 矩阵、真实引擎行运数据下的浏览器交互由父代理在 5282 正常站点复核。
