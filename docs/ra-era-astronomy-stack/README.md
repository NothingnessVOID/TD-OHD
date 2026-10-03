# Ra-era astronomy stack 研究报告

2026-10-03。分支 `research/ra-era-astronomy-stack`，严格从审计提交 `f5e2a80cb85adcbf18b4d7b763429178881aa5bf` 开始。

## 结论先读

**找到了能够自然输出官方已采集 Gate.Line 模式的历史原生库调用组合，但没有证明它就是 Jovian / myBodyGraph 的内部实现。**

- **CONFIRMED**：实际构建的 Swiss **1.76.00 / 1.77.00 + DE406**，保持原默认模型，将出生 UTC 的数值 JD 直接传给原生 **UT1 接口 `swe_calc_ut()`**，A–E 人格太阳 **5/5**、九例全部激活 **234/234**、扩展 45 条记录全部激活 **1,170/1,170** 一致。45 条含重复核验，只有 **40 个唯一 UTC**，不是 45 个独立出生时刻。
- **CONFIRMED**：相同真实历史库和 DE406，在正确 **UTC → TT** 输入下，A–E 仍是 **2/5**，九例全 26 项是 **6/9**。
- **LIKELY / 待辨识候选**：旧 ΔT 模型与“把 UTC 当 UT1”的调用约定，比单独改变 DE 数据或现代/旧模型更能解释这批结果。这里的 LIKELY 指值得优先检验的候选，不代表已确认官方代码。
- **UNKNOWN**：Jovian / myBodyGraph 是否使用 Swiss、哪一版 ΔT、是否把 UTC 当 UT1、具体 DE 版本，以及官方精确黄经。只有离散 Gate.Line 相同，不能反推出唯一算法。

正确 UTC 转换下，**尚未找到未经改造的历史默认栈自然复现 5-case 模式**。输入约定必须和库版本一起阅读，不能把“历史 Swiss + DE406”单独说成 5/5。

## 1. 实际获取和构建的历史环境

| 项目 | Swiss 1.76.00 | Swiss 1.77.00 |
|---|---|---|
| 实际来源 | Debian archive，Maitreya 7.0.7 original tarball 内嵌 C 源码 | Debian archive，libswe 1.77.00.0005 original tarball 内嵌 Astrodienst C 源码 |
| 版本确认 | `sweph.h:66` 的 `SE_VERSION` 及原生 `swe_version()` | `sweph.h` 的 `SE_VERSION` 及原生 `swe_version()` |
| 默认岁差 | `PREC_IAU_2003=TRUE`，源码称 P03 | 同左 |
| 默认章动 | IAU 2000B；IAU 1980/2000A 均关闭 | 同左 |
| frame bias | DE ≥403 且未请求 ICRS 时执行 ICRS → J2000 | 同左 |
| 闰秒表 | 内置最后一项 2008-12-31；未提供外部更新 | 同左 |
| ΔT 表终年 | 2014，包含当年预测值 | 2017，包含预测值 |
| 运行时 tidal acceleration | −25.7376 | −25.826 |
| 节点 | `SE_TRUE_NODE=11`，原生月球密切轨道要素路径 | 同左 |
| 标准位置输出 | apparent、geocentric、tropical、ecliptic/equinox of date | 同左 |
| flags | Swiss 2 + speed 256 = 258 | 同左；直接 JPL 对照为 1 +256 =257 |

这些是**实际旧源码及编译结果**，没有用 Modern Swiss 的 old-model flag 冒充旧版本。源码哈希、库文件哈希和编译器见 [build-manifest](results/build-manifest.json)，下载 URL、大小、SHA-256 见 [acquisition-manifest](acquisition-manifest.json)。历史源码来自归档镜像，不冒称为已验签的 Astrodienst 原始发行包；DSC 公布的 SHA-256 已核对，PGP 签名未独立验证。

DE406 的 `sepl_18.se1` / `semo_18.se1` 来自固定提交的历史镜像。既解析文件中的 DE 标识，也通过只读原生探针确认实际载入的 planet/moon DE number 均为 **406**。文件名不作为版本证明。直接 JPL 文件来自 NASA 官方 Linux DE406 目录，实际运行报告 DE406，返回 flags=257，文件约190 MiB，不纳入仓库。

