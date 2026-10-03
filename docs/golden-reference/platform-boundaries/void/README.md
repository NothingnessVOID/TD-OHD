# hd.void.com.hk 独立边界与计算流程审计

采集日期：2026-10-03。来源：https://hd.void.com.hk/。

本轮使用 Codex 内置浏览器实际填写并点击计算，A–E 每例重复 3 次，共 15 次。正式结果与重复证据仅使用 `iab/`；非正式历史样本不发布。子代理不能设置 IAB visible:true，因此在 IAB 后台独立标签完成操作。所有正式采样封存后才读取既有 Golden/Swiss 对照数据；没有根据 expected 修改任何网页值。

## 1. Boundary results

| Case | Local / 手动 offset | Personality Sun | Personality Earth | Design Sun | Design Earth | Profile | 3 次稳定 |
|---|---|---|---|---|---|---|---|
| A | 2005-07-20 22:40 / +1 | 56.2 | 60.2 | 3.5 | 50.5 | 2/5 | 是 |
| B | 2015-01-26 01:20 / +0 | 41.4 | 31.4 | 44.1 | 24.1 | 4/1 | 是 |
| C | 2015-02-04 06:56 / +0 | 13.2 | 7.2 | 1.5 | 2.5 | 2/5 | 是 |
| D | 2025-01-19 22:57 / +0 | 60.4 | 56.4 | 28.1 | 27.1 | 4/1 | 是 |
| E | 1985-01-25 18:34 / +0 | 41.4 | 31.4 | 44.1 | 24.1 | 4/1 | 是 |

每次均保存 26 个 Gate.Line、26 个 Color、8 个 Tone（两侧 Sun/Earth/Node），以及 Type、Authority、Definition、Cross。未显示的 Tone 为 null，全部 Base 为 null；源代码内部确实计算 Base，但未读取隐藏运行时 chart 对象来填补 UI 缺口。Design Date/Design Time 未显示，记为 NOT DISPLAYED，未伪造 UTC。

Type / Authority / Definition：

| Case | Type | Authority | Definition | Cross 页面原值 |
|---|---|---|---|---|
| A | 生產者 | 情緒型權威 | 三分人 | 右角度交叉之律法2 (56/60 \| 3/50) |
| B | 生產者 | 情緒型權威 | 二分人 | 並列交叉之幻想 (41/31 \| 44/24) |
| C | 顯示生產者 | 薦骨型權威 | 二分人 | 右角度交叉之人面獅身 (13/7 \| 1/2) |
| D | 顯示者 | 情緒型權威 | 一分人 | 並列交叉之限制 (60/56 \| 28/27) |
| E | 投射者 | 自我投射權威 | 一分人 | 並列交叉之幻想 (41/31 \| 44/24) |

## 2. 与其他实现比较

对照严格使用完全相同 birth UTC；`results.json` 记录具体既有案例 ID、原始引用文件 SHA256 和逐激活差异。此处不是新跑 Swiss/Jovian 网页，而是采样结束后读取已有独立证据。

| Case | VOID P Sun / Profile | Jovian P Sun / Profile | Modern Swiss C / 修复后 TD-OHD | 完整 26 Gate.Line 对照 |
|---|---|---|---|---|
| A | 56.2 / 2/5 | 56.3 / 3/5 | 56.2 / 2/5 | VOID = Modern 26/26；Jovian 24/26 |
| B | 41.4 / 4/1 | 41.5 / 5/1 | 41.4 / 4/1 | VOID = Modern 26/26；Jovian 24/26 |
| C | 13.2 / 2/5 | 13.3 / 3/5 | 13.2 / 2/5 | VOID = Modern 26/26；Jovian 24/26 |
| D | 60.4 / 4/1 | 60.5 / 5/1 | 60.5 / 5/1 | VOID 与两者均 24/26；差在人格 Sun/Earth |
| E | 41.4 / 4/1 | 41.4 / 4/1 | 41.4 / 4/1 | VOID 与两者均 26/26 |

五例 Design Sun/Earth 均与 Jovian、Modern Swiss 一致。Genetic Matrix 本轮没有同 UTC 的可引用独立证据，标为 NOT INDEPENDENTLY COMPARED，不借名字或之前笼统说法填值。

“Modern Swiss C / 修复后 TD-OHD”指 `docs/moon-apparent-parity/results.json` 中正确 UTC→TT/UT1 的 Swiss C 2.10.03 oracle 与已修复 Sharp 输出；不代表未升级 8787 安装版的现状。

## 3. Calculation architecture

