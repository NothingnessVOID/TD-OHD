# Moon apparent-position parity

基线：`fix/sharp-swiss-parity-v1` / `4054166c5284a729f093e160daafdab01cbf52f3`。
本轮仅修改 Moon apparent-position 流程；没有修改 UTC、frame bias、Mandala、True Node 或其他行星计算。

## 结论

Moon light-time 假设：**CONFIRMED**。

G2015-feb，UTC `2015-02-04T06:56:00Z`：两边 raw Moon(t) 的位置差不超过 `3.69e-18 AU`，Earth(t) 完全相同。旧流程在 emission epoch refetch 后，将 geocentric Moon(t-dt) 加上 reception epoch 的 Earth(t)。Swiss C `app_pos_etc_moon()` 则加 Earth(t-dt)，再减 Earth/observer(t)。

**第一次出现约 20″ 差异的位置是 refetch 后的 barycentric lift**。其位置向量差达到 `1.946355338e-7 AU`。Earth(t)−Earth(t-dt) 在 J2000 黄道经度上的独立几何投影为 `20.7714576260″`，最终 true-of-date 黄经残差为 `20.7713014599″`。投影坐标系与最终坐标系不同，因此不要求两个数逐位相同。

阶段数据完整保存在 [trace-before.json](trace-before.json) 和 [trace-after.json](trace-after.json)：raw Moon/Earth、dt、refetch、lift、geocentric、aberration、bias、precession、nutation、最终黄道向量和黄经。追踪只对临时源码副本插入只读记录；生产修改前已经完成基线证明。

## 最小修复及第二个 lunar light-time 差异

1. `BodyService.Refetcher.RefetchEarthCenter()` 明确返回 Earth center，排除 topocentric observer offset。
2. Moon(t-dt) 用 Earth center(t-dt) lift；随后仍扣除 observer(t)。`RefetchEarth()` 保留原有含地表偏移的 observer 语义，供 aberration speed 使用。
3. 只替换 Earth epoch 时，18 项 Moon 最大残差降至 `1.3028288208 mas`，完整离散字段已经 9/9 相同，见 [center-refetch-only.json](center-refetch-only.json)。但尚未达到其他行星的精度。
4. 逐阶段对照发现 Moon 还套用了 `app_pos_etc_plan()` 的二次 light-time 迭代和 change-of-dt speed correction。G2015-feb 旧 dt 为 `1.3502410317 s`，C Moon 单次 range dt 为 `1.3502506702 s`。现改为 Moon 专用单次 delay，跳过行星专用 xxsp；普通行星分支保留。
5. Moon 内部 raw/observer 速度始终取得，用于光行差和 analytical source delay；未请求 Speed 时，最终输出仍为零速度。此修复仅对 Moon 生效。
6. Moshier Moon 保留 C 的线性 retarding 分支；生产和本轮数值验收仍使用文件式 Swiss，不开放 Moshier fallback。

修复后 G2015-feb 各 refetch/lift/correction 阶段的最大位置差约 `2.22e-16 AU`，最终黄经差 `−9.21e-9″`。没有经度 offset、epsilon 或针对案例的判断。

## 九例出生图

独立 oracle 为未修改的 Swiss C 2.10.03，使用与生产相同、锁定 SHA-256 的 SE1 文件，独立求 88° Design 日期。两组经度继续交给未修改的 HumanDesign 1.2.0 映射和 mechanics 分类；mechanics 对照并不声称是另一套独立分类算法。

| 指标 | 基线 | 修复后 |
|---|---:|---:|
| Moon max longitude residual，双方各自 Design root | 20.7713014599″ | 0.0000879581″ |
| Moon max longitude residual，相同 TT | 约 20.77″ | 0.000000019236″ |
| 26 项 Gate/Line/Color/Tone/Base 全部相同 | 3/9 | 9/9 |
| 26 项 Gate/Line 全部相同 | 9/9 | 9/9 |
| Profile/Type/Authority/Definition/Cross/Channels/Centers | 9/9 | 9/9 |
| True Node 最大残差 | 9.4185438456 mas | 9.4185438456 mas |

`0.0000879581″` 的 own-root 最大值包含旧有 Design root 最多 `0.161 ms` 的时刻差；同一 TT 的 Moon 残差只有 `0.000019236 mas`。没有为压低该数字修改 Design root/UTC。

