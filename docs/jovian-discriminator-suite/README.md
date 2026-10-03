# Jovian discriminator suite V1

## 结论

**C1 未保持最强地位，需要降级。当前最佳候选是 C2：Swiss Ephemeris 1.76.00 + 指定 DE406 压缩数据 + 历史默认模型 + UTC 数值 JD 直接作为 UT1 输入。**

本轮用模型分歧自动选出、事先冻结的 **28 个不同 UTC**，在 myBodyGraph 和 Jovian 正常网页中各提交 **两次**。两平台的 **728/728 项 Gate.Line、28/28 个 Profile 一致**，各自重复显示稳定。C2 达到 **28/28 整图、728/728 项、28/28 Profile** 完全匹配。C1 为 **22/28 整图、721/728 项、27/28 Profile**。

这些结果支持将 **C2** 称为 **Strong Jovian-compatible historical candidate**。它仍不是“Jovian confirmed algorithm”。官方没有提供精确黄经、源码或内部时间转换，本轮没有证明官方使用 Swiss。

仅就下一步**隔离的研究原型**而言，证据门槛已达到；生产兼容承诺、迁移或部署的门槛尚未达到。本轮没有实现 Compatibility Mode。继续研究应优先 C2，而不能把 C1 作为已确定的官方算法。

## 模型与结果

| 模型 | 组合 | Personality /364 | Design /364 | 全部 /728 | 整图 /28 | Profile /28 |
|---|---|---:|---:|---:|---:|---:|
| C1 | 1.77 + compressed DE406 + UTC-as-UT1 | 357 | 364 | 721 (99.0385%) | 22 | 27 |
| C2 | 1.76 + compressed DE406 + UTC-as-UT1 | 364 | 364 | 728 (100%) | 28 | 28 |
| C3 | 1.77 + compressed DE406 + correct UTC→TT | 355 | 364 | 719 (98.7637%) | 20 | 27 |
| C4 | 2.10.03 + DE441 + correct UTC→TT | 331 | 364 | 695 (95.4670%) | 5 | 27 |
| C5 | 1.77 + DE406 + IAU1976/1980 宏实验 + correct TT | 337 | 364 | 701 (96.2912%) | 6 | 27 |
| C6 | 1.77 + direct JPL DE406 + UTC-as-UT1 | 339 | 364 | 703 (96.5659%) | 13 | 27 |

C1/C2/C3/C6 使用真实历史源码默认模型，标为 `HISTORICAL STACK`。其中 UTC-as-UT1 描述的是被测试的调用约定，不代表正确的 UTC 时间尺度处理。C4 是 `MODERN REFERENCE`。**C5 是 ARTIFICIAL EXPERIMENT**，不是已经认证的历史默认栈或“Ra algorithm”。

C4 使用的 DE441 是前轮审计锁定的具体文件构建；C6 是实际直接读取官方 JPL DE406 二进制，不以压缩文件冒充。源码来源、文件来源和 SHA256 继承自 [历史获取清单](../ra-era-astronomy-stack/acquisition-manifest.json)；本轮 [封存预测](predictions-sealed.json) 登记版本、运行库哈希、请求 flags、时间模式。flags 为 258（SWIEPH + SPEED）或 C6 的 257（JPLEPH + SPEED）。没有静默 fallback。

各案例的模型分歧、完整行星黄经、Gate.Line、最近边界距离 degrees/arcsec/mas、出生 TT/模型 UT1、Design TT/UTC、Profile、±1s/±5s 敏感度，均保存在封存 JSON 中。[逐例计分与关键数值表](case-scores.md)；[完整逐项比较](comparison.json)。

## 六个必须回答的判别问题

1. **C1 是否继续领先？否。** C1 在 6 个不同 UTC 上失败，C2 全中。
2. **1.76 与 1.77 能否区分？能。** JDS-07（Neptune）、21（Jupiter）、23（Sun/Earth/Profile）、26（Mars）、27/28（Venus）全部支持 C2；没有一例支持 C1。
3. **UTC-as-UT1 是否胜过 correct TT？本轮直接对比 C1/C3 的两个 Moon 案例都支持 C1。** C2 总体也更符合官方，但它同时改变版本，不能把 C2/C3 的全部差异归因于时间模式。两例不足以普遍确认官方时间规则。
4. **IAU1976/1980 实验是否被淘汰？这个具体 C5 配置可以淘汰为完整复现候选。** 它只有 6/28 整图；C1/C5 分歧的 18 例中 17 例支持 C1，1 例支持 C5。此结论不能扩大到所有历史 JPL 实现。
5. **direct JPL406 与 compressed DE406 能否区分？能。** 9 个节点判别案例、18 项 North/South Node 都支持压缩 DE406 的 C1，反对 C6。这里检验的是两个真实计算路径的完整组合，不能单独断言差异全来自压缩精度。
6. **是否还有不可区分候选？在本轮六个配置中，只有 C2 全中，没有并列全中配置。** 未测试的旧版、共享 ΔT 表或其他实现仍可能不可区分；Gate.Line 相同并不证明精确黄经相同。

