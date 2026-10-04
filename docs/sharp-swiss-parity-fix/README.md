# Sharp Swiss parity 候选修复 V1

基于 `bbb9317fbafa2baf33e137b003d776fff9c20c29`，分支 `fix/sharp-swiss-parity-v1`。仅修复两个已证实的问题；未合并、未部署，8787 安装版保持不变。

## Confirmed bug A：缺失 frame bias

`third_party/SharpAstrology.SwissEph/Application/Bodies/CorrectionPipeline.cs` 在 annual aberration 后、precession 前调用既有 `CatalogFrameTransforms.IcrsBias()`，同时旋转 position 和 speed。`BodyState.DeNumber` 由实际 JPL / `.se1` 文件头传入并沿转换保留。

规则对应原版 C `sweph.c:2755–2758 / 4051–4054 / 4227–4230`：非 ICRS 且有效 DE ≥403 才执行；J2000 输出仍执行 bias，随后才跳过 precession。旧 DE402 跳过。C `swi_get_denum()` 对 Moshier 明确返回403，对零文件编号回退 `SE_DE_NUMBER=431`，因此采用 C 规则，未把诊断 patch 的 Moshier 排除条件直接复制进正式代码。Moshier 测试确认不读取 JPL 元数据；生产仍禁止 Moshier fallback。

## Confirmed bug B：UTC clock JD 被当作 UT1

`Application/Calendar/CalendarService.cs` 的 `UtcToJulianDay(DateTime)` 改为既有 `UtcToJulianDayPair(...).Ut1`，小数秒包含全部 DateTime ticks。相邻 inverse `JulianDayToUtc()` 改用 `JdUt1ToUtc()`，保留 UTC Kind 和亚秒。DateTime 无法表达 leap-second 标签60秒，明确拒绝并指向可表达该标签的 `JdUt1ToUtc()`；没有把 UTC 秒数人为加减。

## Dependency / 可复现性

只 vendoring SwissEph 0.5.1，固定上游 `342a57997c1b987e7949acc98897c8b73d05939a`；HumanDesign 1.2.0、Base 0.14.0 保持 NuGet。两个 runtime csproj 都 ProjectReference 同一源码，年度工具通过 engine-core 使用它。原始许可证保留，构建随引擎分发。无全局 NuGet 缓存修改、无机器专属 runtime 路径。

[patch-manifest.json](../../third_party/SharpAstrology.SwissEph/patch-manifest.json) 保存 patch revision、source hash、所有修改文件的原始/补丁 SHA；[upstream-files.json](../../third_party/SharpAstrology.SwissEph/upstream-files.json) 保存完整原始 snapshot 的文件 SHA。源码约2MB；不提交星历、二进制、NuGet、bin/obj。

## Oracle

