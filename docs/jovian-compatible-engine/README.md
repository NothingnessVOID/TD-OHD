# Jovian-Compatible Engine V1

## 先说结果

1. **第二引擎已经做出**：独立的本地原生原型，不靠案例查表。
2. 输入普通当地出生日期、时间和时区，或 UTC，即可计算完整出生图：Personality / Design 各 13 项经度与 Gate、Line、Color、Tone、Base，以及 Type、Strategy、Authority、Profile、Definition、Cross、Channels、Centers。
3. 原始 C2 已复现：321 个不同测试 UTC、8,346 项经度对照，最大残差为 **0°**；Design TT 根最大残差为 **0 天**。
4. 保存的 Jovian 官方证据按 UTC 去重后为 **97 图，2,522 / 2,522 Gate.Line** 一致；另有 myBodyGraph **33 图，858 / 858** 全通过（这些 UTC 与前述集合重叠，不重复充作新样本）。这里证明的是保存的观察结果，不能证明 Jovian 内部源码。
5. Personality：**1,261 / 1,261**，Profile：**97 / 97**。
6. Design：**1,261 / 1,261**。没有拿官方 Design 日期填入算法。
7. 两套判别案例共 56 图全通过；其中能区分 C1 / C2 的 13 图全部返回 C2。±5、±1、0 秒共 280 个边界样本也全部复现 C2。
8. **Modern 未改变**：329 个原有源码、资源和构建文件与基线字节一致，签名仍为 `59b90e629033cc7faf95`。现有单元、语言、时间线、浏览器回归通过。
9. 统一输入和结果接口已可用，可为未来网站切换提供基础；**当前不是可直接嵌入浏览器的引擎**。本轮只有独立 CLI / Node 原型，未添加 UI 或生产路由。
10. 正式产品尚需解决历史 Swiss / 压缩 DE406 的发布许可、浏览器或服务端封装、额外年份的固定历表和交互性能。本轮没有部署，也没有改变 8787。

## 真实实现

兼容后端固定为 **Swiss Ephemeris 1.76.00 + compressed DE406 + historical defaults + UTC numeric JD passed to `swe_calc_ut`**。历史源码未修改。使用返回 flag 和运行时 DE 编号检查真实文件路径，禁止静默 Moshier 回退。

兼容语义有意保留 `utc-as-ut1`，不能称为精确 UTC→UT1。Modern 仍保留正确 UTC/TT/UT1 处理。Design 使用历史后端解出生太阳向前回退 88° 的 TT 根，随后用该 TT 计算 Design 行星，不是出生前 88 天。

共享的 SharpAstrology.HumanDesign 1.2.0 执行 `ActivationOf()` 和 `HumanDesignChart`，旧 `TransitCore.SerializeBirth` 与 JS `adaptSharpChart` 继续供两边使用。没有复制另一套 Gate 顺序、Type、Authority、Channels 或 Centers 算法。历史路径在结果 metadata 中覆盖 Modern 的历表标签，并使用独立、包含共享源码哈希的签名。

Design 的 `raw.designUtc` 是供旧 contract 使用的历史逆算数值时钟标签，**不主张它是准确的民用 UTC**。精确计算时间是 `astronomy.designTtJd`；`designModelUt1Jd` 和 `designClockMeaning` 保留其真实语义。DateTime 标签不会重新采样或舍入天文经度。

## 使用

需要 Node 20+、Python 3.12+、C 编译器和 .NET 10。历史依赖放在仓库之外。

```sh
python3 jovian-engine/prepare_native.py --runtime /tmp/td-ohd-jovian-compatible-v1
export JOVIAN_RUNTIME=/tmp/td-ohd-jovian-compatible-v1
# 如 dotnet 不在 PATH，设置 DOTNET 为其完整路径。
npm ci
npm run build:engine

npm run research:birth-engine -- --engine jovian-compatible --utc 2005-07-20T21:40:00Z
npm run research:birth-engine -- --engine both --utc 2005-07-20T21:40:00Z
npm run research:birth-engine -- --engine jovian-compatible --input '{"date":"2005-07-20","time":"22:40","timeZone":"Europe/London"}'
```