## 版本差异第一次出现在哪里

在 6 个 C1/C2 判别时刻，C1 的 TT 比 C2 早 **2.8208–2.9901 秒**。重新以 **同一个 C2 TT** 输入两个真实原生库，对 28 个 UTC × 11 个原生天体逐项比较，最大黄经残差 **0 mas**。因此，本轮 C1/C2 输出分歧来自库各自的 `swe_deltat()` 转换，未发现同 TT 下的天体位置差异。

源码证据：

- 1.76 的 `swephlib.c`：`swe_deltat()` 使用 `dt[]` 历史表，`TABEND=2014`，注释记载 2009-02-03 更新，centiseconds 的 short 表和未来外推。
- 1.77 的同文件：`TABEND=2017`，注释记载 2010-04-27 更新，seconds 的 double 表和未来外推。
- 两者来源是清单中的 `maitreya7.tar.bz2` / `libswe-177.tar.bz2`，精确路径、版本及源码哈希见 [上一轮源码构建记录](../ra-era-astronomy-stack/)。本轮不提交第三方源码副本。
- [原生复现记录](native-reproduction.json) 保存 same-TT 的最大残差和 `swe_calc_ut()` 等价性验证。

这不是人为把时间移动 3 秒。**没有加入任何修正**，只是测量两个真实历史默认函数自然产生的差异。也不能由此断言官方内部显式采用 1.76：另一个实现可能使用相同历史 ΔT 约定。

## 选择与盲测协议

基线 `70ec9f3c15fb98a55cb57baa2ed6adb2de753678`，研究分支 `research/jovian-discriminator-suite-v1`。

搜索覆盖 1980–2030：Sun/Moon/Mercury/Venus/Mars/True Node 每年 1 月和 7 月前 14 天；慢行星 Jupiter/Saturn/Uranus/Neptune/Pluto 连续扫描整个区间。这是定向搜索，**不是对全部快速天体进行 51 年每分钟穷举**。

109,504 个扫描区间、31,407 个 C1 边界、31,328 个唯一分钟时刻，筛出 3,858 个模型分歧时刻；370 个时刻进入完整图与敏感度计算。排除未来出生输入后，按模型对比、天体和年代选出 28 例。内部初稿的选样覆盖问题在读取任何新官方结果之前修正，最终只使用下面的正式封存集合。

- 1980s：12；1990s：3；2000s：3；2010s：7；2020s：3。
- 判别触发天体覆盖全部 11 类：Sun、Moon、Mercury、Venus、Mars、Jupiter、Saturn、Uranus、Neptune、Pluto、True Node。
- 每例所有模型的全部 26 项在 ±1 秒保持不变；18 例在 ±5 秒也不变，10 例标为敏感。**6 个 C1/C2 判别例均不满足全部模型 ±5 秒稳定**，距离切换约 1.1–1.8 秒。官网仅输入分钟且返回 UTC 已核对，因此是有用的分钟输入判别点，但仍属于窄边界证据。
- 本轮选择的分歧都在 Personality。所有 Design 项相同且全部匹配；**不能据此认为已经严格判别了 Design 88° 的实现**。下一套独立封存样本宜专门搜索 Design 激活边界。

正式封存时间：`2026-10-03T12:34:35.585151+00:00`。

封存提交：`ba16aa60721ff085a6470084102160ac2d11594d`，早于首个官方观测 `2026-10-03T12:40:34.582Z`。

- `cases.json` / `discriminator-cases.json`：`bea6aef8d295e7327398cf89c58dcc7e8326d0af9bc23ed3d575812f6ff1858f`
- `predictions-sealed.json`：`c0eb987401b1e7d8ae7fa0ad297e51d4764d77f15767cdf318d7eed74738b128`
- [SHA256SUMS.json](SHA256SUMS.json) 包含 7 个封存文件。其 `officialCollectionBegan=false` 是封存时状态，不是当前状态；该封存文件没有后改。