234 项比较在 [results.json](results.json)。非 Moon 的 native 输出逐项与基线 **完全相同**，True Node 未发生数值变化。Moon geocentric speed 最大差 `6.38e-10 deg/day`。原基线报告、原 Golden JSON 和全部 320 个审计文件保持不变。

## Topocentric/API 保护

[api-results.json](api-results.json) 与 [api-before.json](api-before.json) 保存 288 项 same-TT 对照：18 个 epoch × 8 种 flag/observer 组合 × Swiss/JPL 两个实际来源。包含 geocentric、no-speed、true、no-aberration、J2000、Shanghai/London topocentric、topocentric true position。

- geocentric 黄经最大差 `0.000019236 mas`。
- topocentric 黄经最大差 `0.000038779 mas`，位置向量最大差 `7.14e-16 AU`。
- 合成测试让 center(t-dt) 和 observer(t-dt) 返回不同值，直接防止 lift 混入地表偏移、parallax 被抵消或重复叠加。
- TruePosition 禁止 refetch；no-speed 输出保持零。
- JPL 测试检查 C 返回来源 bit=1，禁止静默 fallback；该大型文件只用于本地 API 验证，未加入仓库，哈希见 [engine-files.json](engine-files.json)。

**仍有既存 topocentric observer 速度残差，未扩修。** 例如 G2005-jul20 的 topocentric true-position speed 差在基线和补丁均为 `−0.001547144887 deg/day`，此分支不经过 light-time。当前 apparent topocentric speed 最大差为 `0.004249392748 deg/day`，基线为 `0.003844552475 deg/day`；Moon delay 修正后部分误差抵消关系改变。topocentric 位置已对齐，不宣称完整 API velocity parity。另有原 Sun speed 差保持不变；没有修改 observer 或 node 算法。

## 回归与保护

- `npm test`：247 passed、0 failed、3 skipped（既有在线 geocoding 测试），总数 250。
- `test:localization`：34 passed；`test:timeline`：61 passed；`test:sharp`：5 passed。
- `build:engine`、`build`、`build:pages`、`check:pages-bundle`：passed。
- `e2e:sharp`：52 时刻 × 13 行星 native/WASM；missing ephemeris、实时 fallback、rapid changes、IANA DST fold：passed。
- [wasm-results.json](wasm-results.json)：九例 × 26 项全部激活及 mechanics，与 native 对照 passed。
- 测试用旧 Moon 换闸秒更新为 Swiss C 已复核的 `06:10:48Z → 06:10:49Z`；精确 transition 约 `2026-09-23T06:10:48.566247Z`，见 [boundary.json](boundary.json)。只更新 fixtures，未改任何换闸规则。
- Engine/cache identity 更新至 `3440eda44d0f13c4afde`，防止复用旧 Moon 结果。
- [preservation.json](preservation.json)：8787 八个引擎/星历文件本地与 HTTP hash 均未改变，2021–2036 正式年度缓存及 manifest 共 17 文件未改变，未部署、未 merge main。

## 复现

需要 .NET 10 SDK（WASM build 另需 wasm-tools）、项目依赖和锁定生产 SE1。C 来源/编译命令/哈希沿用 [oracle-build.json](../sharp-swiss-parity-fix/oracle-build.json)。所有临时构建和二进制留在仓库外或 ignored 目录。

```sh
export DOTNET=/path/to/dotnet
python3 docs/moon-apparent-parity/scripts/trace.py --c-source /path/to/pinned-swiss-c
python3 docs/moon-apparent-parity/scripts/trace.py --c-source /path/to/pinned-swiss-c --working --output docs/moon-apparent-parity/trace-after.json
python3 docs/moon-apparent-parity/scripts/verify.py --library /path/to/unmodified-oracle.dylib
python3 docs/moon-apparent-parity/scripts/check-moon.py --library /path/to/unmodified-oracle.dylib --jpl /path/to/de441.eph
python3 docs/moon-apparent-parity/scripts/check-moon.py --library /path/to/unmodified-oracle.dylib --jpl /path/to/de441.eph --baseline
python3 docs/moon-apparent-parity/scripts/check-boundary.py --library /path/to/unmodified-oracle.dylib
E2E_URL=http://127.0.0.1:5291 node docs/moon-apparent-parity/scripts/check-wasm.mjs
```

完成本轮后停止；True Node 和 observer velocity 留待独立任务。
