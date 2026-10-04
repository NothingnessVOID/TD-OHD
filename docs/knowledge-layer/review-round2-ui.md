# Knowledge Review Round 2A：详情展示与术语

## 范围与基线

从 `feature/knowledge-access-v1` 的 `df06686baa855b01a8bbfb3d77cf85b34eaf4717` 创建 `feature/knowledge-review-round2-ui`。本轮只处理获准的展示规则和术语，正文未重新审核、润色或改写。三个 Human Design Summary/Detail 资源文件与基线逐字节一致。

计算、Knowledge 属性、用户可见内容继续分开：registry 保留完整属性；`renderKnowledgeDetail()` 按对象类型明确选择展示字段。来源、URL、审核状态、版本和 missing 状态仍可在内部取得，不作为产品 UI 标签展示。

## 术语

| 英文 | 简体 | 繁体 |
| --- | --- | --- |
| Signature | 标志 | 標誌 |
| Not-Self | 非我 | 非我 |
| Not-Self Theme | 非我主题 | 非我主題 |

复用原有 i18n key 和 term resolver；内部 `signature`、`notSelf` 和 stable ID 不变。Foundation、Knowledge 正文中的 term 引用、复制数据标签及关系提示里的术语共用更新后的翻译。`lines.json`、`hexagrams.json` 中“并非自己选择”“而非自己”属于普通语法，未替换。

## 对象展示策略

所有详情使用 `detail-label` 和具有 heading 语义的 `h2.detail-name`。Modal 与 Reference Library 共用一个 renderer，正文同源。

| 对象 | 用户看见 | 仅内部保留 |
| --- | --- | --- |
| Type | 类别、名称、Summary、策略／标志／非我主题、原 Detail | family、taxonomy、subtype |
| Authority | 内在权威、名称、Summary、原 Detail | family |
| Profile | 编号＋名称、Summary、自然的角度／命运次级信息、原 Detail | 原 geometry 身份 |
| Definition | 名称、Summary、原 Detail | taxonomy、componentCount |
| Variable | 摄取／环境／视角／动机、名称、Summary、当前图 context、原 Detail | kind、valueId、color 身份 |
| Cross | 当前名称、Summary、角度／四闸门、既有共用正文 | dynamic identity、specific detail missing 等状态 |

删除通用 Structured Facts 方框和统一 Detail 标题。Strategy 仍属于 Type，不建立独立 Knowledge Object，也不添加 Foundation Strategy 点击入口。

Profile 的自然次级信息分别是“右角 · 个人命运”“并列 · 固定命运”“左角 · 跨个人命运”，英／繁体走现有翻译机制。

Variable context 来自当前图：方向与箭头在前，Color · Tone · Base 独立一行，位于名称和 Summary 后、正文前。Library 无当前图 context。去除 context 后，两种 surface 的 article 一致；动态 Cross 的 Library 路径继续进入现有介绍条目，正文一致。

仅类别标签和方向使用语义色。摄取／环境使用 `--hd-design`，视角／动机使用 `--hd-personality`；Type 使用已有五种 `--hd-type-*` token。没有新 palette、渐变、Modal 底色或全局主题变更。

## 保护范围

旧 BodyGraph Gate／Center／Planet／Channel renderer、history、reset、decorator、activation／timing append 路径均未修改。Transit／Timeline 的计算、context、duration／start／end／≈／full-range／source 和时间排列未修改。

共用 Modal 的宽度、圆角、阴影、位置、Bottom Sheet 几何、handle 与 close button 实现不变。保留 role、aria-modal、Escape、backdrop、focus trap 与 focus restore。只有 Knowledge 内容和作用域内的排版规则调整。

