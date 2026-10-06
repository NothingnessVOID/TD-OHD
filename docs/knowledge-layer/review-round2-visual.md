# Round 2D：Knowledge 详情视觉统一

本轮让知识详情使用网站已有的浅底块、暖色强调、轻边框、圆角、Chip 和 Badge。不同对象依照自身原文结构排版；没有统一成同一种正文模板。

## 1. 基线与分支

- 实际起始 SHA：`438ad2dc2dfa950eed55687143516051023de824`。
- 起始远程分支：`origin/feature/knowledge-review-round2-locales`，fetch 后核对与给定 Round 2C 提交一致。
- 工作分支：`feature/knowledge-visual-unification-v1`。
- 本轮只提交、推送任务分支，不合并 main，不部署，不更新本机 8787。
- 最终提交 SHA 可从该分支 Git 历史读取；不把自身提交 SHA 写入自身文件。

## 2. 内容完整性

`tests/fixtures/knowledge-round2c-content.json` 保持不变。en、zh-CN、zh-Hant 各 55 条，共 165 条的 summary/detail 联合 SHA-256 全部与 Round 2C 一致。没有编辑、缩写、重新翻译或复制正文。

新增 UI label 只有 Overview；英文沿用项目默认英文 key，简体和繁体分别登记“概要”。Gate、Personality Sun/Earth、Design Sun/Earth、Yours、Geometry 等沿用既有 i18n key。

## 3. Presentation metadata

三语言各自只新增以下三个 entry 的 range metadata：

| Entry | 结构 | 原因 |
|---|---|---|
| `profile.2/4` | prose + process lead、三步、分隔符 | 原文已有三步过程；不在运行时搜索箭头或关键词 |
| `profile.3/6` | prose + 三阶段 label/body + prose | 原文已有三个年龄阶段；保留全部前文和结尾 |
| `cross.introduction` | 构成、几何、生命主题三个 section | 原文已有三个标题；便于使用轻量 surface |

每个 locale 独立引用自己原文的 UTF-16 range。其他十个 Profile 不使用 Process/Timeline。EN 和 zh-Hant 流程箭头为 aria-hidden 装饰，文字仍逐字来自原 range；简体使用已有箭头。

## 4. 共享 renderer 与八个代表布局

Modal 和 Library 仍调用同一个 `renderKnowledgeDetail()`；没有复制 HTML renderer，也没有改 controller。

| 场景 | DOM / 视觉策略 |
|---|---|
| Type Generator | Summary callout；Strategy/Aura section surfaces；既有中点关键词拆为不可点击 Chip；Signature/Not-Self 紧凑 dl rows |
| Emotional Authority | Summary callout + 两段自然 prose；没有新增提醒、常见误区或关键词标题 |
| Profile 2/4 | Geometry Badge + Summary + 原前三段 + 三步 Process；宽容器横向、窄容器纵向 |
| Profile 3/6 | Geometry Badge + Summary + 前文 + 纵向三阶段 Timeline + 原两段结尾 |
| Split Definition | Summary + aria-hidden 两个抽象圆形组件 + 完整正文；没有中心、Gate、Channel 或虚构桥接 |
| Dynamic Cross | Geometry Badge + Summary + 四个激活卡片 + shared introduction；只读取现有 gates，顺序为人格太阳、人格地球、设计太阳、设计地球 |
| Determination Taste | Intro + 两个 Tone branch surfaces；只由 numeric Tone 选择一项并显示 Yours Badge；Library 无选择 |
| Perspective Survival | Intro + 两分支 + 中性 Distraction surface；没有 alert/warning 语义 |

Motivation 的 Transference 同样为中性信息块。Dynamic Cross 的四激活卡片放在 shared knowledge-body 之外；Library introduction 不携带图表数据。Direction、Color、Tone、Base 都保留并显示为 compact metadata。

## 5. 样式与保护边界

