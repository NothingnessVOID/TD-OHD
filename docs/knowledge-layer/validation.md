# Phase 5 验证

本报告根据本阶段实际命令输出和两个新浏览器套件的结构断言生成。Phase4C历史报告及其原validation.json保留。

## 测试与构建

| 命令 | 状态 | passed | failed | skipped |
|---|---|---:|---:|---:|
| npm test | passed | 269 | 0 | 3 |
| npm run test:localization | passed | 34 | 0 | 0 |
| npm run test:timeline | passed | 61 | 0 | 0 |
| npm run build | passed | — | — | — |

3项skipped为既有的外部在线地理编码测试，未开启OHD_ONLINE_TESTS。Sharp原生对照使用本机.NET SDK运行；生产构建完成WASM发布与Vite打包，保留既有大chunk提示。

## 现有浏览器回归

25个相关脚本全部通过：

- `node tests/annual-fallback-e2e.mjs`：passed
- `node tests/appearance-controls-e2e.mjs`：passed
- `node tests/appearance-skin-e2e.mjs`：passed
- `node tests/browser-comments-e2e.mjs`：passed
- `node tests/channel-detail-layout-e2e.mjs`：passed
- `node tests/chart-data-export-e2e.mjs`：passed
- `node tests/e2e.mjs`：passed
- `node tests/gate-meridian-e2e.mjs`：passed
- `node tests/graph-mobile-size-e2e.mjs`：passed
- `node tests/graph-window-fixing-colors-e2e.mjs`：passed
- `node tests/knowledge-layer-e2e.mjs`：passed
- `node tests/planet-detail-e2e.mjs`：passed
- `node tests/premerge-corrections-e2e.mjs`：passed
- `node tests/quarter-correction-e2e.mjs`：passed
- `node tests/reference-e2e.mjs`：passed
- `node tests/reference-v1-acceptance-e2e.mjs`：passed（隔离复跑）
- `node tests/review-round2-e2e.mjs`：passed
- `node tests/share-views-e2e.mjs`：passed
- `node tests/sharp-transit-e2e.mjs`：passed
- `node tests/timeline-e2e.mjs`：passed
- `node tests/timeline-conditions-e2e.mjs`：passed
- `node tests/timeline-gestures-e2e.mjs`：passed
- `node tests/timeline-mobile-layout-e2e.mjs`：passed
- `node tests/timeline-mobile-touch-e2e.mjs`：passed
- `node tests/transit-window-reuse-e2e.mjs`：passed

reference-v1-acceptance在三组脚本并行执行时，手机动画后的“高亮轨道仍可见”断言出现一次失败；同一脚本隔离复跑桌面和手机均通过，没有改断言、时间轴代码或基线设计。

专用place-search-e2e未运行，其外部地理编码路径不属于本轮修改；主e2e已执行其内置的地点搜索、关系与团队流程。

## 新入口、同正文与布局

`npm run e2e:knowledge-access`：passed。

- 1224 / 903 / 664 / 390 × en / zh-CN / zh-Hant，共12组。
- Foundation卡片与Variable卡片可见文字、宽度、高度精确一致。
- 同时检查知识弹窗、手机sheet边界、ARIA、Enter/Space、Escape、遮罩、焦点循环与恢复。
- Type / Authority / Profile / Definition / Variable × 三语言，15组article HTML一致。
- 语言即时刷新包含Variable上下文和链接。
- 六个知识深链支持direct reload、Back / Forward；基础31Knowledge + 3概念，Variable24，Cognition无条目。

## P0 BodyGraph 与 Timing

`npm run e2e:bodygraph-regression`：passed。

1224与390两宽度共24组：Birth Gate / Center / Planet、Gate四个Lens、Transit Gate / Channel / Center、Timeline真实Gate timing、full-range fixture。比较完整内容HTML、可见文字、关键类和选定位置，几何容差1px。

显式检查.tl-detail-timing、.tl-timing-duration、两个.tl-timing-boundary、.tl-timing-source与≈，duration/start/end顺序相同；full-range无伪start/end且保留range-note。owner切换关闭旧context回调、释放pin、清空history与Knowledge选择，无timing残留。

两端外部Google字体均阻断并使用同一回退栈；时间固定2026-10-01T06:31:21Z。此证据覆盖指定代表图、宽度和场景，不宣称穷举。

## 重跑方式

准备Phase4C和候选分支的两个独立Vite服务后：

```bash
E2E_URL=http://127.0.0.1:5196 BASELINE_E2E_URL=http://127.0.0.1:5195 npm run e2e:knowledge-access
E2E_URL=http://127.0.0.1:5196 BASELINE_E2E_URL=http://127.0.0.1:5195 npm run e2e:bodygraph-regression
```

结构化结果见[phase-5-validation.json](phase-5-validation.json)。本轮未更新main、8787或生产部署。
