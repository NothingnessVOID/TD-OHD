# myBodyGraph 与 VOID：极端 Line 边界独立对照

2026-10-03。只追加审计资料，不修改 TD-OHD 计算、生产 UI、8787 安装或年度缓存。

本轮先独立采集实际页面值、封存证据，再读取 Jovian 与 Modern Swiss 的既有结果。以下五组输入都是获准公开的合成样例，不是账户持有人的出生资料。

## 输入

地点均为 London, United Kingdom，IANA 时区 Europe/London。

| Case | 当地出生时间 | 当日 UTC offset | 出生 UTC | 既有 Golden ID |
|---|---|---|---|---|
| A | 2005-07-20 22:40 | +01:00 | 2005-07-20T21:40:00Z | G2005-jul20 |
| B | 2015-01-26 01:20 | +00:00 | 2015-01-26T01:20:00Z | G2015-tight |
| C | 2015-02-04 06:56 | +00:00 | 2015-02-04T06:56:00Z | G2015-feb |
| D | 2025-01-19 22:57 | +00:00 | 2025-01-19T22:57:00Z | G2025-tight |
| E | 1985-01-25 18:34 | +00:00 | 1985-01-25T18:34:00Z | G1985-tight |

VOID 没有城市输入；使用以上当地日期、时间及手动数字 offset。myBodyGraph 使用 London 城市建议项，并在页面核对转换后的出生 UTC。

## 核心结果

| Case | myBodyGraph / Jovian 人格 Sun · Earth | VOID 人格 Sun · Earth | Modern Swiss 人格 Sun · Earth | Design Sun · Earth（四方均相同） | Profile：myBodyGraph / VOID / Modern |
|---|---|---|---|---|---|
| A | 56.3 · 60.3 | 56.2 · 60.2 | 56.2 · 60.2 | 3.5 · 50.5 | 3/5 / 2/5 / 2/5 |
| B | 41.5 · 31.5 | 41.4 · 31.4 | 41.4 · 31.4 | 44.1 · 24.1 | 5/1 / 4/1 / 4/1 |
| C | 13.3 · 7.3 | 13.2 · 7.2 | 13.2 · 7.2 | 1.5 · 2.5 | 3/5 / 2/5 / 2/5 |
| D | 60.5 · 56.5 | 60.4 · 56.4 | 60.5 · 56.5 | 28.1 · 27.1 | 5/1 / 4/1 / 5/1 |
| E | 41.4 · 31.4 | 41.4 · 31.4 | 41.4 · 31.4 | 44.1 · 24.1 | 4/1 / 4/1 / 4/1 |

* myBodyGraph：五张实际图表的完整 130 项 Gate.Line、Profile 及 Cross 四闸门组合均与既有 Jovian 证据一致。
* VOID：Codex 内置浏览器每例重复三次，15 次结果稳定。A/B/C/E 每例完整 26 项与 Modern Swiss 一致；D 人格 Sun/Earth 不同。
* C 的 06:56 UTC+0 与 14:56 UTC+8 在 VOID 得到相同全部激活及摘要。
* Genetic Matrix：没有本批完全相同 UTC 的可引用独立证据，未在本轮采集，标记 NOT INDEPENDENTLY COMPARED。

Jovian 是读取既有网页采集证据，并非本轮再次操作。Modern Swiss 对照来自已修复 Sharp 分支的独立 Swiss C 2.10.03 parity 记录，**不能代表未更新的 8787 安装版**。

## 阅读入口

* [合并样例 JSON](golden-cases.json)：五例输入、myBodyGraph/VOID 完整 26 激活及已有参考。
* [myBodyGraph 报告](mybodygraph/README.md)、[盲采结果](mybodygraph/blind-results.json)、[逐例比较](mybodygraph/comparison.json)。
* [myBodyGraph 公开 JS 证据](mybodygraph/public-js/README.md)：客户端有 longitude/UTC/Design timestamp 字段，但未取得实际 API body、精确黄经或引擎版本。
* [VOID 报告](void/README.md)、[完整结果](void/results.json)、[关键源码片段](void/code-evidence.json)。
* [公开文件哈希](evidence-manifest.json)。

## 参考版本

* Jovian：本审计分支 `docs/golden-reference/golden-cases.json`，文件哈希记录在比较 JSON 中。
* [Modern Swiss / 修复后 Sharp 记录](https://github.com/NothingnessVOID/TD-OHD/blob/fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9/docs/moon-apparent-parity/results.json)：只通过不可变 commit 链接引用，不将修复代码合入本审计分支。

## 隐私与证据边界

此次发布为脱敏副本。账户显示名、账户内图表/分享/个人图表标识、浏览器 tab 标识、本机绝对路径、原始资源跟踪记录不发布。输入截图和包含账户页头的完整截图留在本地；仅发布已人工检查的安全截图。没有发布认证值、cookie、个人资料、完整第三方 bundle 或星历数组。

脱敏不改变样例出生时间、地点、Gate.Line、Profile、Type 和显示日期。盲采封存哈希保留；公开副本另有哈希，不能混称为逐字节未改的原始数据。截图无图像修改，选用不显示账户信息的原始截图。

myBodyGraph 免费界面未显示 Color/Tone/Base；Design 日期标签未说明时区。API 原始响应未取得。未披露的信息不由品牌或一致性反推。

VOID 使用可核对哈希的 Moshier JS 星历与部分预计算表；表的生成引擎版本未知。时间尺度及分数 offset 源码问题仅记录，没有修改。VOID 可以独立交叉观察，不能作为最终 Golden Reference。

## 复核

从仓库根目录执行：

```bash
python3 docs/golden-reference/platform-boundaries/verify-evidence.py
```

脚本只读本地发布资料，验证 130 项完整性、已有对照、VOID 三次稳定性、时区等价、公开文件哈希、脱敏模式及 JPEG 元数据；不向网站发请求，也不重新计算任何出生图。隐私检查另有人工截图检查，正则不能替代人工审阅。