**未完成的覆盖**：未取得可验证、可构建的 1.70 原始发行源码，因此没有 1.70 数值行。官方 Git 标签 `v1.76.02` / `v1.77` 的实际树仅有1998年代根源码，缺失所需版本宏与相应模型，已排除；不能只依标签名认版本。1.77 另与2012年的独立归档交叉核对，八个关键文件一致，`swemplan.c` 不同；本研究禁止 Moshier fallback，未走该文件的星历路径。证据和未取得资料见 [SOURCES](SOURCES.md)。

## 2. 输入、时间及映射方法

出生地、标准当地时间 → UTC 的已保存 Golden 输入保持不变。本轮直接使用其 UTC，没有真太阳时修正，没有改时区、经纬度、Mandala 或 Line 边界。

三种时间约定分别测试：

1. **`tt`：正确民用 UTC → TT**。独立完整闰秒表，`TT = UTC + (TAI−UTC) + 32.184s`，送入原生 `swe_calc()`。A 为64.184秒，B/C67.184秒，D69.184秒，E54.184秒。
2. **`archived-utc`：旧 `swe_utc_to_jd()` 原样运行**。保留内置旧闰秒表及 ΔT。源码在 ΔT−(TAI−UTC)−32.184 ≥1秒时回退，把输入作为 UT1；因此2015/2025与2005表现不同。这是旧 API 的真实行为，不代表转换正确。
3. **`utc-as-ut1`：UTC 数值 JD 直接作为 UT1 参数**。`TT_legacy = JD_UTC + ΔT_old(JD_UTC)`，每例另调用真正的 `swe_calc_ut()` 核对数值完全一致。此约定**将两种时间尺度混用**，只是复现旧调用方式的实验，不是推荐的标准 UTC 转换。

`HISTORICAL STACK` 表示原生历史库、当时可用数据和未改默认模型；**不保证调用方的时间输入物理正确**。旧库配2014后的DE431或2026的DE441列为 `ARTIFICIAL EXPERIMENT`，不称作2010年真实组合。

UT1 字段是由各库 ΔT 模型反解的值，不是 IERS 实测 UT1。旧代码使用其原生 ET/TT 参数约定，没有额外添加 TT↔TDB 修正。Design 在同一栈的 TT 坐标中根求解太阳回退精确88°。`designUtcFromTt` 使用完整闰秒表把根转成民用 UTC；在 `utc-as-ut1` 方案下，它不等于旧调用方可能直接显示的“UT 日期”，也不是已经观测到的官方 Design timestamp。

Earth 按 Human Design 的太阳反向180°记录；South Node 按 North Node 反向180°记录，不是另行计算地心“Earth”天体。每侧13项包含原生 True Node。

映射直接复用基线冻结的 [frozen_mapping.py](../golden-reference/root-cause-v2/scripts/frozen_mapping.py)，3.875° / 5.625° / 0.9375° 原封不动，floor，无 epsilon，无针对案例的特判。

## 3. A–E 和版本矩阵

A–E 依次对应 `G2005-jul20`、`G2015-tight`、`G2015-feb`、`G2025-tight`、`G1985-tight`。官方目标依次为 **56.3 / 41.5 / 13.3 / 60.5 / 41.4**。A–E 的 myBodyGraph 全130项也与已保存 Jovian 证据相同，证据在 [平台对照](../golden-reference/platform-boundaries/README.md)。本轮没有重新登录采集。

“九例”列要求每一例 **26项全部相同**，不是只比较太阳。

