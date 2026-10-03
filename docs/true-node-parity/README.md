# True Node Swiss C parity V1

## 结论

**Root cause: FOUND。** 两处真实 port 差异共同影响同一 True Node apparent 路径：

1. `BodyService.FetchMoonInEclipticOfDate()` 缺少 Swiss/JPL 分支的 raw geocentric Moon 光行时 refetch。
2. `SwissEphemerides.TrueNodeFlags()` 强制 `TruePosition`，并错误注释为 C node 忽略 TRUEPOS。原版 C 的 `lunar_osc_elem()` 实际通过 TRUEPOS 决定是否执行该 refetch。

基线 `fix/sharp-swiss-parity-v1` / `fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9`；任务分支 `fix/true-node-swiss-parity-v1`。只有上述路径及其身份标识、测试、审计资料变更。

## 先证明，再修复

固定 G2015-feb Personality North Node，UTC `2015-02-04T06:56:00Z`。

| 量 | 数值 |
| --- | --- |
| Reception TT JD | 2457057.7896664813 |
| UT1 JD | 2457057.788883111 |
| C lunar light-time days | 0.00001562790127542792 |
| Light-time seconds | 1.3502506701969723 |
| Emission TT JD | 2457057.7896508533 |
| Moon actual source | Swiss `.se1`, DE number 441，双方一致 |
| Node speed sampling | TT −0.0001 / +0.0001 / center，双方一致 |

首个明显分叉在 **raw Moon(t) → light-time Moon(t−dt)**，发生于 bias/precession/nutation 之前。原始 Moon(t) 的位置、速度差仅浮点末位；C 重取 retarded Moon 的位置和速度，Sharp 基线继续使用 reception Moon。

[trace-before.json](trace-before.json) 从不可变基线源码取样；[trace-experiment.json](trace-experiment.json) 仅在临时副本增加 refetch，验证残差消失后才修改生产源码。[trace-after.json](trace-after.json) 追踪正式补丁。三份追踪均确认插桩 C 最终六项输出与**未修改 C 动态库逐值相等**。完整三次样本的向量、轨道元素、node vector、最终速度均保存，单位注明在 JSON 中。

下表为 center sample 的最大坐标绝对差；位置单位 AU，速度 AU/TT-day。nodeDirection/correctedNode 没有独立速度，表内 0 是占位；真实最终 Node speed 单独给出。

| 步骤 | 修复前 position | 修复后 position | 修复前 velocity | 修复后 velocity |
| --- | ---: | ---: | ---: | ---: |
| rawMoon | 3.68628738645e-18 | 3.68628738645e-18 | 7.5894152074e-19 | 7.5894152074e-19 |
| lightTimeMoon | 6.12103968705e-09 | 3.68628738645e-18 | 1.41615513386e-09 | 7.04731412116e-19 |
| bias | 6.12104017993e-09 | 3.68628738645e-18 | 1.41615518899e-09 | 7.04731412116e-19 |
| precession | 6.14111227062e-09 | 3.68628738645e-18 | 1.42074974604e-09 | 7.04731412116e-19 |
| nutation | 6.14135520238e-09 | 3.68628738645e-18 | 1.42078370997e-09 | 7.04731412116e-19 |
| meanEcliptic | 6.49340908647e-09 | 4.11996825544e-18 | 1.42078370997e-09 | 7.04731412116e-19 |
| ecliptic | 6.49342929253e-09 | 4.11996825544e-18 | 1.42078370997e-09 | 7.04731412116e-19 |
| nodeDirection | 2.05530563888e-08 | 5.20417042793e-18 | 0 | 0 |
| correctedNode | 1.14261003003e-10 | 3.90312782095e-18 | 0 | 0 |
| finalNode | 1.14261003003e-10 | 3.90312782095e-18 | 4.78935467674e-11 | 3.90312782095e-14 |

`elements` 数组为半长轴、偏心率、sin(inclination)、u、true anomaly、GM；三样本详见 trace。没有改其常数和公式。旋转顺序为 ICRS bias → J2000/date precession → nutation → mean obliquity → Δε；position/velocity 一起做矩阵旋转，保留 C 此路径的无 daily rotation-rate 项语义。旋转使用 reception TT，原始 Moon 取 emission TT。未触碰 UTC 或已确认 frame-bias 实现。

最大原案例：

| 输出 | Longitude ° | Speed °/day |
| --- | ---: | ---: |
| Sharp baseline | 191.42437435136964 | -0.16737878404513906 |
| Swiss C | 191.42437696763182 | -0.16737925045140492 |
| Sharp patched, same TT | 191.42437696763173 | -0.16737925096592551 |

## 最小修复与边界

- Swiss/JPL 且非 TRUEPOS：从 Moon(t) 长度计算 delay，重新从同一 source 取 Moon(t−dt)，包括 raw velocity；继续使用 t 的坐标旋转。
- Moshier 和显式 TRUEPOS：不 refetch，保留几何路径。
- 图表 adapter 的 True Node 默认清除 TRUEPOS；Mean Node 路由保持原样。South Node 仍由 North Node +180° 得到。
- 没有 Earth observer/barycentric lift，也没有复用 planetary apparent corrections。
- 没有 longitude offset、epsilon、边界容差或案例特判。
- 原 C 的共同 `lunar_osc_elem()` 分支也服务 OsculatingApogee；该底层共用取样因此遵循同样 C 语义。未新增 apogee 产品功能或另行修改其元素算法。
- source/cache identity 升级至 `td-ohd-swiss-parity-v1-true-node-light-time`，防止旧计算缓存混入。没有生成或修改正式年度数据。

