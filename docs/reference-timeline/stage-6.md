# 阶段 6：总回归与交付记录

## 实际修改

- 单时刻行运页保留日期、时间、时区与结构信息；秒和纯行运模式收进高级设置。“现在”按当前选定时区填写。去掉无法从数据推出的“最强主题”和空通道人生判断。
- 出生输入及关系、团队共用地点搜索支持按输入文字选择语言、无结果／网络错误反馈、输入法组合与过期请求取消；无效时差和解析失败不悄悄按 UTC 计算。
- 新分享默认只含 `d/t/tz/tu` 复算字段，旧链接仍可读取。字段预览真实展示输出，复制失败不引导复制旧地址。静态与本机版可从现有 SVG 导出无姓名标签的 PNG；导出时消除入场动画对图层的影响。
- 原有图形与关系图色彩集中到变量，保留浅／深色差异；修复切换主题时时间轴 SVG 缓存未重绘造成的行运环颜色滞后。手机高级设置移入控制面板，恢复图与轨道的 60/40 全屏分区；筛选结果点击可定位并高亮，反向通道编号可查询。

## 已执行验证

| 验证 | 结果 |
|---|---|
| `npm test` | 最终复跑共 162 项中 160 通过、2 失败。两项均是阶段 0 即存在的 MCP 在线地理编码 `fetch failed`，与本地功能测试分开记录。 |
| `npm run test:timeline`、`npm run test:localization` | 54/54 与 30/30 通过。 |
| `node --test tests/location.test.js tests/share.test.js tests/local-server.test.js` | 16/16 通过；本地账户临时服务测试包含两浏览器会话、持久保存、合并、权限边界和重启。 |
| 开发服务器浏览器测试 | `timeline-e2e`、`timeline-gestures-e2e`、`timeline-mobile-touch-e2e`、`timeline-mobile-layout-e2e`、`timeline-conditions-e2e` 均通过。 |
| 静态预览浏览器测试 | `reference-e2e` 与 `timeline-conditions-e2e` 通过。 |
| 构建 | `npm run build:desktop`、`npm run build:pages`、`npm run check:pages-bundle` 均通过；静态包不含本机账户客户端。 |
| 年度数据浏览器复用 | 7 天→28 天→7 天只请求 manifest 一次、2026 年年度文件一次。 |
| 单时刻“现在” | 桌面及手机视口把时区设为 `Asia/Tokyo` 后点击“现在”，仍为 `Asia/Tokyo`。 |
| 静态 PNG | 桌面、手机视口及深色主题均成功下载 1080×1920 图片；目视确认身体图通道与中心完整，无个人姓名和地点标签。 |
| 后续验收补测 | `tests/annual-fallback-e2e.mjs` 验证年度文件 HTTP 503 时只回退请求的 7 天；`tests/place-search-e2e.mjs` 验证三个地点入口、手动时差、输入法组合、候选时序与反馈；`tests/quarter-correction-e2e.mjs` 验证有来源依据的 3 号闸门象限纠错。 |
| 贯通验收 | `ACCEPTANCE_CAPTURE=1 E2E_URL=http://127.0.0.1:5187 node tests/reference-v1-acceptance-e2e.mjs` 在桌面 1440×1000 和手机模拟视口 390×844 均通过。各从同一合成二分出生盘走完通道、闸门六爻、资料库同文、行运、7→28→7、闸门导航、多条件、桥接、无身份字段复制分享和刷新恢复；各只请求一次年度文件。 |

预览证据：[桌面行运](stage-6/desktop-transits.png)、[手机行运](stage-6/mobile-transits.png)、[手机时间轴](stage-6/mobile-timeline.png)、[手机控制面板](stage-6/mobile-controls.png)、[桌面贯通验收](stage-6/acceptance-1440.png)、[手机贯通验收](stage-6/acceptance-390.png)、[静态导出浅色 PNG](stage-6/desktop-chart.png)、[深色 PNG](stage-6/dark-chart.png)。所有人物数据均为合成样本；手机是浏览器视口模拟，并非 iOS/安卓实机。

## 已知问题与未验证项

- `npm test` 中两项原有 MCP 在线地理编码用例仍因 Node `fetch failed` 失败；浏览器直接调用与 `curl` 已分别核对“上海／Shanghai”和“東京／Tokyo”，两组各返回相同坐标及 IANA 时区。输入页的过期候选、两字符搜索、无结果与网络错误用隔离浏览器测试通过。真实账户环境中的网络策略仍未核验。
- 年度生成使用一分钟离散扫描和 1000 毫秒边界收敛；同一分钟内同一点回到相同状态的极端往返仍可能漏记。年度对照是约 2 万时刻／年，并非连续时间形式证明。
- 未做物理手机、完整屏幕阅读器路径、长期内存压力和生产部署验收。本机正式账户数据库和运行中安装未接入本分支；账户数据完整性由隔离的本地服务测试证明代码路径，不能声称已对真实账户逐条核验。
- 资料资产完成结构清点，原件保留在本地忽略目录；文本真伪和逐条术语审校仍列为待核，未用模型填空。

回退点为本阶段独立提交；前五阶段提交与固定基线均保留。没有合并 `main`、推送或部署生产。

最终汇总与逐项证据分别见 [交付报告](final-report.md) 和 [验收逐项记录](acceptance-checklist.md)。