| Stack / 时间模式 | 分类 | A | B | C | D | E | 五例太阳 | 九例全26项 |
|---|---|---|---|---|---|---|---|---|
| 176-de406-archived-utc | HISTORICAL STACK | 56.2 | 41.5 | 13.3 | 60.5 | 41.4 | 4/5 | 8/9 |
| 176-de406-tt | HISTORICAL STACK | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 176-de406-utc-as-ut1 | HISTORICAL STACK | 56.3 | 41.5 | 13.3 | 60.5 | 41.4 | 5/5 | 9/9 |
| 177-de406-archived-utc | HISTORICAL STACK | 56.2 | 41.5 | 13.3 | 60.5 | 41.4 | 4/5 | 8/9 |
| 177-de406-tt | HISTORICAL STACK | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 177-de406-utc-as-ut1 | HISTORICAL STACK | 56.3 | 41.5 | 13.3 | 60.5 | 41.4 | 5/5 | 9/9 |
| 177-de431-tt | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 177-de441-tt | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 177-jpl406-tt | HISTORICAL STACK | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 177-jpl406-utc-as-ut1 | HISTORICAL STACK | 56.3 | 41.5 | 13.3 | 60.5 | 41.4 | 5/5 | 9/9 |
| 210-de406-archived-utc | MODERN REFERENCE | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 210-de406-tt | MODERN REFERENCE | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 210-de406-utc-as-ut1 | MODERN REFERENCE | 56.3 | 41.4 | 13.2 | 60.4 | 41.4 | 2/5 | 6/9 |
| 210-de431-tt | MODERN REFERENCE | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 210-de441-tt | MODERN REFERENCE | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 210-jpl406-tt | MODERN REFERENCE | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| 210-jpl406-utc-as-ut1 | MODERN REFERENCE | 56.3 | 41.4 | 13.2 | 60.4 | 41.4 | 2/5 | 6/9 |
| experiment-j2000 | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.4 | 41.5 | 0/5 | 1/9 |
| experiment-legacy-jpl-style | ARTIFICIAL EXPERIMENT | 56.2 | 41.5 | 13.3 | 60.5 | 41.4 | 4/5 | 6/9 |
| experiment-no-bias | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.4 | 41.4 | 1/5 | 4/9 |
| experiment-no-nutation | ARTIFICIAL EXPERIMENT | 56.3 | 41.4 | 13.2 | 60.4 | 41.5 | 1/5 | 1/9 |
| experiment-nut1980 | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| experiment-nut2000a | ARTIFICIAL EXPERIMENT | 56.2 | 41.4 | 13.2 | 60.5 | 41.4 | 2/5 | 6/9 |
| experiment-pre1976 | ARTIFICIAL EXPERIMENT | 56.2 | 41.5 | 13.3 | 60.5 | 41.4 | 4/5 | 6/9 |
| experiment-pre1976-nut1980 | ARTIFICIAL EXPERIMENT | 56.3 | 41.5 | 13.3 | 60.5 | 41.4 | 5/5 | 7/9 |
| experiment-pre1976-nut1980-jpl406 | ARTIFICIAL EXPERIMENT | 56.3 | 41.5 | 13.3 | 60.5 | 41.4 | 5/5 | 7/9 |
| experiment-true | ARTIFICIAL EXPERIMENT | 56.3 | 41.5 | 13.3 | 60.5 | 41.5 | 4/5 | 6/9 |

扩展 suite：1.76 与1.77的 `DE406 + utc-as-ut1` 各自 **45/45**；现代 `2.10.03 + DE441 + tt` **36/45**。每个差异包含具体 body/side/actual/official，见 [results](results/)；30种组合的完整数值矩阵见 [analysis.json](analysis.json)。

## 4. 最佳候选的黄经与边界距离

以下候选是 **1.77.00 + DE406 + UTC数值传UT1**。列“残差”是与 Modern Swiss C 2.10.03 + 本项目实际 DE441 构建 + 正确 TT 的差值，**绝不是与 Jovian 精确黄经的差值**。官方目前没有公开可采集的精确黄经，所以最后一列必须是 UNKNOWN。

`mas` 为毫角秒；1 arcsec=1000 mas。正边界距离表示刚越过最近的固定 Line boundary，负数表示尚未越过。