官方结果采集后没有更改 shortlist、模型、预测、边界或封存脚本。没有使用 offset、epsilon、统一时间修正、Gate 特判。

## 官方证据与限制

采集入口：[myBodyGraph](https://app.mybodygraph.com/)、[Jovian Archive](https://jovianarchive.com/pages/get-your-human-design-chart)。只使用现有合法会话和正常 UI，不访问认证材料、非公开 API 或付费资料。

两平台各 28 × 2 次，共 **112 次正常提交**。SVG 两列显示的 26 项和属性面板 Profile、出生 UTC 均记录；myBodyGraph 的 Design Date 显示到分钟，但没有明确声明其时区，原样保留而不擅自标为 UTC。没有取得官方 exact longitude 或 Color/Tone/Base。

- [官方结构结果](official-results.json)：两平台各自完整 26 项与时间戳。
- [myBodyGraph DOM 观测](evidence/mybodygraph-blind-dom.tsv)：两列完整值、Profile、Design Date、两轮时间。
- [Jovian DOM 确认](evidence/jovian-blind-confirmations.tsv)：独立采集时间、官方 UTC 显示、两轮稳定和逐项一致性。其 26 项与前一表完全相同，使用明确的无损去重记录，而非伪造另一份不同数据；JSON 中展开成各平台完整字段。
- [采集转录校验](evidence/capture-fingerprints.json)：从浏览器会话保留的 112 份原始 DOM 观测独立计算，再与落盘表格核对。两平台各 28 对均通过。FNV 校验仅检查转录一致性；封存完整性仍使用 SHA256。
- [myBodyGraph 官方导出图片](evidence/mybodygraph-JDS-28.webp)、[Jovian 官方导出 PDF](evidence/jovian-JDS-28.pdf) 与其 [PNG 预览](evidence/jovian-JDS-28.png)：JDS-28 的代表性图表证据。其余各例使用结构化 DOM 证据，并未声称每例都有截图。
- [手工复测包](manual-test-pack.md)：没有未验证案例，仍提供全部 28 个无预测值的输入清单。

重复提交证明显示稳定；无法保证后台没有缓存。两官方产品可能共享计算服务，平台一致不能当作两套独立算法证明。百分比来自刻意挑选的边界样本，**不是总体人口准确率**；Earth/South Node 为派生项，728 项也不是 728 个独立统计试验。

没有发布账户名、个人图表链接、cookie、token 或真实用户出生资料。全部输入为合成研究案例。

## 复现

原生来源/数据下载及构建沿用前轮锁定清单；源码、二进制、星历全部留在仓库之外。Python 3.12+、clang/cc、curl 可用即可。

```bash
# 准备并构建真实历史库，第三方材料仅写入指定的仓库外目录
python3 -B docs/jovian-discriminator-suite/scripts/reproduce.py \
  --runtime /tmp/ra-era-research --prepare --output /tmp/discriminator-replay

# 如果材料已存在，直接复核 6 × 28 × 26 预测及每例 ±1s/±5s
python3 -B docs/jovian-discriminator-suite/scripts/reproduce.py \
  --runtime /tmp/ra-era-research --output /tmp/discriminator-replay

# 从已存官方证据离线重建分数；无需登录
python3 -B docs/jovian-discriminator-suite/scripts/compare.py
python3 -B docs/jovian-discriminator-suite/scripts/report.py
```

`compare.py` 先校验全部封存 hash，再解析官方观测，不会用预测生成官方结果。`reproduce.py` 每模型使用新进程，检查版本、请求/返回 flags、全部获取资产哈希、黄经、Gate.Line、Profile、敏感度，并直接调用 `swe_calc_ut()` 核对 UTC-as-UT1 包装的数值等价性。不同平台原生库二进制 hash 可能不同，源码及星历 hash 应保持一致。

搜索代码也保存在 `scripts/search.py`，命令行 `--help` 列出扫描、筛查、完整图和 shortlist 参数；只允许在新临时输出目录运行。`seal.py` 检测已有 seal 后拒绝覆盖。需要新 shortlist 时创建新套件，不要修改本次封存研究。

## 验证与范围

[validation.json](validation.json)：封存完整性、28 个唯一输入、两平台双轮一致性、UTC 校验、6 个新原生进程、4,368 项预测零数值残差、112 个秒级偏移时刻/模型的敏感度分类，以及原始资产哈希通过。

无生产代码变化，未运行生产 UI/年度缓存生成或部署。没有修改 main、8787、Mandala、UTC 生产逻辑或年度缓存。所有变更限定在 `docs/jovian-discriminator-suite/`。