- 只新增 Knowledge namespace 样式，使用已有 semantic token；无新 palette、hex、视觉主题、图形库或依赖。
- 旧 Center/Gate/Channel CSS 完全未改；没有复用 `.center-reading`、`.gate-chip`、`.circuit-badge`。
- 没有修改引擎、adapter calculation、Variable/Definition/Cross calculation、connectedComponents 或四箭头映射。
- Protected BodyGraph functions 所在模块、旧 dialog/drag/close 模块与计算文件保持基线字节一致，并有自动测试。
- Cognition 六条保持 name-only；55 reviewed detail 全部可渲染，Variable 24 条保持。
- 主页文字、卡片数量/宽高和信息密度保持一致；没有新增弹窗或资料库入口。
- 低优先级死翻译 key 清理未做，避免扩大本轮范围。

## 6. 验证

| 检查 | 结果 |
|---|---|
| `npm test` | 326 total：323 passed、0 failed、3 skipped；skip 为可选在线城市/地理编码检查 |
| Knowledge focused tests | 42 passed、0 failed |
| `npm run test:localization` | 34 passed、0 failed |
| `npm run test:timeline` | 63 passed、0 failed |
| Round 2D unit regression | 8 passed，包含165正文hash、55渲染、Definition0..4、Variable24×6Tone×3语言 |
| 新视觉 E2E | 96 cases：八场景×四宽度×三语言；Modal/Library同正文、无横向溢出、responsive分支/流程/四激活 |
| 既有 presentation E2E | 132 Modal/Library cases passed |
| Knowledge access E2E | 12精确Foundation/Variable布局对照、15同正文/locale组合、6深链重载、keyboard/shell/library passed |
| Home detail isolation | 12布局对照 passed；长Detail不改变主页摘要/卡片 |
| BodyGraph regression | 24 DOM/text/geometry精确对照 passed；timing/order/boundaries/controller transitions passed |
| `npm run e2e:timeline` | 主时间轴、手势、手机触控和手机布局全部 passed |
| `npm run build` | passed；保留已有 bundle 大 chunk 提示，无新增依赖 |

浏览器使用 Chromium。宽度为1224、903、664、390，语言为en、zh-CN、zh-Hant。除语义/geometry自动断言外，人工查看桌面Generator、Process、Timeline、Cross和手机Process、Taste截图。截图、运行日志保存在本机临时目录，不加入Git。

开发期间改动触发Vite HMR时曾产生动态导入模块版本不一致；最终build后重启候选服务，再运行全部上述浏览器验证，最终无产品失败。补充Reference测试首次误用脚本默认旧端口5186，随后显式指定候选端口5207重跑。

## 7. 修改文件

运行代码/资料：

- `src/lib/knowledge/detail-renderer.js`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/content/human-design-en.js`
- `src/lib/knowledge/content/human-design-zh-CN.js`
- `src/lib/knowledge/content/human-design-zh-Hant.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-Hant/ui-chart.json`

测试与既有release source guard：

- `tests/knowledge-round2d.test.js`
- `tests/knowledge-visual-e2e.mjs`
- `tests/knowledge-round2c.test.js`：历史正文约束继续保留，允许Round2D新增metadata。
- `tests/knowledge-presentation-e2e.mjs`：适配新callout和独立selected-state。
- `tests/knowledge-access-e2e.mjs`：验证四激活Chip替代旧inline gates显示。
- `docs/frontend-knowledge-sync-v1/validate.mjs`：新增可追溯Round2D source overlay，原历史scope不变。

文档：

- `docs/knowledge-layer/round2d-scope.json`
- `docs/knowledge-layer/round2d-validation.json`
- `docs/knowledge-layer/review-round2-visual.md`

## 8. 收口状态

本轮功能没有未解决项。没有制造具体Cross文章，没有新增知识资料、老师教材或外部知识引用。UI仍待用户实际预览审核；本轮不自动进入下一阶段。