| Case | 候选 Sun ° | Modern Sun ° | 候选−Modern mas | 候选−最近边界 mas | 候选−官方黄经 |
|---|---:|---:|---:|---:|---|
| A | 118.25000107934 | 118.24999451525 | +23.630716 | +3.885634 | UNKNOWN |
| B | 305.75000911848 | 305.74999295219 | +58.198624 | +32.826525 | UNKNOWN |
| C | 315.12500907003 | 315.12499278694 | +58.619103 | +32.652097 | UNKNOWN |
| D | 300.12515259004 | 300.12500110886 | +545.332270 | +549.324158 | UNKNOWN |
| E | 305.74999859127 | 305.74999616918 | +8.719535 | -5.071424 | UNKNOWN |

完整结果为 Personality 和 Design 同时保存：`distanceNextDegrees`、`distanceNextArcsec`、`distanceNextMas`（沿黄经增加方向到下一条边界），以及 `signedMinusNearestBoundaryDegrees/Arcsec/Mas`（黄经减最近边界，保留正负）。前者接近刚过边界时会接近一整爻宽，不能误读为当前边界残差。

| Case | UTC input | 正确 TT−UTC 秒 | 候选 TT JD | 候选模型 UT1 JD | ΔT 秒 | 候选TT−正确TT 秒 |
|---|---|---:|---:|---:|---:|---:|
| A | 2005-07-20T21:40:00Z | 64.184 | 2453572.403527373448 | 2453572.402777777985 | 64.765048 | +0.581047 |
| B | 2015-01-26T01:20:00Z | 67.184 | 2457048.556348758750 | 2457048.555555555504 | 68.532760 | +1.348776 |
| C | 2015-02-04T06:56:00Z | 67.184 | 2457057.789682232775 | 2457057.788888888899 | 68.544911 | +1.360926 |
| D | 2025-01-19T22:57:00Z | 69.184 | 2460695.457199283410 | 2460695.456249999814 | 82.018103 | +12.834089 |
| E | 1985-01-25T18:34:00Z | 54.184 | 2446091.274240475614 | 2446091.273611111101 | 54.377094 | +0.193079 |

输入约定引起的 TT 误差由约0.193秒到12.834秒，随年代变化，并不等于给所有人统一加几秒。1.76的2025误差更大，约15.658秒，但这批离散Gate.Line仍相同。选择1.77作为展示候选，是其预测时间误差较小且资料可交叉追溯；**不是官方精确黄经已证明它优于1.76**。

| Case | P Sun | P Earth | 由根转民用 Design UTC | D Sun ° | D Sun | D Earth | Profile |
|---|---|---|---|---:|---|---|---|
| A | 56.3 | 60.3 | 2005-04-20T05:46:03.416648Z | 30.25000107898 | 3.5 | 50.5 | 3/5 |
| B | 41.5 | 31.5 | 2014-10-31T06:20:27.206983Z | 217.75000911853 | 44.1 | 24.1 | 5/1 |
| C | 13.3 | 7.3 | 2014-11-09T14:55:42.229159Z | 227.12500906983 | 1.5 | 2.5 | 3/5 |
| D | 60.5 | 56.5 | 2024-10-25T01:27:03.937467Z | 212.12515258980 | 28.1 | 27.1 | 5/1 |
| E | 41.4 | 31.4 | 1984-10-31T00:04:08.039733Z | 217.74999859166 | 44.1 | 24.1 | 4/1 |

完整九例、45条 suite 的两侧13天体黄经、速度、Gate.Line、TT、UT1、solar arc、Profile保存在逐栈 JSON 中。官方未披露 Design 精确 timestamp，不能宣称此表时间与官方一致。这里只确认对应26项离散激活一致。

## 5. 各项贡献：固定 TT、一次改变一个因素

每列为 Sun 黄经差，单位mas。下列模型开关是 **ARTIFICIAL EXPERIMENT**，用于分解来源，不是“Ra algorithm”。

