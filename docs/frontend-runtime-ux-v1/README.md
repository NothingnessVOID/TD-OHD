# Frontend Runtime UX V1

分支：`fix/frontend-runtime-ux-v1`。基线：最新 `main`，`2bc308b7a9037a10bae92fff6c9ff536a276b8ae`。

本轮只修复前端启动、人物持久化、地点选择和时间轴显示范围。未修改 Human Design / Sharp / Swiss、Golden Reference、Knowledge 正文、年度数据、关系分析或 Penta 算法。未合并、未部署、未触碰 8787 安装。

## 八项问题与实现

| 问题 | 根因 | 本轮实现 |
|---|---|---|
| 网页 Sync | `API !== undefined` 将空字符串当成同源 API 配置 | `isSyncAvailable()` 要求非空 API，且 flag 不为 `false`。production 明确关闭。main 不调用 Sync 初始化，auth/sync 方法也有保护。保留未来启用能力。 |
| 首帧语言与自动翻译 | 静态 HTML 是英文，运行时又根据浏览器语言推断 | head 中同步读取保存语言，默认 zh-CN；运行时遵循相同规则。i18n 完成后才显示 app，根与 app 均 `translate="no"`。保留三语言手动选择、持久化。 |
| 恢复出生图时表单闪烁 | birth-entry 静态可见，读取 lastPersonId 与 WASM 计算发生在后面 | 表单默认隐藏；初始化期间显示轻量恢复状态，计算完成后直接显示图。无人物或失效 ID 才显示输入。分享、邀请、不完整链接、资料库深链继续按原优先级处理。没有延时遮罩或新增存储。 |
| Connection 手动人物不保存 | 只有 `localMode` 才调用保存 | 成功计算比较后，具名有效人物调用共享 `saveTemporaryBirth()`。仍由 PeopleStore 保存，保存通知立即更新 header / Connection 列表。默认 Person B、空姓名不自动保存。 |
| Team Quick Add 不保存 | 同样只有 localMode，且保存发生在完整团队结果之前 | 先收集成功计算的具名出生资料，团队至少两人且分析成功后才保存。复用同一个 helper；不会保存未成功参与的孤立成员。 |
| 地点搜索分叉与真实城市失败 | Entry 和其他页面各有一套控制器；GeoNames 中文索引名称不同；PPLA4 被过滤 | Entry 复用 `createPlaceSearch()`，保留原 DOM ID。通用中文市/区/县后缀重试，允许有效 PPLA3/PPLA4 行政驻地，不新增城市映射。无结果/网络故障给附近城市、上级城市及手动时差入口。 |
| 手机控制遮挡行星 | 辅助控件和行星列尺寸未随窄屏协调；上一轮 52px 底栏又挤压图表 | 已撤销底栏，恢复原图表完整 pane 和 60/40 比例。控件浮动，range 位于右下箭头上方并右对齐，箭头右下，行星列整体缩放。高级面板向上浮动。详见 [最新 Range 定位](range-event-navigation/README.md) 与 [手机浮层恢复](mobile-floating/README.md)。 |
| 范围面向过去与未来居中 | 天数预设按中心分配，一年按前后半年 | 1 天保留；N 天改成前一天＋未来 N 个自然日；一年改为选中时刻到下一年周年。过去一年保留原语义。 |

### 保存身份与数据

共享 helper 检查姓名、真实日历日期、有效时间与显式时差。姓名＋出生日期＋完整时间（保留秒差）＋timeUnknown＋UTC offset 构成匹配基础；已有与新 IANA 都存在且不同时，保留不同人物。相同人物复用 ID，地点资料可升级；手动时差重算不会抹去原有地点信息。其余数据继续通过现有 PeopleStore 保存，没有 Connection/Team 私有数据库。

保存字段包含 name、birthDate、birthTime、timeUnknown、timezone，以及 location 的 lat、lon、iana、name。UI 日期/时间修改后，共享组件重新计算历史时差；日期尚未填完时，不把今天的时差冒充出生时差。

## 地点 API 实证

原始证据见 [location-evidence.json](location-evidence.json)，共 11 个查询 × 2 个 language，使用真实公开 API 返回。

| 查询 | 真实返回与诊断 |
|---|---|
| 温州 | zh/en 均无结果，未进入前端过滤，因此不是 population 过滤误杀。 |
| 温州市 | zh 返回温州市，PPLA3，population 2,650,000，Asia/Shanghai；en 无结果。 |
| Wenzhou | zh/en 均返回城市；language 改变返回名称，不能保证把中文查询转换为英文查询。 |
| 上海 / Shanghai | 城市正常返回，存在若干低人口或无人口的同名村落。保留城市排序与村落过滤。 |
| 瑞安市 / 瑞安 | 前者无结果，后者返回人口 927,383 的 PPL；通用去行政后缀重试可修复。 |
| 永嘉县 / 永嘉 | 前者无结果，后者返回 PPLA4、population 22,377；原过滤器排除 PPLA4。 |
| 鹿城区 / 鹿城 | 均无结果，继续给出附近/上级城市和手动时差建议，不伪造候选地点。 |