| 环节 | 结论 | 状态及证据 |
|---|---|---|
| 计算位置 | 浏览器 JS 直接算；此出生计算路径没有后端计算 API | CONFIRMED：`load.min.js::update()` 直接调用 `$processor`、Design 搜索、Gate mapping，再 `updateChart()`；核心脚本无 fetch/XMLHttpRequest/axios/ajax。资源清单仅见静态资源与 Google Analytics 等旁路请求。 |
| 出生输入 | 年/月/日/时/分 + 数字 GMT offset | CONFIRMED：实际 DOM；没有城市、纬度、经度输入。 |
| timezone→UTC | 数字 offset 手动减小时，再取 Date 日历字段 | CONFIRMED：`update()`。没有 IANA/历史夏令时解析，本轮 London 当日 offset 按用户指定手动设置。A 选 GMT+1，不选名字含 London 的 GMT+0。 |
| Julian Date | `$julian.calc(t)` | CONFIRMED：`update()`、上游 julian 模块。 |
| 天文位置 | Moshier 的纯 JS ephemeris 0.1.0；Mars/true_node/Chiron 使用静态 12 小时采样表插值 | CONFIRMED：逐字节上游比对、`calLongFromJul()`；不是正在调用 Swiss/JPL 服务。 |
| 输出位置 | 消费 `body.position.apparentLongitude` | CONFIRMED：`calLongFromDate()`；普通行星源代码包含 light-time、aberration、precession、nutation；Sun apparentLongitude 在 geocentric 处理后构造。 |
| Design | 太阳回退 88° 后搜索时刻 | CONFIRMED：`calculateDesignDate()` 目标出生 Sun−88°，从 JD−95 天逐步推进；最小步长 5e−7 天。不是固定减 88 天。未在本轮验证误差上限。 |
| Gate | offset 3.875°；Gate width 5.625°；明确 64 Gate 顺序 | CONFIRMED：`getPosInHexagram()`、`hexMap`。 |
| Line/Color/Tone/Base | Floor 分段；宽度 0.9375° / 0.15625° / 0.0260416666666667° / 0.00520833333333333° | CONFIRMED：`setPlanetSubHexData()`。没有 epsilon。 |
| Profile | 两侧 Sun Line | CONFIRMED：`calculateProfile()`。 |
| Nodes | `true_node` 静态黄经表；South Node 为对跖点 | CONFIRMED：`calLongFromJul()`、`calculatePlanetData()`。静态表生成引擎 UNKNOWN。 |
| 后端 endpoint / payload / response | NOT APPLICABLE 于当前公开出生图计算路径 | 未发现出生数据计算 API，也没有合法计算 JSON response 可保存；保存的是 DOM、公开 JS 和静态资源清单，不冒称 API response。 |

### 时间尺度的额外源证据

`update()` 将减去 offset 的日历字段直接给 `$processor.calc()`。上游 `$moshier.delta.calc()` 明确把输入 JD 设为 terrestrial，再设 universal = terrestrial − ΔT/86400；此调用层未见把民用 UTC 输入先推进到 TT 的步骤。ΔT 表结束年份为 2011，之后使用外推。这个源层行为可追溯，但本轮未跑数值分解，所以不据此唯一归因 D 的边界差异，也未改任何代码。

另一个源层问题：`timezone` 使用 `parseInt`，会截断 +5.5/+5.75 等分数 offset。它不影响本轮 +0/+1/+8 输入；这里只记录，没有顺手修复或扩展成新测试。

## 4. 公开代码证据和来源

所有 URL 都来自页面实际加载的脚本链接，没有猜管理接口、登录绕过或扫描。

- https://hd.void.com.hk/load.min.js：`cleanInput()`、`update()`。
- https://hd.void.com.hk/calculations/calculations.min.js：`calLongFromDate()`、`calLongFromJul()`、`calculateDesignDate()`、`calculatePlanetData()`、`getPosInHexagram()`、`setPlanetSubHexData()`、`calculateProfile()`。
- https://hd.void.com.hk/calculations/ephemeris-0.1.0.min.js：`$ns.processor.calc`、Moshier sun/planet/moon/delta/julian/precess/nutation/light/aberration。
- https://hd.void.com.hk/calculations/node_ephemeris_12H.min.js、mars_ephemeris_12H.min.js、chiron_ephemeris_12H.min.js：间隔0.5 Julian day、起始JD 2396758.50、黄经数值表。
- https://hd.void.com.hk/graph/graphs.min.js：DOM/SVG 图表和行星 info 字段。

文件都是 minified，大部分只有一行；`code-evidence.json` 给出函数名、UTF-8 byte offset 和原始函数文本，避免伪造可读源码行号。原始下载仅保留本地；公开 URL/取回时间/文件 SHA256 发布于 `public/manifest.json`，关键函数片段见 `code-evidence.json`。未发现 sourceMappingURL 注释，本轮不猜 `.map` 地址。