原版 Swiss C 2.10.03，commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`。本轮从已逐文件核对该提交 SHA 的未改源码重新编译，见 [oracle-build.json](oracle-build.json)。星历为现有 manifest 锁定的 `sepl_18.se1` / `semo_18.se1`，实际 DE441；使用 `swe_utc_to_jd()`，逐项验证 `swe_calc(TT) == swe_calc_ut(UT1)`。所有调用 flags258，无 Moshier/其他源 fallback。

C 独立重新求88° Design TT root，再以 `swe_jdet_to_utc()` 得到 Design UTC。C / Sharp 两套激活均用未修改 HumanDesign 1.2.0 进行 Mandala 映射及 Type / Authority / Definition / Cross / Channels / Centers 分类；该分类复用不构成独立 Human Design 理论验证。

## Result：SWISS_PARITY 与 JOVIAN_COMPATIBILITY 分开

9例 × Personality/Design ×13项，共234条数值对照；保存 longitude、speed、Gate/Line/Color/Tone/Base、mas/arcsec 残差，见 [results.json](results.json)。

* Time / Sun longitude / Design root 的目标回归：PASS。Sun 同时刻最大残差 `2.04636307899e-07 mas`；各自重新求 Design root 后 Sun 最大残差 `0.00668331949782 mas`。
* Design root 最大 UTC 差 `0.161 ms`。
* 所有26项 Gate.Line：9/9图一致；Profile、Type、Authority、Definition、Cross、Channels、Centers：9/9一致。
* 把 Color/Tone/Base 也纳入：3/9完整一致，6图存在 Moon Base 或 Tone 差异。不能宣称全13项完整数值 parity。
* 全13项最大 longitude 残差 `20.7713014599 arcsec`，G2015-feb Personality Moon。Sun speed 最大残差 `5.88643430444e-07 degrees/day`。这些剩余上游差异仅记录，未修第三个问题。

| Body | 最大 longitude residual (mas，含独立 Design root 差) | 最大 speed residual (°/day) |
|---|---:|---:|
| sun | 0.00668331949782 | 5.88643430444e-07 |
| earth | 0.00668321717967 | 5.88643430444e-07 |
| moon | 20771.3014599 | 0.00133272668545 |
| northNode | 9.41854384564 | 7.2977983577e-07 |
| southNode | 9.41854384564 | 7.2977983577e-07 |
| mercury | 0.00998226141746 | 2.41083835117e-08 |
| venus | 0.00827354824651 | 1.35475384244e-08 |
| mars | 0.00486809312861 | 2.37423519699e-08 |
| jupiter | 0.00109644133772 | 1.17291672069e-08 |
| saturn | 0.000604086380918 | 2.23941498678e-08 |
| uranus | 0.000309410097543 | 1.52463870626e-08 |
| neptune | 0.0001450871423 | 2.32516235779e-08 |
| pluto | 0.00020258994482 | 1.40455558434e-08 |

## 四个外部软件观察

| Case / UTC | Patched Sharp | Modern Swiss C | Jovian | 测测（用户观察） |
|---|---|---|---|---|
| G2005-jul20 / 2005-07-20T21:40:00Z | 56.2 | 56.2 | 56.3 | 56.2 |
| G2015-tight / 2015-01-26T01:20:00Z | 41.4 | 41.4 | 41.5 | 41.5 |
| G2015-feb / 2015-02-04T06:56:00Z | 13.2 | 13.2 | 13.3 | 13.3 |
| G2025-tight / 2025-01-19T22:57:00Z | 60.5 | 60.5 | 60.5 | 60.5 |

`JOVIAN_COMPATIBILITY` 仅信息性记录。原 `golden-cases.json` SHA与整个320文件审计包保持不变，无 Mandala / floor / epsilon / 时间或地点兼容修正。

## Cache safety / 年度影响

Browser chart cache、native rebuild stamp、annual signature 共用 `engine-identity.mjs`。签名包含 HumanDesign/Base版本、Swiss上游版本/commit、patch revision、patched source hash、ephemeris manifest hash、UTC semantics和年度算法等。新签名 `295fd7c1531b857473d5`；旧 `5da02472c5f378854648` 被 loader 拒绝，走既有实时 fallback。

独立 `/tmp` 生成2026，未覆盖 public/transit-data：
* 7,151 events（1,189 Gate +5,962 Line）；旧新总数一致。
* 2,887 changed timestamps；2,829个±1秒，58个更大，范围−11至+10秒。
* initial、事件激活顺序和各行星数量没有变化；哈希已改变。
* 20,544 sample times，18 station windows，14 round-trips；激活和 graph 回放 differences均0。
* 发布切换前2021–2036需要全量重生；本轮只生成并验证2026（约39秒），不制作未经剩余数值差异审核的正式年度发布包。

完整变更事件见 [annual-impact-2026.json](annual-impact-2026.json)。旧正式目录17个文件和8787八项 assets 均重新核对原 SHA，见 [preservation.json](preservation.json)。

## 复现

```sh
npm ci
npm run build:engine
npm test
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-prepare.py --workdir /tmp/td-ohd-parity-c
python3 docs/sharp-swiss-parity-fix/scripts/compare.py --library /tmp/td-ohd-parity-c/libswisseph21003.dylib
node scripts/generate-transit-events.mjs 2026 --output /tmp/td-ohd-patched-2026
node scripts/verify-transit-events.mjs 2026 --input /tmp/td-ohd-patched-2026
python3 docs/sharp-swiss-parity-fix/scripts/annual-impact.py --patched /tmp/td-ohd-patched-2026
```

需 .NET10 / wasm-tools，`DOTNET` 可指向已安装SDK；Linux使用编译脚本输出的 `.so` 路径。临时数据不会更新发布目录或前端签名。build:engine 生成与实际源码匹配的前端签名；native client 在源码签名变化时强制重建，防止旧 DLL 沿用。

## 验证

见 [validation.json](validation.json)。初次并行 WASM publish 出现 MSBuild worker 提前退出，串行 publish 成功，构建脚本将该步骤固定为 `-m:1`；没有修改 SDK 或 global cache。测试覆盖1985/95/05/15/25正负DUT1、DateTime fractional ticks及 inverse、旧DE/ICRS/J2000/Moshier和position/speed guards、9例重新求根、52×13 browser/native、missing ephemeris、timeline及年度回放。
