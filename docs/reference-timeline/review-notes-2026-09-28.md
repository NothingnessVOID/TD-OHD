# 2026-09-28 预览复核记录

## 浏览器批注处理

| 批注 | 修改与核验 |
|---|---|
| 1、3–6 | 回路组和回路分开筛选；资料库桌面限制在视口内，正文与目录分别滚动；说明移到标题右侧；取消六爻搜索特例；返回按钮固定于正文顶部，返回时不恢复旧页面的纵向高度。桌面 903×703 和手机 390×703 浏览器检查通过。 |
| 2 | 手机资料详情改为底部弹窗。 |
| 7–13 | 缩小图表与信息栏间距并加宽信息栏；闸门名后补卦名；移除常驻分享字段；解释中心斜线和小字含义、去掉重复状态句，正文加独立阅读样式。 |
| 14、16–18 | 时间轴水平滚动即时移动视窗；一年范围改为当前时刻前后各六个月；闸门导航及条件结果的目标行短暂高亮；已选中心标签走本地化名称。 |
| 19–26 | 每个条件只允许一个对象；目标框收窄；匹配区间加入上一项、下一项与紧凑卡片，不再内嵌滚动条；按查询的对象类型切到对应轨道并跳转；图表用完整新 SVG 原子替换，避免中途空白；仅行运禁用本命岛桥接，桥接只查连通。 |
| 27–29 | 来源卡片悬停仅突出当前卡；手机范围选择移出高级设置，并在设置弹窗打开时让位；搜索排在日期、时区、高级设置之后。 |

浏览器证据：[桌面资料库](browser-review-2026-09-28/library-desktop.png)、[手机资料弹窗](browser-review-2026-09-28/library-mobile-sheet.png)、[手机时间轴](browser-review-2026-09-28/timeline-mobile.png)、[手机设置](browser-review-2026-09-28/timeline-controls.png)。图像来自模拟浏览器视口，尚未在实体手机上复核。

验证：`npm test` 165 通过、3 个在线项跳过；`npm run test:localization` 30/30；`npm run build:desktop`、`npm run build:pages`、`npm run check:pages-bundle` 通过；`E2E_URL=http://127.0.0.1:5188 npm run e2e` 通过；`tests/reference-e2e.mjs`、`tests/reference-v1-acceptance-e2e.mjs`、`tests/premerge-corrections-e2e.mjs`、`tests/timeline-e2e.mjs`、`tests/timeline-gestures-e2e.mjs`、`tests/timeline-mobile-touch-e2e.mjs`、`tests/timeline-mobile-layout-e2e.mjs`、`tests/timeline-conditions-e2e.mjs` 和 `tests/browser-comments-e2e.mjs` 浏览器检查通过。构建保留原有大 chunk 提示，不影响生成。

本轮是交互与渲染修复，未改变年度事件文件或计算签名，因此没有重跑年度事件生成性能试验。实体手机、辅助技术完整路径和真实账户资料仍未验证。

## 2 闸门的连续激活（浏览器批注 15）

截图所用出生资料为 `2000-05-10 12:30 UTC+8`。固定引擎计算的本命人格木星位于 **2.6**，因此本命 2 闸门在整个时间轴范围内持续激活。`2026-06-12T00:00:00Z` 的公共行运快照另有火星 **2.5**，会在对应时段叠加行运来源。横贯窗口的底层本命激活与局部行运叠加符合当前状态模型。按批注意见，暂不修改这段显示，留待后续产品讨论。

复核命令：

```bash
node --input-type=module -e "import {calculateHumanDesign} from 'natalengine'; import {snapshot} from './src/features/transit-timeline/provider.js'; const chart=calculateHumanDesign('2000-05-10',12.5,8); console.log(Object.entries(chart.gates.personality).filter(([,v])=>v?.gate===2)); console.log(Object.entries(snapshot(Date.parse('2026-06-12T00:00:00Z'))).filter(([,v])=>v?.gate===2));"
```