| 对照：左−右 | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|
| DE406_minus_DE441_same_modern_code_TT | +0.528522 | +1.047127 | +1.121460 | +1.113746 | +0.534971 |
| DE431_minus_DE441_same_modern_code_TT | +0.254859 | +0.345011 | +0.390193 | +0.343799 | -0.000008 |
| Historical_code_minus_modern_same_DE406_TT | +0.001331 | +0.007255 | +0.007216 | +0.018074 | +0.003690 |
| Direct_JPL406_minus_compressed406_same_historical_code_TT | +0.641678 | -0.089525 | +0.143921 | -0.112705 | +0.645647 |
| UTC_numeric_as_UT1_minus_correct_TT_177 | +23.100863 | +57.144242 | +57.490427 | +544.200451 | +8.180873 |
| IAU1976_minus_P03_ARTIFICIAL | +16.690184 | +45.388310 | +45.464673 | +75.606378 | -44.722227 |
| IAU1980_minus_IAU2000B_ARTIFICIAL | +2.870425 | +0.898291 | +1.066899 | -4.106060 | +1.871290 |
| IAU2000A_minus_IAU2000B_ARTIFICIAL | -0.532007 | -0.053902 | +0.316935 | -0.247254 | +0.603815 |
| Bias_omitted_minus_enabled_ARTIFICIAL | -6.785639 | -6.785990 | -6.785958 | -6.786458 | -6.784552 |

- **DE406本身**：同一现代源码及TT下，比DE441高约0.529–1.121mas，不能单独让A/B/C换爻；DE431与DE441仅约0–0.390mas。
- **实际旧/新Swiss源码**：固定DE406和TT，五例Sun差均小于0.019mas。
- **直接JPL406 vs压缩Swiss406**：同旧代码、TT差约−0.113至+0.646mas；直接DE406配正确TT仍2/5，配旧UT输入约定则5/5、九例9/9。直接读取DE406不是完整复原JPL/Horizons的apparent pipeline。
- **岁差**：仅改P03→1976，影响约−44.722至+75.606mas，五例4/5。
- **章动**：仅改2000B→1980，约−4.106至+2.870mas，五例2/5。
- **frame bias**：省去真实矢量旋转，影响约−6.786mas，五例1/5。只跳过旋转，没有添加或减去longitude常数。
- **岁差1976+章动1980，保留bias**：五例也5/5，但九例仅7/9；`G1995-feb` 的Sun为55.3而官方55.4，`G1995-jun`为15.2而官方15.3，Earth同时不同。直接JPL406版本同样7/9。这证明五例相同无法唯一识别栈。
- true / J2000 / 无章动实验分别4/5、0/5、1/5，没有找到更完整候选。

## 6. 固定偏移再次验证

仅做数学可行性检查，没有拟合、采用或应用任何offset。Modern结果要让C进入官方目标爻，需要正黄经增量至少 **25.967006mas**；而E仍保持41.4要求小于 **13.790959mas**，区间不相交。

因此，一项统一加到所有 Sun 黄经上的固定offset无法同时满足这五例。该检查只针对本套输入和固定映射，不能排除更复杂的、尚未知的流程；它也不是给offset寻找替代参数的理由。详见 `constantOffsetFeasibility`。

## 7. 第二路线：JPL / Ra-era apparent pipeline