### 可证明的开源依赖

https://github.com/mivion/ephemeris

- 该库 README 明确为基于 Steve Moshier 的纯 JavaScript 天文实现，GPL v2。
- VOID 的 `ephemeris-0.1.0.min.js` 与仓库 `build/ephemeris-0.1.0.min.js` 逐字节相同。
- SHA256：`b9bd657cdd02556734ec2e556479a8320f6b58597772eec8ac30f22a77994195`。
- 检查时 upstream master commit：`d82ed7c4ee7c9c17601034dc2ec132fd1c9057dd`。
- 本地保存了 GitHub root/build listing、commit、README、minified 与未压缩 build；本次只发布所核对的 commit 和文件哈希，不发布含第三方邮件信息的 GitHub commit 原始 JSON。
- 原站自有 Human Design JS 没找到可证实关联的开源仓库或 license/version。原站页脚显示 Without Limited 2022；这不证明具体代码作者。
- 公开 `chart.newngohk.com` 页脚称感谢 Hercules @void.com.hk，是开发来源线索，不能据此认定谁写了全部算法或其软件版本。

## 5. Ephemeris 可以确定到哪一步

**CONFIRMED**：所加载天文 JS 的字节内容与 Moshier-based `mivion/ephemeris` 0.1.0 build 一致。

**NOT DISCLOSED / UNKNOWN**：12 小时 Mars、Node、Chiron 表的生成工具、Swiss/JPL/DE 数据源和版本、flags、插值前原始坐标与时间尺度。文件名不包含这些信息，不能因为数组是黄经就说是 DE441。

普通行星的 ephemeris 路线可以确定为已下载 JS 中的解析/级数算法。未见 Swiss binary、DE405/DE441 文件或 Swiss/JPL API 调用；不能把整体称为 Modern Swiss C 的独立复制。

## 6. 时区等价与异常检查

C 的 `2015-02-04 06:56 GMT+0` 与 `2015-02-04 14:56 GMT+8`：

- 26 Gate.Line 全部一致。
- 已显示的所有 Color/Tone/百分比全部一致。
- Type/Profile/Authority/Definition/Cross 全部一致。
- 两张来源 JSON 保存于 `iab/timezone-C-UTC0.json`、`iab/timezone-C-UTC8.json`。

公开输入与计算路径没有用户经纬度传递，也没有出生图 API payload。在本路径中可以确认出生信息只通过日期时间与数字 offset 进入计算。库内部有默认经纬度，供其其他坐标/高度计算；不能把“未传用户经纬度”夸大成库完全没有经纬度字段。

15 次正式计算未出现不一致、重复 planet ID、遗漏26项、stale chart 或前例状态污染。每例都在前例后更新输入，C 另外完成等价时区实验。只证明本批次稳定，不能排除网站偶发问题；原站确实有错误盘提醒。

## 7. 结论

VOID 使用浏览器端 Moshier JavaScript 天文计算与若干预计算黄经表，再用 3.875° Mandala offset 进行 HD 分段，Design 采用搜索太阳回退88°。其核心天文代码来源可通过字节哈希证明。

它可以作为独立交叉观察源，不能作为 TD-OHD 数值准确性的 Golden Reference：A/B/C/E 的26激活恰与修复后的Modern Swiss相同，但D的人格Sun/Earth及Profile与Modern Swiss、Jovian均不同。源调用还有时间尺度和分数时区待核查点。不能依据4个案例相同宣称整体算法一致。

## 证据与复查

- `results.json`：规范化26激活、概要、各方差异、引用哈希。
- `iab/{A..E}-repeat-{1..3}.json`：每次原始DOM字段、输入、URL、UTC采集时间、完整SVG。
- `iab/{A..E}-repeat-{1..3}-dom.txt`：每次页面快照。
- 完整重复截图保留本地，本次只发布已检查的 `iab/C-summary.jpg`；15 次 DOM/JSON 全部发布。
- `iab/C-summary.jpg`：输入、出生图和概要的紧凑证据截图。
- 其他截图仅保留本地。
- 原始浏览器资源和 console 记录不发布。
- `public/manifest.json`：公开脚本 URL 与哈希；完整脚本/星历表不发布。
- `code-evidence.json`：关键函数原文与byte offset。
- `../verify-evidence.py`：只读核验公开样本、重复稳定性和比较结果；不向远程服务请求。

采集时未改 TD-OHD；此目录为后来发布的审计资料，未改生产代码、未部署、未生成正式缓存。
