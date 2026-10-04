# 校验与复现

所有官方结果来自当时实际浏览器输入，当前预期固定保存于 `golden-cases.json`。脚本不会通过网络自动查询 Jovian，也不会把当前引擎输出改写为官方预期。

## 1. 无外部依赖的证据校验

在仓库根目录执行，Python 3.9+（包含 Europe/London 时区数据）：

```sh
python3 docs/golden-reference/tools/validate-evidence.py
python3 docs/golden-reference/tools/verify-manifest.py
```

应显示1596项一致性检查通过、7个生产Golden差异。这项通过不表示引擎准确性测试通过。它核对UTC、45条fixture与原始记录、Profile/Sun关系、七例差异、邻分钟及扫描统计。

## 2. 独立 C Swiss 数值复现

需要单独的Python环境，`pyswisseph==2.10.3.2`（运行时`swe.version`必须为2.10.03）。完整包与星历文件不提交到本分支。

准备两个外部星历目录，各包含`sepl_18.se1`和`semo_18.se1`：

| 数据 | 固定上游commit | 来源 |
|---|---|---|
| 当前DE441 | `3186eed405bd2b4ff520c91d0b27bb25e9d75106` | [Swiss仓库ephe目录](https://github.com/aloistr/swisseph/tree/3186eed405bd2b4ff520c91d0b27bb25e9d75106/ephe) |
| 历史DE431 | `b51a083390bf3cdc93a6ba466cbc83b846c4cfc4` | [历史ephe目录](https://github.com/aloistr/swisseph/tree/b51a083390bf3cdc93a6ba466cbc83b846c4cfc4/ephe) |

文件SHA256见`final-baseline-verification.json`与`independent/de431-source-manifest.json`。脚本先核对全部四份文件hash；每次切换目录清除Swiss上下文，校验返回flags，禁止静默fallback。

以下路径均由复现者自行指定；输出目录必须在资料目录之外：

```sh
export TD_OHD_DE441=/absolute/path/to/de441
export TD_OHD_DE431=/absolute/path/to/de431
export TD_OHD_AUDIT_OUTPUT=/absolute/path/to/external-output
python3 docs/golden-reference/tools/compare-ephemerides.py
```

产生`de431-vs-de441-comparison.json`。47条原始官方记录中，C默认258+DE441为39条全部26项一致，+DE431为40条一致；七个独立差异分别匹配2例和3例。保存下来的原始计算记录在`independent/`，不要覆盖它们。

## 3. 历史ΔT表敏感性复现

这只替换表，不运行完整C2.08内核，不证明Jovian内部配置。

历史来源与tar SHA256见`provenance/historical-deltat-source.json`：PyPI `pyswisseph2.08.00-1` source tar中的完整`libswe/swephlib.c`，表到2027。先校验tar hash，再将该文件放到外部历史源目录，并将来源清单复制为同目录`source-manifest.json`。

当前`swephlib.c`来自Swiss commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`。源码hash见`provenance/c-swiss-source-provenance.json`。该文件只需外部保存。

```sh
export TD_OHD_HISTORICAL_SOURCES=/absolute/path/to/historical-sources
export TD_OHD_CURRENT_SWEPHLIB=/absolute/path/to/current-swephlib.c
python3 docs/golden-reference/tools/historical-deltat.py
```

沿用第2步输出与DE431目录。预期47条中42条全部26项匹配；剩余5条记录对应两个独立2015出生时刻及重复采集。2025两例匹配属于敏感性结果，不能写成正式修复。

## 4. Native Sharp与边界扫描

需要.NET10 SDK；固定HumanDesign1.2.0、SwissEph0.5.1，解析Base0.14.0。`native-diagnostic`是小型太阳数值探针；`sun-boundary-scan`链接当前仓库的`engine-core/TransitCore.cs`，不修改该源码。原扫描链接的阶段5源码与8787的差异只涉及connectedComponents序列化及注释，计算路径一致。

`TD_OHD_DE441`沿用第2步。所有编译产物通过`--artifacts-path`放到外部目录：

```sh
dotnet build docs/golden-reference/tools/native-diagnostic/IndependentDiagnostic.csproj -c Release --artifacts-path /absolute/path/to/native-artifacts
```

将UTC ISO逐行传入外部生成的`IndependentDiagnostic.dll`，第一个参数为DE441目录。

```sh
dotnet run --project docs/golden-reference/tools/sun-boundary-scan/SunBoundaryScan.csproj -c Release --artifacts-path /absolute/path/to/scanner-artifacts -- --birth 2015-01-26T01:20:00Z
```

其他模式：`--year-scan`、`--design-scan`、`--scan-windows UTC1 UTC2`、`--precision-boundaries`。先运行`--year-scan`再运行`--precision-boundaries`。生成资料始终写入`TD_OHD_AUDIT_OUTPUT`；默认扫描会记录原offset与3.9375的诊断对照，后者不是修正。

根时刻仅以毫秒报告；更长JSON小数是求根区间表示，不代表天文精度。

## 5. 浏览器Golden复查

固定记录中的当地出生时刻、城市和历史offset；在Jovian页面与目标TD安装分别实际输入。不要使用用户本机资料库做测试存储。逐项核对两侧太阳/地球、Profile、Cross身份及四Gate；同时核对前后一分钟与负对照。

分钟输入只能约束官方切换区间，不能反推出精确官方毫秒时刻。更换引擎、星历或时间模型时，先记录版本/hash，随后生成候选结果，不改本资料中的官方expected。
