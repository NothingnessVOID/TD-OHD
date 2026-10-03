# myBodyGraph 极端 Line boundary 独立采集

采集日期：2026-10-03。使用已有合法登录会话，用户自行完成账户个人图表设置后，按 A–E 原始当地出生资料输入。所有图表地点选择 London (England), United Kingdom。未注册、未购买、未绕过权限。

## 盲采与结果

A–E 全部采集完成并保存 `blind-collection-lock.json` 哈希之后，才打开 Jovian / Modern Swiss C 既有参考文件。未按 expected 修改输入或输出。

| Case | Local | 页面 Birth UTC | P Sun | P Earth | D Sun | D Earth | Profile | Type |
|---|---|---|---|---|---|---|---|---|
| A | 2005年7月20日 22:40 | 2005年7月20日 21:40 | 56.3 | 60.3 | 3.5 | 50.5 | 3/5 | Generator |
| B | 2015年1月26日 01:20 | 2015年1月26日 01:20 | 41.5 | 31.5 | 44.1 | 24.1 | 5/1 | Generator |
| C | 2015年2月4日 06:56 | 2015年2月4日 06:56 | 13.3 | 7.3 | 1.5 | 2.5 | 3/5 | Manifesting Generator |
| D | 2025年1月19日 22:57 | 2025年1月19日 22:57 | 60.5 | 56.5 | 28.1 | 27.1 | 5/1 | Manifestor |
| E | 1985年1月25日 18:34 | 1985年1月25日 18:34 | 41.4 | 31.4 | 44.1 | 24.1 | 4/1 | Projector |

全部 130 项 Gate.Line（5 × 26）保存在 `blind-results.json`。13 项顺序通过 A 的免费 Planetary Activations 页面标签确认。Color/Tone/Base 在本轮实际查看的免费界面未显示；未解锁 Advanced Imaging/付费分析，也未读取隐藏付费内容。

## Design 日期及 Cross

“Design Date”标签没有说明时区，以下保留显示值，不能当作已确认精确 Design UTC。页面只显示到分钟。Cross 中文显示受现有 Chrome 自动翻译影响，保留原始页面文字，不自行修正文案。

| Case | 页面 Design Date | 页面 Cross |
|---|---|---|
| A | 2005年4月20日 05:46 | 直角十字法则（56/60 \| 3/50） |
| B | 2014年10月31日 06:20 | 左角十字形（41/31 \| 44/24） |
| C | 2014年11月9日 14:55 | 狮身人面像直角十字架（13/7 \| 1/2） |
| D | 2024年10月25日 01:26 | 左角十字干扰（60/56 \| 28/27） |
| E | 1984年10月31日 00:04 | 奇幻的并置十字 (41/31 \| 44/24) |

## 采集后对照

**Jovian Archive：五例全部 26 项 Gate.Line 与 Profile 一致（130/130）。** Cross 四闸门组合也一致；名称仅作页面显示对照，未把翻译差异当作计算差异。

Modern Swiss C / 修复后 Sharp：引用现有 `docs/moon-apparent-parity/results.json`，该记录的天文 oracle 是 Swiss C 2.10.03，映射沿用未改的 HumanDesign 1.2.0。不是本轮重新计算，也不是重装后的 8787 测试。

| Case | myBodyGraph P Sun/Earth | Modern Swiss C parity P Sun/Earth | Profile：myBodyGraph / Modern |
|---|---|---|
| A | 56.3 / 60.3 | 56.2 / 60.2 | 3/5 / 2/5 |
| B | 41.5 / 31.5 | 41.4 / 31.4 | 5/1 / 4/1 |
| C | 13.3 / 7.3 | 13.2 / 7.2 | 3/5 / 2/5 |
| D | 60.5 / 56.5 | 60.5 / 56.5 | 5/1 / 5/1 |
| E | 41.4 / 31.4 | 41.4 / 31.4 | 4/1 / 4/1 |

A、B、C 只有 Personality Sun/Earth 的 Line 不同，其余每例 24 项一致。D、E 每例 26 项一致。Design Sun/Earth 五例均一致。

Genetic Matrix：本轮未找到这五个精确 UTC 的独立已存证据，未重新测试，标为 NOT INDEPENDENTLY COMPARED；不根据会话中笼统表述宣称一致。

## 公开技术披露