## 数值与完整图回归

[results.json](results.json) 使用未修改 C 2.10.03、生产 SE1 和独立 88° root，原 HumanDesign 1.2.0 用于两套 activations 的结构映射。没有进行 Jovian/myBodyGraph 比较。共九例 × 两侧 × 13项 =234项，Node共36项。

| 指标 | 修复前 | 修复后 |
| --- | ---: | ---: |
| Node max longitude residual，分别解 Design root | 9.41854384564 mas | 0.00013342287275 mas |
| Node max longitude residual，同一 TT | 9.41854384564 mas | 9.20863385545e-07 mas |
| Node max speed residual，常规 SPEED | 7.2977983577e-07 °/day | 9.64986585431e-10 °/day |
| Gate/Line/Color/Tone/Base full parity | 9/9 | 9/9 |
| Type/Authority/Definition/Profile/Cross/Channels/Centers | 9/9 | 9/9 |

其余198项 native天体状态与基线逐值相同。13项最大独立root残差为 0.0879581079971 mas，仍是既有 Design Moon root-time 差，不是新增。两套 Design root 最大时间差0.000161秒；Node同TT与own-root的残差区别也来自该有限时间表达。

剩余同TT差约10⁻⁷~10⁻⁶ mas；raw Moon向量差约10⁻¹⁸ AU，后续double旋转和轨道元素运算保留末位差，中央差分速度会放大减法舍入。没有为追求十进制绝对零去改数学算法。

## API 与浏览器

[api-results.json](api-results.json)：Swiss、JPL DE441、Moshier ×18 epochs × apparent/no-speed/TRUEPOS/no-aberration/no-nutation/SPEED3 =324项。

- 24项 source-spy guard 验证 source分支、emission epoch、原始速度、输出no-speed。
- 144项 Moshier/TRUEPOS control 与基线向量完全相同。
- 180项 apparent Swiss/JPL同TT最大longitude残差 9.20863385545e-07 mas。
- 常规速度API最大残差 7.26141667629e-10 °/day。
- **既有 SPEED3 差异**：Sharp Normalize 把 SPEED3映射为SPEED；C SPEED3走独立差分估计。最大速度差从 0.00466833739834 到 0.00466906716552 °/day。该策略未修改，不能把此非默认API差异藏进“全部速度归零”的结论。正常图表使用SPEED。

[wasm-results.json](wasm-results.json)：浏览器9/9完整图与native及独立C的全部234项离散字段和mechanics一致。现有 `e2e:sharp` 另覆盖52epochs ×13天体、缺失星历拒绝、fallback、快速切换、IANA DST fold和行星详情。

测试汇总见 [validation.json](validation.json)。旧审计报告和fixtures不覆盖；原回归测试读取当前True Node fixture。只写独立测试产物，正式8787安装与17份年度文件哈希保持不变，见 [preservation.json](preservation.json)。

## 引擎来源和复现

- C 2.10.03，仓库 `aloistr/swisseph`，commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`。完整源文件hash与编译方式沿用 [oracle-build.json](../sharp-swiss-parity-fix/oracle-build.json)。
- Sharp SwissEph0.5.1 upstream commit `342a57997c1b987e7949acc98897c8b73d05939a`，Base0.14.0 / HumanDesign1.2.0。
- 锁定SE1：[ephemeris-manifest.json](../../engine-wasm/ephemeris-manifest.json)；当前源码hash：[patch-manifest.json](../../third_party/SharpAstrology.SwissEph/patch-manifest.json)。
- JPL文件仅本地用于API路由复测，其文件名和SHA保存在api-results；不提交完整二进制、NuGet、临时编译目录或账户数据。

设置 `DOTNET` 为.NET10 SDK可执行文件；下列占位路径需指向上述锁定源码/库/星历。

```sh
python3 docs/true-node-parity/scripts/trace.py --c-source <pinned-C-source> --library <unmodified-C-library> --output docs/true-node-parity/trace-before.json
python3 docs/true-node-parity/scripts/trace.py --experiment --c-source <pinned-C-source> --library <unmodified-C-library> --output docs/true-node-parity/trace-experiment.json
python3 docs/true-node-parity/scripts/trace.py --working --c-source <pinned-C-source> --library <unmodified-C-library> --output docs/true-node-parity/trace-after.json
python3 docs/true-node-parity/scripts/verify.py --library <unmodified-C-library>
python3 docs/true-node-parity/scripts/check-api.py --library <unmodified-C-library> --jpl <DE441-file>
npm test
npm run test:localization
npm run test:timeline
npm run build
E2E_URL=<isolated-preview> node docs/true-node-parity/scripts/check-wasm.mjs
E2E_URL=<isolated-preview> npm run e2e:sharp
```

**未merge main、未部署、未切换8787、未生成2021–2036正式年度缓存。**
