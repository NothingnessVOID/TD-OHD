# UTC 时间尺度与 Swiss 历史模型审计 v3

日期：2026-10-03。基线：`audit/natal-golden-reference` / `35034e7531754dfa0f45eb4e1ac0fc77c1027272`。本轮只做诊断，生产计算与 8787 安装版未修改。既有 [Sharp frame bias 遗漏证据](../root-cause-v2/README.md)继续成立。

**没有找到完整根因。** 所有正式历史 preset 都是 **4/7 + 两负对照正确**。受控组件组合最高 **5/7 + 两负对照正确**，没有一组达到验收要求的 **7/7 + 2/2**。这里只比较 Personality Sun，不能据此宣称完整出生图、Design、Profile 或 Cross 已修复。

## 1. UTC → UT1 / TT

直接使用冻结的九例 `birthUtc`，不重复地点或时区调查。TIME-A 沿用 UTC clock 当作 UT1；九例太阳黄经与 v2 raw DE441 **逐 bit 相同**。TIME-B 调用原版 `swe_utc_to_jd()`，再分别用 `swe_calc(TT)` 和 `swe_calc_ut(UT1)`；九例两路太阳黄经的差均为 **0**。依据：[官方时间 API](https://www.astro.com/swisseph/swephprg.htm)、[固定版本转换源码](https://github.com/aloistr/swisseph/blob/175e1fcb3108bcd5c0d146c803f51dcf23508012/swedate.c#L375)。

| Case | Swiss 推导 UT1−UTC 秒 | naive | proper | Jovian | proper 距期望爻起点 mas |
|---|---:|---|---|---|---:|
| G1995-feb | +0.274913013 | 55.4 | 55.4 | 55.4 | +11.659458 |
| G1995-jun | −0.008086860 | 15.3 | 15.3 | 15.3 | +3.179425 |
| G2005-jul20 | −0.576943159 | 56.3 | 56.2 | 56.3 | −19.314923 |
| G2015-tight | −0.488631427 | 41.4 | 41.4 | 41.5 | −25.339060 |
| G2015-feb | −0.499212742 | 13.2 | 13.2 | 13.3 | −25.619444 |
| G2025-tight | +0.189216435 | 60.4 | 60.5 | 60.5 | +3.939566 |
| G2025-mar | +0.203821063 | 36.3 | 36.4 | 36.4 | +7.545128 |
| G1985-tight（负对照） | −0.196699798 | 41.4 | 41.4 | 41.4 | 当前爻内 |
| G2005-jul11（负对照） | −0.572678447 | 53.4 | 53.4 | 53.4 | 当前爻内 |

结果从 **3/7 → 4/7**：剩余四例中的两例 2025 案例跨界，2015 两例仍不符，同时新增 G2005-jul20 不符。两个负对照保持正确。因此时间尺度能解释部分变化，无法解释全部 Golden 差异。

TT−UTC 对应冻结源码的闰秒表：1985 为 54.184 秒，1995 为 61.184 秒，2005 为 64.184 秒，2015 为 67.184 秒，2025 为 69.184 秒，JD double 量化差单列保留。没有触发转换函数的“闰秒表过旧则当作 UT1”分支，也未人为提供 DUT1。

注意这里的 UT1 是 **Swiss 用自身 ΔT 推导的 UT1**。它与每日实测 IERS DUT1 不完全相同，2025 两例差约 0.145 / 0.161 秒。已保存 [IERS/USNO 日期覆盖和原始行](eop-provenance.json)，这些数值仅用于独立核对，没有覆盖计算输入。太阳正式路径以该 UTC 对应的 TT 为准。

完整 JD、黄经、signed mas、局部等效秒数及 flags：[time-scale-results.json](time-scale-results.json)。等效秒数是黄经差除以当时太阳速度的线性估计，不能当作实测 Jovian 切换时刻。

## 2. 官方历史 preset

使用固定、未修改的 Swiss C **2.10.03** 与同一份 raw DE441。每组单独进程。preset 字符串自动解析自固定 [swephlib.c](https://github.com/aloistr/swisseph/blob/175e1fcb3108bcd5c0d146c803f51dcf23508012/swephlib.c#L4174)，符号自动解析自 `swephexp.h`。每组实际调用 `swe_get_astro_models()`，保存描述与 `-amod` selectors。

| Preset | ΔT selector | Precession long | Precession short | Nutation | Bias | proper 对齐 /7 | controls /2 |
|---|---|---|---|---|---|---:|---:|
| SE1.00 | Stephenson/Morrison 1984 | Williams 1994 / ε Laskar | IAU 1976 | IAU 1980 | none | 4 | 2 |
| SE1.64 | Stephenson 1997 | Williams 1994 / ε Laskar | IAU 1976 | IAU 1980 | none | 4 | 2 |
| SE1.70 | Stephenson 1997 | IAU 2006 | IAU 2006 | IAU 2000B | IAU 2000 | 4 | 2 |
| SE1.72 | Morrison/Stephenson 2004 | IAU 2006 | IAU 2006 | IAU 2000B | IAU 2000 | 4 | 2 |
| SE1.77 | Espenak/Meeus 2006 | IAU 2006 | IAU 2006 | IAU 2000B | IAU 2000 | 4 | 2 |
| SE1.78 | Espenak/Meeus 2006 | Vondrák 2011 | Vondrák 2011 | IAU 2000B | IAU 2000 | 4 | 2 |
| SE1.80 | Espenak/Meeus 2006 | Vondrák 2011 | Vondrák 2011 | IAU 2000B | IAU 2006 | 4 | 2 |
| SE2.00 | Espenak/Meeus 2006 | Vondrák 2011 | Vondrák 2011 | IAU 2000B | IAU 2006 | 4 | 2 |
| SE2.06 | Stephenson/Morrison/Hohenkerk 2016 | Vondrák 2011 | Vondrák 2011 | IAU 2000B | IAU 2006 | 4 | 2 |
| 当前默认 2.10.03 | 同 SE2.06 | Vondrák 2011 | Vondrák 2011 | IAU 2000B | IAU 2006 | 4 | 2 |

**没有唯一最佳历史 preset，全部并列 4/7。** SE1.00 / SE1.64 对齐的是 2015、2025 四例；其余 preset 与当前模型对齐的是 1995、2025 四例。naive 路径下 SE1.00 / SE1.64 虽为 5/7，却破坏 G2005-jul11 负对照，应排除。

表中的 ΔT 是历史模型 selector，不能理解成恢复了相应年代的整张 ΔT 表。固定 2.10.03 对这些 1985–2025 日期继续共用现代 `dt[]` 插值；切换 ΔT selector 对本批太阳黄经没有作用。这也说明 preset 模拟与真正旧版内核有明确区别。

零 selector 表示当前默认，已在 [legacy-presets.json](legacy-presets.json) 展开为有效符号。setter 还会改变 tidal acceleration（完整 getter 描述已保留）；本批现代日期不产生相应 ΔT 差。[legacy-results.json](legacy-results.json) 保存每组原始数值。

## 3. 哪个模型变化关键

相邻 preset 中，只有 **SE1.64 → SE1.70** 改变这批 proper Gate.Line：1995 两例由不符变为对齐，2015 两例由对齐变为不符。最大太阳位移约 **64.714 mas**。1.77 → 1.78 的最大位移约 0.01845 mas，1.78 → 1.80 约 0.0001715 mas，都没有跨爻；其余相邻变化对此批太阳黄经为零。

对并列候选 SE1.64 做九组组件拆解：[component-matrix.json](component-matrix.json)。

- **岁差是主要贡献**：向 SE1.64 的岁差模型切换，使 2015 太阳增加约 45.40 / 45.47 mas，两例跨界；却使 1995 两例分别减少约 14.58 / 13.59 mas，失去对齐。
- 旧章动对七例的位移约 −6.16 至 +2.87 mas；关闭 bias 约减少 6.786 mas。这些分量会改变贴边案例，不能只看命中数量。
- **旧岁差 + 旧章动、保留当前 bias** 的受控混合组达到 **5/7 + 2/2**，但仍失配两个 1995 案例。这组并非完整官方历史 preset，不能当作 Jovian 的实现或生产修复依据。
- ΔT-only 位移为零。完整 SE1.64 与其岁差、章动、bias 三项组合相同，为 4/7。

因此无法通过选择某次历史模型变化完整复现 Jovian。组件输出保留了相对默认模型的 signed mas，未拟合 offset、epsilon、容差或出生时间。

## 4. JPL Horizons

- `SEFLG_JPLHOR_APPROX`：实际返回 **524545**，对齐 **0/7 + 2/2**。
- `SEFLG_JPLHOR`：使用 IERS **14 C04 IAU1980** 与 USNO `finals.all`，实际返回 **393473**，即 JPL + speed + JPLHOR + 自动添加的 ICRS；没有 APPROX bit，也没有警告。对齐 **0/7 + 2/2**。
- IERS C04 连续覆盖 **1962-01-01 至 2026-01-05**，九例全部在覆盖内。完整下载只放在仓库外，保存 URL、bytes、SHA256、格式、日期范围与出生日期前后原始行。官方来源：[IERS IAU1980](https://data.iers.org/products/eop/long-term/c04_14/iau1980/)、[USNO finals](https://maia.usno.navy.mil/ser7/finals.all)。
- 另做缺 EOP 的防误标实验：请求完整模式实际返回 **524545** 并提示退化。该组明确记为 guard，没有算作完整模式成功。

这是 Swiss 的 Horizons compatibility 模式测试，没有访问实时 Horizons 计算接口，也不代表 Jovian 使用相同 EOP 数据。完整证据：[jpl-horizons-results.json](jpl-horizons-results.json)。

## 5. 未触发的条件实验

**DE405 / DE406 没有下载或测试**。所有完整官方 preset 均未优于当前 proper 模型，也未接近 7/7；按本轮条件停止盲扫旧 kernel。5/7 来自组件混合组，不足以证明某个真实历史配置接近 Jovian。

**真正旧版 Swiss 源码没有进入验证**，原因同上。不把 2.10.03 的 preset 模拟称为旧版本实测，也没有生成旧 kernel 或旧源码的假结果文件。

## 6. 最终判断与验证

证据支持：既有 **Sharp-only frame bias 缺陷**成立；**时间尺度与历史坐标模型会分别改变部分边界结果**。但剩余整体根因仍未知。不能断言 Jovian 一定使用旧 Swiss、自定义算法或某个 JPL kernel。

更准确的结论是：**本轮实际测试的公开 Swiss/JPL 配置无法同时复现九例 Jovian Personality Sun 输出**。没有满足 7/7 + 2/2，不建议据此改生产计算。

- 固定 Golden JSON、Mandala helper 与 C source 哈希核对通过。
- 23 个独立诊断组（含一组缺 EOP guard），九例每组保存 naive、proper UT1、TT 三路，共 621 次太阳计算；计算 ephemeris source 全为 raw JPL DE441，无 Swiss/Moshier fallback。
- v2 TIME-A 复现与各组 TT / UT1 精度核对通过。没有把测试用 double 精度界限传入 Gate/Line 映射。
- 8787 的八个计算/星历文件，磁盘与实际 HTTP SHA256 均与冻结基线一致；生产目录 diff 为空。
- 本轮验证是审计 harness / 数据一致性 / 证据完整性测试，**不代表七个生产 Golden mismatch 已修复**。未改应用代码，因此没有重新运行应用 npm / E2E。

[comparison.json](comparison.json) · [完整比较表](comparison-table.md) · [环境与哈希](environment.json) · [来源](sources.json) · [校验结果](validation.json) · [复现步骤](REPRODUCING.md)
