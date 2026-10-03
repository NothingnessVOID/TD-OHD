# Golden Reference root-cause v2

审计日期：2026-10-03。固定使用原有七个 mismatch 与两个 negative control；数值输入直接取 [golden-cases.json](../golden-cases.json) 的 `birthUtc`。生产计算、8787 安装、UI、Mandala `3.875°`、floor 规则和 Design `88°` 均未修改。

## 结论

1. **原版 C `.se1` DE441：2/7 对齐 Jovian**，为 G1995-jun、G2005-jul20；其余五例的 Personality Sun Gate.Line 与 Sharp/8787 相同。
2. **原版 C raw DE441：3/7 对齐 Jovian**，增加 G1995-feb；余四例仍与 Sharp/8787 相同。
3. **原版 C raw DE431：同样 3/7 对齐**。两个 raw 内核在九例中的 Sun Gate.Line 相同，太阳黄经并非完全相同。
4. **Sharp 原版 raw DE441：0/7 对齐 Jovian**，九例均与原 `.se1`/8787 的 Personality Sun Gate.Line 相同。实际运行源为 JPL，禁止了 fallback。
5. **Sharp raw DE441 + frame bias：3/7 对齐**；九例太阳黄经与 C raw DE441 的最大残差为 `1.0232×10⁻⁷ mas`，属于 double 末位差异。JD UT、ΔT、JD ET 在九例均完全相同。
6. **MMI 3.0 未获得计算结果**：真实桌面门户进入登录页，当前也无 Windows/MMI 可运行环境，按要求记为 `MMI UI test blocked by access requirement`。没有把不同的 Maia 网页产品当作 MMI 3.0。

两个负对照在所有七个可执行数值配置中均保留原 Gate.Line，并与 Jovian 相同。以上比例只以七个原 mismatch 为分母，不代表随机出生图错误率。

## 九例总表

每格为 **Personality Sun Gate.Line**。MMI 的 `blocked` 表示没有观测值，不表示计算失败或结果相同。

完整表见 [comparison-table.md](comparison-table.md)，结构化记录见 [comparison.json](comparison.json)。

| Case | Jovian | MMI | Sharp .se1 | Sharp raw441 | Sharp raw441+bias | C .se1 DE441 | C raw441 | C raw431 |
|---|---|---|---|---|---|---|---|---|
| G1995-feb | 55.4 | blocked | 55.3 | 55.3 | 55.4 | 55.3 | 55.4 | 55.4 |
| G1995-jun | 15.3 | blocked | 15.2 | 15.2 | 15.3 | 15.3 | 15.3 | 15.3 |
| G2005-jul20 | 56.3 | blocked | 56.2 | 56.2 | 56.3 | 56.3 | 56.3 | 56.3 |
| G2015-tight | 41.5 | blocked | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 |
| G2015-feb | 13.3 | blocked | 13.2 | 13.2 | 13.2 | 13.2 | 13.2 | 13.2 |
| G2025-tight | 60.5 | blocked | 60.4 | 60.4 | 60.4 | 60.4 | 60.4 | 60.4 |
| G2025-mar | 36.4 | blocked | 36.3 | 36.3 | 36.3 | 36.3 | 36.3 | 36.3 |
| G1985-tight | 41.4 | blocked | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 |
| G2005-jul11 | 53.4 | blocked | 53.4 | 53.4 | 53.4 | 53.4 | 53.4 | 53.4 |

## 数值证据与定位

### 已证实：Sharp 普通太阳 correction pipeline 缺少 frame bias

固定 Swiss C `2.10.03` commit：`175e1fcb3108bcd5c0d146c803f51dcf23508012`。没有修改其源码方程，动态执行计数证明 `sweph.c:4052–4053` 的太阳 `swi_bias()` 调用确实执行；证据见 [c-frame-bias-execution.json](c-frame-bias-execution.json)。

固定 Sharp SwissEph `0.5.1` commit：`342a57997c1b987e7949acc98897c8b73d05939a`；Base `0.14.0`、HumanDesign `1.2.0`。

诊断补丁只在 `Application/Bodies/CorrectionPipeline.cs` 的 annual aberration 后、precession 前调用既有 `CatalogFrameTransforms.IcrsBias()`。条件为实际 source header 的 DE number ≥403，且非 ICRS 输出。未知 DE、DE402 和 Moshier 跳过；ICRS 输出跳过。每个 biased 配置均验证这些守卫，无重复 bias。补丁、原文件与修改文件 SHA256 均已保存。

