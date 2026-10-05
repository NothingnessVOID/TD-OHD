# Round 2E：知识详情 UI 精修

本轮把知识详情统一到网站主题色，使用真实中心几何展示出生图定义岛，把具体化身十字与基础说明分开，并为全部人生角色显现双 Line 结构。计算与三语言已审定正文保持不变。

## 1. 基线、分支和交付

- fetch 后实际基线：`7d9f7df080dbbb997f7db6eeac6b04327fd5b2db`，远端 `feature/knowledge-visual-unification-v1` 与指定 Round 2D HEAD 一致。
- 新任务分支：`feature/knowledge-ui-refinement-v1`。
- 本轮 commit + push，核对本地与远端 SHA；不 merge main、不 deploy、不更新本机 8787。
- 最终 SHA 由本分支 Git 历史与交付消息提供，避免在自身提交内登记自身 SHA。
- 候选预览端口：5208；Round 2D 对照端口：5207。

## 2. 正文保护与主题色

- en、zh-CN、zh-Hant 各55篇，共165条 summary/detail SHA-256 与不可变 Round 2C fixture 完全一致。
- 12 Profile 的每种语言新增明确 range metadata；逐字符覆盖检查验证所有非空白正文字符恰好被渲染一个范围覆盖，没有丢失或复制正文。
- Knowledge CSS 已删除 Personality、Design、Type-specific accent 映射；`--knowledge-color` 直接读取 `--accent`。所有强调、Badge、Tone选择、流程箭头、时间线、定义岛和跳转 hover 使用现有主题token。
- 浏览器测试修改测试节点的主题accent，验证Type、Taste、Survival的强调文字与Yours跟随变化；没有修改用户皮肤存储。
- 新UI翻译仅为 `Incarnation Cross Basics`、`Definition island {index}`；复用既有 `Back` 和 `Line {line}`。英文沿用项目默认英文key，简体、繁体独立登记。

## 3. Definition：真实中心成员

`wireKnowledgeTargets()` 在Definition打开时只传 `chart.definitionComponents`，不传整张chart，不重新计算。

共享renderer直接import既有 `CENTER_SHAPES`，使用局部display mapping：head→Head、ajna→Ajna、throat→Throat、g→G、heart→Ego、spleen→Spleen、solar→SolarPlexus、sacral→Sacral、root→Root。

- 每张岛卡都绘制全部九中心；当前component成员用主题accent描边、accent-soft填充，其余仅作淡背景。
- 岛卡文字使用既有 `centerName()`，按输入component列出真实中心成员。
- SVG设置 `aria-hidden="true"`；中心列表提供等价正常文字。
- Single：1张真实岛卡；Split：2张；Triple：3张；Quad：4张。
- None：没有岛卡、没有高亮；显示九中心淡轮廓。
- Library无context：不显示任何island SVG，只显示概要和正文。
- 宽容器优先两列，Single单列；手机全部单列。
- 不画Gate/Channel/虚构桥接，不新增图像或SVG资产，不修改CENTER_SHAPES和BodyGraph本体。

验证使用既有 `tests/fixtures/sharp-definition-components.json` 的五个真实Sharp结果。测试只规范化fixture，再传已有components；每个highlight成员与fixture集合一致，`path d`严格等于共享几何中的path。

## 4. Incarnation Cross：独立身份和弹窗内导航

`hd.cross.introduction`继续是独立reviewed Knowledge文章，新display name分别为：

- en：Incarnation Cross Basics
- zh-CN：化身十字基础说明
- zh-Hant：輪迴交叉基礎說明

其原summary/detail保持不变。Dynamic Cross的summary/detail均为null，不显示missing/unavailable提示，也不再inline基础文章。

具体Cross显示名称、Geometry、已有四激活以及Basics跳转button。激活顺序保持人格太阳、人格地球、设计太阳、设计地球，只读取已有gates。

Knowledge controller增加一个小型独立history：点击跳转卡，在同一个modal打开基础说明；Back恢复具体Cross与原context。没有切换主View或URL。Enter/Space可操作；locale refresh保持当前基础说明身份和history；关闭清空history。

View in Library的target读取 `entry.properties.introductionKnowledgeId ?? entry.id`，具体Cross进入基础说明；基础说明进入自身。四Gate deep-link属于任务可选项，本轮不实现，保留既有非交互激活卡，避免扩大BodyGraph导航范围。

