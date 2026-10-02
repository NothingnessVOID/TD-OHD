# Phase 4C 验证

根据真实运行记录和浏览器输出自动生成。

| 命令 | 状态 | passed | failed | skipped |
|---|---|---:|---:|---:|
| npm run e2e:chart-data-export | passed | — | — | — |
| npm run e2e:reference | passed | — | — | — |
| npm run e2e:planet | passed | — | — | — |
| npm run e2e:appearance | passed | — | — | — |
| npm run e2e:sharp | passed | — | — | — |
| npm run e2e:timeline | passed | — | — | — |
| npm run e2e | passed | — | — | — |
| npm run e2e:gate-meridian | passed | — | — | — |
| node tests/browser-comments-e2e.mjs | passed | — | — | — |
| node tests/channel-detail-layout-e2e.mjs | passed | — | — | — |
| node tests/graph-mobile-size-e2e.mjs | passed | — | — | — |
| node tests/premerge-corrections-e2e.mjs | passed | — | — | — |
| node tests/review-round2-e2e.mjs | passed | — | — | — |
| node tests/quarter-correction-e2e.mjs | passed | — | — | — |
| node tests/reference-v1-acceptance-e2e.mjs | passed | — | — | — |
| node tests/share-views-e2e.mjs | passed | — | — | — |
| node tests/graph-window-fixing-colors-e2e.mjs | passed | — | — | — |
| node tests/transit-window-reuse-e2e.mjs | passed | — | — | — |
| node tests/timeline-conditions-e2e.mjs | passed | — | — | — |
| node tests/annual-fallback-e2e.mjs | passed | — | — | — |
| npm test | passed | 262 | 0 | 3 |
| npm run test:localization | passed | 34 | 0 | 0 |
| npm run test:timeline | passed | 61 | 0 | 0 |
| npm run build | passed | — | — | — |
| node tests/knowledge-layer-e2e.mjs | passed | — | — | — |

## 布局与单语言

12组对照：1224/903/664/390 × en/zh-CN/zh-Hant。基础卡数量和宽度一致；授权的Summary、Authority名称及移除双语标签可能改变自然换行高度，实际变化见validation.json。没有修改布局CSS。

每组向全部现有Detail注入超过五万字符后，Foundation文字和卡片宽高、Variable摘要区文字和高度完全相同。中文Variable卡片和基础箭头标签没有英文附加，英文知识资源没有中文。Cross panel使用短共用摘要并移除70%正文。证据覆盖代表图和指定宽度/语言，不宣称穷举。

构建保留已有大chunk提示。临时服务仅用于分支测试；未更新8787、main或生产部署。