| 项目 | 结论 | 证据/限制 |
|---|---|---|
| 出生地用途 | CONFIRMED：官方说明仅用于取得时区 | https://help.mybodygraph.com/en/articles/12301992-i-can-t-find-a-city-in-your-drop-down-list |
| 输入时间 | CONFIRMED：官方帮助要求当地出生日期、24h时间及城市建议项 | https://help.mybodygraph.com/en/articles/12301987-how-do-i-create-a-new-personal-chart |
| 本例 UTC 换算 | CONFIRMED：A 为 22:40 → 21:40；B–E local=UTC | 五张页面摘要及截图 |
| 时区数据库 / 历史 DST 实现版本 | NOT DISCLOSED | 本轮阅读的 Help/About/Terms 未找到说明 |
| Tropical / Sidereal | NOT DISCLOSED | 不由 HD 标准或结果相似反推 |
| geocentric / topocentric | NOT DISCLOSED | 同上 |
| 真太阳时 | NOT DISCLOSED | “地点仅用于时区”是实际公开证据；未把它扩大成后台算法验证 |
| Design 精确 88° / 求根规则 | NOT DISCLOSED | 显示 Design Date 不等于披露公式 |
| Swiss Ephemeris / JPL / DE 版本 | NOT DISCLOSED | 不能由品牌或 Jovian 一致反推 |
| precession / nutation / frame bias / ΔT | NOT DISCLOSED | 未找到公开精确公式 |
| exact longitude | NOT ACQUIRED | 页面未显示；原始网络 response 尚未保存 |
| calculation engine/version | NOT DISCLOSED | 显示品牌/前端构建哈希不能当计算引擎版本 |

阅读来源：https://help.mybodygraph.com/en/ 、https://www.mybodygraph.com/ 、https://www.mybodygraph.com/about-us 、https://www.mybodygraph.com/about-human-design 、https://www.mybodygraph.com/terms-conditions 。披露结论限于本轮检索与已阅读页面，不能证明所有未阅读文档都不存在相关说明。

## 页面资源与 Network 检查

原始 `page-assets.json` 只留本地，避免公开跟踪与账户关联标识。已观察公开 bundle：

* https://app.mybodygraph.com/js/app.5623a478.js
* https://app.mybodygraph.com/js/chunk-vendors.9aeccd79.js
* https://app.mybodygraph.com/js/477.2552f9ec.js
* https://app.mybodygraph.com/js/893.7e925f51.js

公开脚本补充检查已完成，原始字节、URL、取回时间、SHA256 和关键代码位置保存在相邻目录 `public-js/`，详见该目录 `README.md`、`manifest.json`、`field-evidence.json`。

实际公开客户端源码可以确认：

* 消费 `chart.planets[0].longitude`（Sun）、`chart.planets[2].longitude`（Moon），行星字段包含 `id, activation, chartId, longitude`。
* 消费 `chart.meta.birthData.time.utc`、`time.design`、`time.local`。
* 配置的 charts 服务为 `https://charts.maiamechanics.com`，代码包含 `/api/charts/<id>` GET 与 `/api/cities/v3`。
* 未发现明确 Swiss/JPL/DE 版本、坐标 flags、UTC/TT/UT1 规则或 Design 88° 实施公式；“Ephemeris”功能标签不代表具体星历实现。

这说明客户端模型有 longitude 和时间字段，不代表已获得本批图表的原始 JSON、黄经数值、单位或精度。静态代码与实际 response 明确分开。没有读取或发送真实认证 token。

Chrome DevTools Network 在 E 页面正常重载时实际观察：

* `https://charts.maiamechanics.com/api/charts/[REDACTED_ID]`：XHR 200，资源约 9.5 kB，另有 204 preflight。
* `https://charts.maiamechanics.com/api/cities/v3?search=London`：XHR 200，资源约 1.8 kB。

说明图表加载依赖该网络服务；尚未保存原始 response、HTTP method 或 payload，不据此声称已证明完整服务端计算路线。浏览器用户切换及开发工具交互未能获得返回 body。没有重放认证请求、导出 cookie/token、调用未经观察的接口或绕过权限。技术调查这一部分存在明确证据缺口。

## 本地证据

* 输入截图含账户显示信息，保留本地，不发布；合成输入值在本层 `../golden-cases.json`。
* `A–E-summary.jpg`：页面摘要/日期/类型/Profile/Cross。
* `A–E-ax.txt`：全26项图表激活与页面属性（AX 脱敏文本；移除账户页头和图表链接标识）。
* `A-planetary-ax.txt` / `A-planets.jpg`：确认行星标签及顺序。
* `E-summary.jpg`：负对照摘要截图。含账户页头的其他截图不发布。
* `blind-results.json` / `blind-collection-lock.json`：采集输出与封存哈希。
* `comparison.json`：之后的对照、参考文件哈希与 mismatch 清单。

采集时未改 TD-OHD。此目录为后来提交的脱敏证据副本，只追加审计资料，未改生产代码、安装或正式缓存，未部署。

## 发布隐私边界

账户显示名、账户内图表/分享/个人图表 ID、浏览器 tab ID、本机绝对路径和原始资源跟踪记录均不发布。截图仅选择已人工查看且不显示账户资料的摘要及行星页；输入截图和完整账户页截图不发布。未发布 cookies、认证值或完整第三方 bundle。源脚本保留公开 URL、SHA256 及必要代码片段。样例出生数据获准保留。脱敏未改变 130 项 Gate.Line、Profile、Type 或日期。

AX 脱敏副本同时清除行尾空格；不改变可见文字或计算值。