主页 Foundation / Variable 卡片文本只发生获准术语替换，卡片数量、宽度和高度不变；不新增长文或入口。关系／团队算法及知识属性登记未修改。

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | 301 passed、0 failed、3 skipped（原有 online 测试） |
| `npm run test:localization` | 34 passed、0 failed |
| `npm run test:timeline` | 61 passed、0 failed |
| `npm run build` | passed |
| `npm run build:pages` | passed，仅构建，不发布 |
| `npm run check:pages-bundle` | passed |
| Knowledge Access E2E | 12 组精确 Foundation／Variable 宽高对照；15 个语言／对象同 article 检查；6 条 deep-link reload；键盘、focus、shell 与 locale refresh 通过 |
| Knowledge Layer E2E | 12 组对照；超长 Detail 不改变主页／Variable；heightChanges 为空 |
| Round 2A presentation E2E | 132 个 Modal／Library 场景；四宽度 × 三语言；长 Authority／Profile、三类角度、四类 Variable 和 Cross 均通过 |
| Reference E2E | desktop／mobile 旧资料读取、检索、路由和 lens 通过 |
| BodyGraph P0 E2E | 24 个 DOM／文字／顺序／几何对照；1224／390；Birth Gate／Center／Planet、四 lens、Transit Gate／Channel／Center、Timeline timing／full-range 通过 |
| Timeline E2E | 时间轴、gesture、mobile touch、mobile layout 四个脚本通过 |
| Chart Data Export E2E | 实际剪贴板、三语、出生图／行运／Timeline、loading guard、无额外计算通过 |

布局矩阵：1224／903／664／390 × en／zh-CN／zh-Hant。检测标题与关闭按钮无文字碰撞、正文无横向溢出、Modal 与 Library 名称字号一致、手机 sheet 保留现有限制。代表性截图人工查看，截图与浏览器资料未提交。

测试中的基线文本只归一获准的“非自己主题→非我主题／非自己主題→非我主題”；卡片尺寸仍要求精确一致，未放宽尺寸断言。

### 首次运行与校验适配

新工作区首次原生 parity 测试缺少 NuGet restore，恢复三个既有 harness 的依赖后通过；未修改引擎。首次完整测试还命中旧发布校验锁定的展示文件／旧 bundle 名称。

新增 `review-round2-ui-scope.json` 登记八个获准 src 文件的基线／修改后哈希。校验器继续核验历史同步记录和全部受保护计算／年度资料源码，只给本轮八个明确路径增加允许记录；negative control 验证 chart.js 等路径不能被纳入。

`review-round2-ui-build.json` 是本轮实际 static 构建的文件对应记录，记录一个新 app bundle 和三个重建 WASM 文件的原／新哈希。它不代表引擎源码改动；引擎 signature、源文件保护、parity、ephemeris 与 notice 校验继续执行。历史 release manifest、历史 Phase 4／5 报告均未覆盖。

复现时先构建，然后运行 `node scripts/record-knowledge-presentation-build.mjs --static` 更新当前构建对应记录（普通 build 不加 --static），再执行完整测试。校验会拒绝来源范围漂移、未知 artifact、错误哈希或 notice 缺失。构建既有 large chunk 提示保留，不属于失败。

## 留待人工正文审计

本轮没有访问外部知识网站、读取老师资料或补充文章。没有生成 192 篇 Cross 正文。

已有 Cross 正文最后一段仍使用“共用介绍”措辞；本轮移除了额外系统标题和 specific missing 提示，但按禁止改写正文的要求保留这一句。该措辞是否删除或改写，应在下一轮人工正文审计确认。其余正文语气、重复摘要或机制争议也不顺手修改。

## 修改文件

- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-access.css`
- `src/views/reference.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-CN/ui-views.json`
- `src/locales/zh-Hant/ui-chart.json`
- `src/locales/zh-Hant/ui-views.json`
- `tests/knowledge-content.test.js`
- `tests/knowledge-access-e2e.mjs`
- `tests/knowledge-layer-e2e.mjs`
- `tests/knowledge-presentation.test.js`
- `tests/knowledge-presentation-scope.test.js`
- `tests/knowledge-presentation-e2e.mjs`
- `scripts/lib/knowledge-presentation-scope.mjs`
- `scripts/record-knowledge-presentation-build.mjs`
- `docs/release-licensing-v1/validate.mjs`（可执行校验器，未覆盖历史报告）
- `docs/knowledge-layer/review-round2-ui-scope.json`
- `docs/knowledge-layer/review-round2-ui-build.json`
- `docs/knowledge-layer/review-round2-ui.md`

提交后仅 push 本任务分支。未 merge main、deploy、更新 Pages／Netlify／8787 或删除旧分支。