Sharp 当前 raw441 的太阳黄经比 C raw441 少约 `6.785–6.787 mas`。补 bias 后，九例残差降至上述 double 末位量级；`.se1+bias` 与 C `.se1` 的九例太阳黄经直接 double 相等。NuGet 原包与固定源码重编译、诊断 metadata 禁用时，两个来源共 `234` 个 Personality longitude/speed pairs 逐 double 完全相等，排除了本次重编译另引入太阳变化。

这定位了 **Sharp Sun correction pipeline 的具体差异**，但不能称为七个 Jovian mismatch 的完整根因。没有把诊断补丁写入生产。

### raw 文件只解释一个额外临界样本

同为 DE441、同 JD UT/ΔT/ET 和 C 默认修正，G1995-feb 的 raw Sun 比 `.se1` 高 `0.433024752 mas`：

- C `.se1`：`332.93749991340792°`，距 Jovian 55.4 起点为 `−0.311731 mas`。
- C raw441：`332.93750003369258°`，距该起点为 `+0.121293 mas`。

因此这一例跨界，支持局部 Result 3。该组 source 差最大约 `1.108391 mas`，不能扩展为 raw JPL 解决全部差异，也不能由文件格式确定 Jovian 所用内核。

### 逐例 Result 1–7

| 分类 | 本轮证据 |
|---|---|
| Result 1 | G1995-jun、G2005-jul20：C 默认 `.se1` = Jovian，Sharp 不同。 |
| Result 2 | G1995-feb、两例 2015、两例 2025：C 默认 `.se1` = Sharp ≠ Jovian。离散结果相同仍可能存在微小黄经差。 |
| Result 3 | G1995-feb：C raw441 = Jovian，C `.se1` = Sharp ≠ Jovian；控制了 DE/time/flags。 |
| Result 4 | 两例 2015、两例 2025：C `.se1` 与 C raw441 都保留 Sharp 的 Sun Gate.Line。 |
| Result 5 | 九例 Sharp raw441 与 C raw441 的 **太阳黄经** 有差异；frame bias 后该太阳残差消失。不能只按 Gate.Line 是否相同判此项。 |
| Result 6/7 | MMI 无实际图表输出，无法分类。 |

### 剩余根因边界

仍未匹配：G2015-tight、G2015-feb、G2025-tight、G2025-mar。原版 C 默认、raw DE441、raw DE431 均未对齐这四例。当前最值得继续检查的是 **Jovian 上游采用的天文修正／时间模型／历史软件行为**，其实际配置尚未公开观测。不能据此认定它使用某一 DE 或 ΔT 表。

此前的历史 ΔT 表敏感性实验支持 2025 的候选解释，但没有解释 2015；它不是运行了完整旧版本，更不是本轮默认组的一部分。保留原证据，不将其混入本轮三组 C 的结果。

本轮排除了“只把 Sharp `.se1` 换为 raw JPL 就足够”“缺少 frame bias 可解释全部七例”“raw DE431 能解决全部七例”等单因素方案。没有调查真太阳时，也没有修改时区、地点、Mandala、边界 tolerance 或 floor。原有正负对照排除全局 offset 拟合的证据继续保留。

## 完整原始数值与范围

- [swiss-c-results.json](swiss-c-results.json)：三组原版 C，均为九例、每例 Personality13 + 独立 88° root 的 Design13。保留 UTC/JD UT/ΔT/JD ET、太阳 longitude 17 位小数、speed、Sun/Earth、Profile、所有 flags 与实际 DE。
- [sharp-jpl-results.json](sharp-jpl-results.json)、[sharp-bias-results.json](sharp-bias-results.json)：四组各九例 Personality13；实际 `BodyState.Source`、router resolved flags、registered reader header、adapter/direct source 对照。**本轮 Sharp 新组没有重新求 Design、Profile 或 Cross**，没有拼接旧结果冒充新组 all26。
- [numerical-table.md](numerical-table.md)：全部太阳黄经、当前下一爻界、distance degree/arcsec/mas（JSON 中完整）、等价秒。额外单列与 Jovian expected Line 起点的有符号距离。
- 等价秒是 `distanceDegrees / speedDegreesPerDay × 86400` 的局部线性估计，未冒充 Jovian 真实秒级切换时间。模型已进入新 Line 时，next boundary 会前进一整爻，不能混淆下一边界与刚跨过的 expected 起点。
- 输出为 tropical/geocentric/apparent/nutation/date-ecliptic。C Swiss 请求并返回 `258`；raw 请求并返回 `257`。未请求 topocentric/sidereal/true/J2000/ICRS；raw 实际返回 JPL flag `1`，不接受 Swiss/Moshier fallback。
- Earth 使用太阳反点 `(Sun+180) mod360`，不使用地心 Earth 零向量；North Node 为 true node，South Node 为其反点。