`BirthEnginePrototype.calculate(input, { engine })` 返回统一的 `{ input, raw, chart, engineIdentity }`，兼容引擎另带 `astronomy`。`both` 返回两份独立结果。省略 engine 时使用 Modern。接口没有公共缓存，因此不会读错另一引擎的缓存；将来加入缓存必须使用完整 engineSignature 分区。

验证原始 C2 需要额外取得只读研究分支与其外部运行库。它们只用于 oracle，不是原型计算的依赖：

```sh
git clone --branch research/jovian-design-discriminator-suite-v1 --single-branch https://github.com/NothingnessVOID/TD-OHD.git /tmp/td-ohd-research
# 将研究 checkout 保持在 78e3b9e59c9c1cbbde80a51b1e8320b6952e8be3。
python3 /tmp/td-ohd-research/docs/jovian-discriminator-suite/scripts/reproduce.py --runtime /tmp/ra-era-research --output /tmp/td-ohd-reference --prepare
export JOVIAN_RESEARCH_ROOT=/tmp/td-ohd-research
export JOVIAN_REFERENCE_RUNTIME=/tmp/ra-era-research
npm run test:jovian-compatible
```

本轮固定历表覆盖 1800–2399 年，Design 也必须在覆盖范围内；缺文件直接报错。不自动下载未知替代历表。

## 证据与限度

| 检查 | 结果 | 文件 |
|---|---:|---|
| 官方 Gate.Line | 2,522 / 2,522，97 完整图 | official-regression.json |
| 官方 Profile | Jovian 97 / 97；myBodyGraph 33 / 33 | official-regression.json |
| 官方 Type | 68 / 68 | official-regression.json |
| Authority / Definition | 各 40 / 40，按已记录语义比较 | official-regression.json |
| Cross 结构 | 68 / 68，角度、名称、四 Gate | official-regression.json |
| 原始 C2 数值 / 五层 activation | 321 UTC 全通过 | c2-parity.json |
| 秒级边界 | 56 × 5 = 280 样本 | boundary-regression.json |
| 负对照 | 49 图；13 区分 C1，47 区分 Modern | negative-controls.json |
| 同输入共享 mechanics | 97 图全通过 | mechanics-regression.json |
| 时区 / 地点 / DST | 15 种表达及 gap 拒绝通过 | time-location-regression.json |
| Modern 回归 | 全部相关测试通过，3 个既有在线测试跳过 | modern-regression.json |

官方材料未保存精确经度、Color/Tone/Base 或所有 Channels/Centers。这些字段通过独立 C2 数值与共享 mechanics 验证，**不能标为官方已核对**。

显示标签不全部相同：Cross 字面一致为 23/68，Strategy 为 25/40，Authority 为 39/40。差异包括 Sharp 的 Cross 后缀编号、英美拼写、冠词、Lunar / Lunar Cycle，以及 MG 现有 “then Inform” 和 Projector “Recognition and Invitation” 文案。Cross 四 Gate 与角度也参与核对，没有只删除编号就宣称结构正确。每例的实际和官方文字保留在 `labelDifferences`，本轮未改现有文案。Strategy-family 一致不代表字面或知识正文已经审核。

原型并不读取账号、cookie、token，也不使用个人资料。官方 fixtures 只保留合成案例和已授权样例的计算字段与来源哈希。

## 文件职责

- `jovian-engine/native_backend.py`：真实 C2 天文和 88° root。
- `prepare_native.py` / `native-assets.json`：外部固定下载、hash、编译和构建身份。
- `native_state.c`：只读实际 DE 编号检测，不修改历史算法。
- `jovian-engine/mechanics/`：共享 Sharp 映射与 mechanics 的 JSON-lines host。
- `scripts/lib/birth-engine-prototype.mjs`：输入解析、引擎选择、统一输出和独立签名。
- `scripts/birth-engine-prototype.mjs`：CLI。
- `scripts/jovian-compatible-validation.mjs` / `jovian-reference-worker.py`：独立 C2 oracle 和已保存官方证据回归。
- `tests/jovian-compatible-engine.test.js`：时区、默认路径及生产隔离检查。

许可见 [license-audit.md](license-audit.md)，调用边界见 [architecture.md](architecture.md)。没有把历史源码、NuGet 包、原生库、完整星历或临时构建目录提交到 Git。