**CONFIRMED（公开声明层）**：Jovian当前MMI产品页明确表示使用JPL planetary database；没有披露DE406/DE431/DE441、Swiss调用、时间尺度或旧版实现。[MMI公开说明](https://jovianarchive.com/products/maia-mechanics-imaging-mmi)

**CONFIRMED**：JPL DE405/406原始1998年论文说明DE405参考ICRF，DE406采用较低阶插值并省略nutation/libration数据。因此DE406文件本身不会确定视黄经的全部岁差、章动与坐标转换政策。[JPL原始memo，§VII](https://ssd.jpl.nasa.gov/ftp/eph/planets/ioms/de405.iom.pdf)

**CONFIRMED（历史文档）**：Swiss2006技术手册讨论其1.70与当年Horizons apparent位置不同，说明当时Horizons采用1976/1980，Swiss1.70已加入P03/2000B及frame bias。这是2006年的具体说明，不能直接推广成Jovian2010/2011的实现证明。[当时Swiss手册，第7–8页](https://www.astro.com/swisseph/swisseph_acrobat.pdf)

**CONFIRMED（当前文档）**：当前Horizons说明使用1976/1980，并结合EOP celestial pole correction和其TDB时间处理。只切换两个模型宏并不等于完整Horizons pipeline，也没有证明当年Jovian采用相同EOP数据。[Horizons模型及时间说明](https://ssd.jpl.nasa.gov/horizons/manual.html)

**UNKNOWN**：本轮没有取得可验证的2010/2011 Horizons运行程序、该时刻历史EOP文件及官方调用政策，也没有构建经身份验证的完整Ra-era JPL apparent实现。2009年SOFA发布存在的公开记录已找到，但旧版源码未获取，未假称已运行。

因此本轮第二路线完成了直接DE406计算、76/80可控实验和原始文献核查；**仍未闭合全部历史apparent pipeline**。独立实现整套流程不能用未经证实的默认组合凑成“Ra栈”。

## 8. 最终十问

1. **真实历史Swiss能否复现五例？** 正确UTC→TT的未经改造默认栈：没有。真实旧库、旧数据加UTC数值直接传UT1的调用组合：能，5/5，并通过40个唯一UTC的45条证据。
2. **最佳真实历史候选？** 1.77.00 + DE406原生默认模型，明确附带`utc-as-ut1`非标准输入约定；1.76亦全部Gate.Line一致。
3. **匹配几例？** 5/5 Sun；9/9×26；45/45×26（40个唯一UTC）。不能据此宣称所有出生图或Color/Tone/Base官方一致。
4. **每例Sun残差？** 本文数值表已列候选−Modern；候选−Jovian精确黄经为UNKNOWN，只有其所在爻区间已知。
5. **DE406贡献？** 五例约0.529–1.121mas，远小于一些时间输入效应，单独不能修复A/B/C。
6. **模型贡献？** 岁差、章动、bias逐项表已列；1976/1980能通过五例却失败九例，不能命名为官方Ra算法。
7. **固定偏移？** 五例统一黄经offset的允许区间无交集；旧TT差随年代变化。没有实现offset、统一±秒、epsilon或Gate特判。
8. **证明Jovian用Swiss？** 没有，UNKNOWN。
9. **证明MMI用JPL？** 当前产品页的公开声明CONFIRMED；具体DE版本、2010/2011实现和Jovian/myBodyGraph与其共用引擎均UNKNOWN。
10. **是否值得做Compatibility mode？** 值得继续做隔离研究原型，暂不建议产品化或替换物理正确计算。需要新增跨年代、非Sun/Moon/node边界、官方精确longitude与substructure、秒级切换时间或直接实现证据，区分仍然等价的候选。下一轮授权后再实施。

## 9. 复现、验证与交付范围

只读继承原Golden证据：[golden-cases.json](../golden-reference/golden-cases.json) 与平台五例，不改其expected。所有新增文件在本目录；不动生产逻辑、main、安装版8787、年度缓存和部署。

环境：Python3.12+、curl、clang/cc，macOS已实跑；脚本包含Linux shared-library编译分支，尚未实跑Linux。下载约200MiB，第三方源代码、星历和PDF留在仓库外。依照各来源原许可获取；本仓库不再分发这些文件。

```bash
python3 docs/ra-era-astronomy-stack/scripts/reproduce.py --runtime /tmp/ra-era-reproduction
python3 docs/ra-era-astronomy-stack/scripts/analyze.py
python3 docs/ra-era-astronomy-stack/scripts/validate.py
```

`--output`可指定仓库外结果目录。`--skip-jpl`合法跳过大文件实验并明确标记；不是完整复现，本报告实跑未跳过。每库独立进程，严格检查返回flags和DE元数据，禁止Moshier静默fallback。只读探针不改变库行为。

验证明细见 [VALIDATION.md](VALIDATION.md)。公开文件仅含合成案例、计算数值、脱敏构建元数据、来源链接和哈希；不包含账号、cookies、令牌、用户个人出生资料、原始登录network日志或机器私有路径。没有提交第三方二进制、源码归档或临时构建。
