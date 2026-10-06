# 阶段 2 验证

日期：2026-10-02。Node v26；.NET 10；SharpAstrology.HumanDesign 1.2.0 / SwissEph 0.5.1；Chrome headless；独立 Vite 5191。测试不读正式账号或老师资料，不升级正式 8787 安装。

## 最终结果

| 检查 | passed | failed | skipped |
|---|---:|---:|---:|
| npm test | 247 | 0 | 3 |
| npm run test:localization | 34 | 0 | 0 |
| npm run test:timeline | 61 | 0 | 0 |
| 新契约与 Variable 直接测试 | 13 | 0 | 0 |

`npm run build` 成功：原生 C# / 浏览器 WASM 构建、Swiss 文件校验、Vite 打包均成功。保留已有 >500 kB chunk 提示，未调整构建策略。

## 契约数据对照

- 320 张确定性生成的出生图：定义岛差异 0。
- 覆盖 Single 120、Split 159、Triple Split 34、Quadruple Split 1、Empty 6。
- 五个定义类型各一份真实 native fixture，每次测试重新通过 pinned native 计算核对 fixture；没有把手写组件当引擎实算证据。
- 320 图旧/new adapter 对照：类型/权威显示、人生角色、定义名称、十字名称、四箭头原文/编码、中心展示状态差异 0。
- 132 图的有效回路统计发生授权变化：统一 topology 将旧 integration 归 individual。通道激活和其他数值没有修改。
- Variable：24 条原解释与名称，全部 Color/Tone/Base 组合检查；derived 数据无解释正文。
- Gene Keys：64 门三关键词 canonical / 旧 spectrum / 英文 UI 全一致；既有 64 份 Gene Keys 完整输出哈希仍通过。
- 64 对真实出生图关系输出、32 组三人团队输出：旧/new adapter 传入结果完全相同。
- 现有合成关系64、团队32哈希保持通过。行运64哈希先明确验证新有效 circuit，再只把该授权变更投影为旧值比较历史哈希；其余结构、建议与文字仍严格核对。

复现岛组比较：

```bash
DOTNET=/path/to/dotnet node scripts/check-chart-contract-boundary.mjs
```

证据摘要：[validation.json](validation.json)。

## 浏览器 E2E

以下全部通过（`E2E_URL=http://127.0.0.1:5191`）：

- `npm run e2e:chart-data-export`：真实剪贴板、三语匿名出生图、行运时刻及太阳值、加载期间防旧数据、时间轴和排除页面。
- `npm run e2e:reference`：桌面与手机资料库查找、Lens、深链。
- `npm run e2e:planet`：出生图/行运/时间轴 Planet → Gate → Back，桌面与手机。
- `npm run e2e:appearance`：两个子脚本，颜色语义、四箭头、菜单、主题独立性、持久化和恢复；1224/390px。
- `npm run e2e:sharp`：52 时刻 × 13 点 × 六字段，浏览器 WASM 与 native 一致；缺 Swiss 文件明确失败；快速切时刻、DST fold、详情与异步路径通过。
- `node tests/timeline-e2e.mjs`：时间轴切人、触摸、宽度、黏性布局、年范围及详情通过。

另以审计基线 5192 与当前分支 5191 比较同一出生图（2000-05-10 12:30 GMT+8）：1224/903/664/390px × 英文/简体，共8组；基础信息卡文字、卡片数量、宽度、高度全部一致。页面源码和样式文件未改。此证据覆盖该代表图与窗口组合，不宣称穷举所有图的像素状态。

## 修复过的首轮测试问题

首次新回路单测只提供 Sun，行运 API 还要求 Moon；补齐测试输入后通过。旧行运哈希因本轮授权的有效回路分类改变而失败，已拆分“新分类断言”和“其余旧输出哈希”核对，没有重新录制全部旧哈希。

真实关系对照最初发现新增 rawId 会随 sharedChannels 输出扩散；已将通道 rawId 仅放入 raw/calculation 层，旧 channels 完全保持原目录对象，再核对64对/32组通过。

最终没有失败项。正式 Human Design/Gene Keys/语言资料、关系与团队算法文件、UI 页面/样式、时间轴算法和用户存储均未修改。阶段 1 审计历史保留，仅追加本轮状态。