**不扩大数值等价结论：**太阳 speed 仍有约 `2.56×10⁻⁸` 至 `5.84×10⁻⁷ °/day` 差；P13 Gate.Line 相同不等于所有行星黄经相同。独立 review 观察到 Moon 数值差可达约 `20.77 arcsec`，本轮仅记录，未进一步修复或据太阳结果宣称全部 port 已与 C 等价。

## MMI 访问证据

实际阅读 [MMI 3.0 官方产品页](https://jovianarchive.com/products/maia-mechanics-imaging-mmi)，进入其 [桌面门户](https://mmi.jovianarchive.com/)，点击 trial 下载入口与 Login，实际显示 Jovian SSO 的空登录表单。当前平台为 macOS arm64，未获得 Windows/MMI 运行环境或授权访问。没有购买、注册、提交凭据或绕过权限。

官方页面提及 JPL planetary database，但没有给出 DE number、文件格式、flags 或时间模型；这句话没有被用来填写计算结果。MaiaMechanics.com 是另一个网页产品，没有替代 MMI 3.0 观测。

[mmi-results.json](mmi-results.json) 为九例全部保存 blocked/null 状态；[登录截图](evidence/mmi-access-blocked.jpg)、[登录 DOM](evidence/mmi-access-blocked.dom.txt)、[产品 DOM](evidence/mmi-product.dom.txt) 与 [门户 DOM](evidence/mmi-portal.dom.txt) 可复查。

## 来源与哈希

[environment.json](environment.json)、[asset-hashes.json](asset-hashes.json) 汇总编译器、OS、固定提交、package hash、源码 hash、真实文件 header 与运行源证据。

| 原始文件 | Bytes | SHA256 |
|---|---:|---|
| raw DE441 | 2788676624 | `476096486def4e41bfceb29aa27f50784da0bce318902bcf7b88caad058cd4da` |
| raw DE431 | 2788676624 | `fe3d0323d26ada11f8d8228fda9ca590c7eb00cee8b22dff1839f74f5be71149` |
| TD `.se1` planets DE441 | 484061 | `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66` |
| TD `.se1` Moon DE441 | 1304771 | `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7` |

raw441 直接来自 NASA；raw431 的 NASA 下载遇到持续低速／超时后，改用 Astrodienst README 推荐镜像。两文件分别通过 [Astrodienst 专门下载页](https://www.astro.com/swisseph-download/jplfiles/) 公布的 MD5，再读 binary header 与运行时 DE。README 中另一个 DE441 MD5 与当前 NASA 文件不同，这个冲突也在 [下载证据](evidence/c-sources-and-downloads.json) 中明确保留。

大型 `.eph`、`.se1`、SDK、NuGet 包和构建产物只在本地带外目录；Git 只包含报告、原始数值、来源／哈希与诊断源码。

## 复现与验证

1. 原版 C 的获取／编译／三组执行方法见 [C 复现说明](SWISS-C-REPRODUCTION.md)。
2. 固定 Sharp NuGet 与 diagnostic-only source patch 方法见 [Sharp 复现说明](scripts/sharp-harness/README.md)。
3. 两组输出放回本目录后，运行：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v2/scripts/compare.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v2/scripts/capture-environment.py \
  --installation-dist '/absolute/path/to/frozen/installed/dist'
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v2/scripts/validate.py
```

第二步传入自己的固定安装目录。本次只读取 8787 安装资产进行核对；编译放在外部 workdir，没有写入安装。

[validation.json](validation.json) 记录：冻结 JSON 与 mapping AST、384 个精确起点、27 个 C 案例／702 项激活、36 个 Sharp 案例／468 项激活、234 个源码／NuGet 数值对照、72 项 bias 守卫、raw Sun 时钟一致性，以及八项安装资产哈希。MMI 属于 blocked，不能算作九例实测通过。

[独立 review](evidence/independent-review.md) 保留 formula normalization 的既有极端 double caveat；九例不接近 Mandala offset，本轮未以 epsilon 隐藏该问题。

本次为报告／独立诊断程序变更，没有应用源码或 UI 构建变更，未运行应用 npm/E2E；运行的是以上审计完整性与真实引擎计算验证。后续生产修复仍需保留 Jovian 的 Sun/Earth、Design、Profile、Cross 和正负边界自动回归，不能将当前未通过的 Golden expectation 修改成当前引擎输出。

分支为 `audit/natal-golden-reference`；本轮提交并推送该分支，不合并 main、不部署、不安装诊断产物。提交 SHA 以 Git 历史与最终交付信息为准。