## 5. Profile：12类全部双Line结构

全部12个Profile×3locale具有：Geometry、原Summary、两个compact Line identity、两个轻量Line surfaces以及原文剩余整合段落。

Line数字来自objectId；archetype名称只对当前locale已有entry.name做display split，没有创建另一套术语表。各语言原文结构不同，各自独立登记range；运行时不搜索“1爻”“因此”“30岁”等关键词。

- 2/4：Line2和Line4正文分别使用surface；原Process保留，窄容器纵向。
- 3/6：Line3正文surface；Line6 surface包住原Timeline；结尾保留自然prose。
- 其余10个Profile：双Line surface + 真实remainder，不制造新的Process/Timeline或标题知识。

## 6. 保护边界

Engine changed=false；Definition calculation changed=false；Cross calculation changed=false；protected BodyGraph changed=false。

只有chart.js的Knowledge context接线一行变化。旧showGateDetail、showTransitChannelDetail、showCenterDetail、showPlanetDetail、detailNav、goBack保持函数源码一致；bodygraph-detail-layout、detail-dialog、geometry、bodygraph、sharp-contract、TransitCore、四箭头代码保持字节一致。

主页文字、Foundation/Variable卡片数量及geometry保持对照一致。没有改关系/团队算法，没有改Copy Data、Timeline、Reference核心，没有阅读教材，没有外部正文核查或改写。

## 7. 验证结果

| 检查 | 结果 |
|---|---|
| `npm test` | 332 total：329 passed、0 failed、3 skipped；skip为可选在线检查 |
| Knowledge focused | 48 passed；新增Round2E专项6项 |
| localization | 34 passed |
| timeline unit | 63 passed |
| Round2E browser | 252场景通过：四宽度×三语言×21场景；真实fixture、全部Profiles、Cross内部导航、实际Chart接线 |
| 既有Knowledge presentation | 132场景通过 |
| 既有Knowledge visual | 96场景通过；适配Library无个人定义岛和Dynamic Cross identity |
| Knowledge access | 12布局对照、15同正文/语言组合、6深链重载及keyboard/shell/library通过 |
| BodyGraph regression | 24 DOM/text/geometry对照通过，timing/controller transitions通过 |
| timeline browser | 主流程、gestures、mobile touch、mobile layout通过 |
| Reference browser | 桌面和手机通过 |
| Production build | passed；仅既有large chunk提示，无新增依赖 |

宽度：1224、903、664、390。语言：en、zh-CN、zh-Hant。截图人工检查覆盖桌面Split、Profile1/3、Profile3/6和手机Quad、Cross；全部15个要求的场景也通过浏览器断言覆盖。

测试环境：Chromium，`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/td-integration-browsers`；.NET使用 `/tmp/td-frontend-sdk/dotnet`。首次完整测试未带SDK路径导致spawn dotnet ENOENT，补齐环境后重跑通过；一次SVG成员断言误要求数组绘制顺序，修正为成员集合核对后通过。没有为了环境错误修改产品计算。

## 8. 修改文件

运行代码、metadata和UI翻译：

- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/human-design-foundation.js`
- `src/views/chart.js`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-Hant/ui-chart.json`

测试：

- `tests/knowledge-round2e.test.js`
- `tests/knowledge-refinement-e2e.mjs`
- `tests/knowledge-layer.test.js`：dynamic Cross无继承summary。
- `tests/knowledge-round2d.test.js`：Library无虚构拓扑；chart context接线可变但函数保护继续。
- `tests/knowledge-presentation-e2e.mjs`：主题色及独立Cross article规则。
- `tests/knowledge-visual-e2e.mjs`：适配本轮正式视觉身份。

文档与release source guard：

- `docs/frontend-knowledge-sync-v1/validate.mjs`：追加10文件Round2E scope overlay，保留历史scope。
- `docs/knowledge-layer/round2e-scope.json`
- `docs/knowledge-layer/round2e-validation.json`
- `docs/knowledge-layer/review-round2-refinement.md`

## 9. 收口

本轮必选项没有未解决问题。可选Cross四Gate点击未扩大执行。用户尚需实际预览审核；本轮不自动进入下阶段，也不合并或部署。Git只加入任务相关源文件、测试和文档；截图、临时日志、node_modules、SDK和构建产物不加入提交。