API 行为说明：[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)。两字符是精确名称匹配，三个及以上按索引名称前缀匹配；`language` 用于返回名称的本地化。本轮在原 32 条结果设置下复现，所以温州的问题没有靠增加 count 解决。

出生地点用于确定出生当地历史民用时区。附近/上级城市属于同一 IANA timezone 时可以使用；不加经度或真太阳时修正。上海夏令时案例仍从历史时区求得 1990 年夏季 UTC+9，2000 年夏季 UTC+8。没有地点选择或显式手动时差时返回空结果，禁止静默 UTC+0。

## 范围的精确定义

所有范围使用 `[start, end)`：start 包含，end 不包含。

* 1 天：选中当地日期的开始至下一个当地日期的开始。
* N = 3/7/30/90/180：start 为前一个当地日期开始；end 为选中当地日期加 N 的开始。总共 N+1 个日期，前一天是上下文。例如选中 10 月 5 日、7 天范围为 `[10 月 4 日 00:00, 10 月 12 日 00:00)`。
* 一年：选中时刻至未来一个 calendar year 的当地周年时刻。Feb 29 钳制到 Feb 28，DST gap 取下一个有效分钟，fold 优先保留原 UTC offset。
* 过去一年：过去一个当地周年时刻至选中秒的结束（原 exclusive end = selected + 1000ms）。

日期边界由 IANA timezone 定位；没有将 N×24 小时当作当地自然日。3 天预设跨纽约春季 DST 为 95 小时，秋季为 97 小时；Apia 跳过日期继续正确解析。

## 验证

| 验证项 | 最终结果 |
|---|---|
| npm test | 274 项：271 passed，0 failed，3 skipped（原项目默认的在线 MCP/地点测试）。 |
| test:localization | 34 passed，0 failed。 |
| test:timeline | 61 passed，0 failed。 |
| profile / location / temporary birth / boot config | 18 passed，0 failed；也包含于主测试。 |
| npm run build | passed；引擎签名仍为 `59b90e629033cc7faf95`。 |
| place-search-e2e | Entry / Connection / Team，IME、stale response、网络错误、无结果、手动 fallback passed。 |
| frontend-runtime-e2e | 开发预览与 production 构建均 passed：恢复首帧无输入表单、默认简体、保存语言、无 Sync 请求、人物保存与去重、不成功团队不保存、分享/邀请/资料库/失效 ID。 |
| e2e:timeline | 时间轴主流程、gesture、mobile touch、mobile layout 全部 passed；包含 future year / past year。 |
| e2e:chart-data-export | 三语言匿名出生图、Transit、Timeline 与剪贴板 passed。 |
| e2e:appearance | 1224 / 390px 外观、明暗隔离、颜色与持久化 passed。 |
| e2e:reference | desktop/mobile passed。 |
| e2e:planet | 出生图 / Transit / Timeline 的 Planet→Gate→Back，desktop/mobile passed。 |

浏览器测试使用隔离 Chromium 和合成出生数据，端口 5230 / 5231；未使用用户资料或现有浏览器账户。旧临时 SDK 缺文件，使用独立临时 SDK 10.0.401 / runtime 10.0.12 完成构建。早期因环境/旧期望产生的失败已修正；一次键盘缩放断言在繁忙运行中读到了事件前状态，测试改为等待实际范围改变。

### 发布材料保护

旧 release-licensing 报告保留为历史快照，不改旧 bundle 哈希。前端变更必然生成新 bundle，因此主测试改用本轮 [validate.mjs](validate.mjs) 与 [review-hashes.json](review-hashes.json)：严格限制可变前端路径、逐文件保护其余计算/资料/年度来源、核对所有 notices、当前完整 distribution 哈希与 Swiss 文件哈希。未放松引擎保护或修改许可结论。

重新构建后可运行：

```sh
npm run build
python3 docs/frontend-runtime-ux-v1/write-review.py
npm test
```

build 不保证跨不同工作目录字节完全相同；更新 review hashes 需要重新人工审查，不能借此接受计算或 Knowledge 变更。

## 手机截图

此处四张为上一轮快照。最新右下 Range 截图见 [范围定位修正](range-event-navigation/README.md)。前次浮层修正及 main 原设计 / 上一版 / 修正后三方对照见 [修正报告](mobile-floating/README.md) 与 [对照页面](mobile-floating/comparison.html)。

* [390×844](timeline-390.png)
* [375×667](timeline-375.png)
* [360×640](timeline-360.png)
* [320×568](timeline-320.png)

最新版本检查控件与两列不重叠、两列避开实际 SVG 九个中心，以及打开面板前后的 pane/SVG 尺寸一致；允许浮层使用图表的空白区域。

## 已知边界

Open-Meteo 仍无法覆盖全部区县/村落，故保留可见 fallback；不保证任意中文地点都能命中。已有小型村落过滤仍保留。姓名与出生资料相同的记录可去重，但改名/不同出生资料不会被主观判断为同一人。手动 UTC offset 的历史正确性由输入者确认；输入空值不会被当作 0。

## 修改文件

完整清单见 [changed-files.txt](changed-files.txt)。构建产物、SDK、node_modules 不提交；仅提交源码、测试、文档、公开 API 证据、哈希记录和合成样例截图。
