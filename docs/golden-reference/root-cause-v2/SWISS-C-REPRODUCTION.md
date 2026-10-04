# Test A：原版 Swiss C 复现

这组计算直接调用 Astrodienst 官方 C 2.10.03。没有经过 Sharp C# port，也没有改任何 C 数值公式。编译输入、编译器、每份星历的来源、哈希和二进制头分别见 `environment-c.json`、`asset-hashes-c.json`。

## 准备

从仓库根目录执行。诊断源、库、raw JPL 文件和运行输出均放到仓库外。约需 5.58 GB 原始星历空间，另留至少 1 GiB 余量。已有且通过 MD5 的文件会复用，不会再下载一份。

```sh
TD_OHD_C_WORK=/tmp/td-ohd-root-cause-v2
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-prepare.py --workdir "$TD_OHD_C_WORK" --profile
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-fetch.py --directory "$TD_OHD_C_WORK/ephe" --file de441.eph
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-fetch.py --directory "$TD_OHD_C_WORK/ephe" --file de431.eph --mirror
```

DE431 的 `--mirror` 使用 Astrodienst 官方 README 列出的镜像。本轮 NASA DE431 单连接和分段请求均过慢，停止后直接覆盖同一个临时文件；镜像完整文件的 MD5 与官方公布值一致。DE441 直接来自 NASA。GitHub README 的 DE441 MD5 与 Astrodienst 专门下载页不同，本轮文件匹配后者，冲突已保存在证据中。

`--profile` 是 Clang LLVM 覆盖率编译选项，不是算法 patch。macOS 使用 `-dynamiclib`；Linux 生成 `.so`。下面命令使用 macOS 库名。LLVM 覆盖率提取脚本当前使用 macOS `xcrun`，其他平台可直接调用等价 `llvm-profdata` / `llvm-cov`。

## 运行九例

先把 `TD_OHD_SWISS_EPHE` 设为冻结 DE441 `.se1` 所在目录，须同时包含 `sepl_18.se1` 和 `semo_18.se1`，核对 `asset-hashes-c.json` 的两个 SHA-256。不要重新下载未核对版本替代。

```sh
TD_OHD_SWISS_EPHE='<directory containing frozen DE441 sepl_18.se1 and semo_18.se1>'
LLVM_PROFILE_FILE="$TD_OHD_C_WORK/A-SWISS.profraw" python3 docs/golden-reference/root-cause-v2/scripts/swiss-c.py --library "$TD_OHD_C_WORK/libswisseph21003-profile.dylib" --group A-SWISS --ephe "$TD_OHD_SWISS_EPHE" --output "$TD_OHD_C_WORK/A-SWISS.json"
LLVM_PROFILE_FILE="$TD_OHD_C_WORK/A-JPL441.profraw" python3 docs/golden-reference/root-cause-v2/scripts/swiss-c.py --library "$TD_OHD_C_WORK/libswisseph21003-profile.dylib" --group A-JPL441 --ephe "$TD_OHD_C_WORK/ephe" --output "$TD_OHD_C_WORK/A-JPL441.json"
LLVM_PROFILE_FILE="$TD_OHD_C_WORK/A-JPL431.profraw" python3 docs/golden-reference/root-cause-v2/scripts/swiss-c.py --library "$TD_OHD_C_WORK/libswisseph21003-profile.dylib" --group A-JPL431 --ephe "$TD_OHD_C_WORK/ephe" --output "$TD_OHD_C_WORK/A-JPL431.json"
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-coverage.py --library "$TD_OHD_C_WORK/libswisseph21003-profile.dylib" --workdir "$TD_OHD_C_WORK" --output "$TD_OHD_C_WORK/c-frame-bias-execution.json"
```

## 固定条件与实际来源证明

* 只读取冻结 `golden-cases.json` 的九个 `birthUtc`，不再次转换 London 当地时间。
* JD UT 沿用上一轮固定公式：`2440587.5 + UTC Unix seconds / 86400`。这保留现有 UTC-as-UT 输入约定，不在本轮引入额外 UTC/UT1 修正。
* `.se1` 请求/返回完整 flags 均为 **258**；两组 JPL 均为 **257**。每次 `swe_calc_ut()` 都要求返回 flags 与请求严格相同，变化立即报错；没有 Swiss/Moshier fallback。
* JPL 另外读取原版 C 内部 `swi_get_jpl_denum()`：实际返回 **441** 和 **431**；`.se1` 加载信息返回 DE441。
* Earth 为 Sun 黄经精确加 180°，South Node 为 True North Node 加 180°。两者是明确的 Human Design 派生，不宣称调用了物理地球的地心位置。
* Personality 全 13 项保存；Design 也用相同 C/source 做精确 88°太阳弧二分诊断并保存 13 项。原 8787 Design 计算没有修改。
* 只通过 `scripts/frozen_mapping.py` 进行 Gate/Line 转换，offset、floor 和边界判断不变。
* `distanceNextMas` 表示从当前爻到下一爻的正向距离。`signedLongitudeMinusExpectedStartMas` 单独表示与 Jovian 对应爻起点的有符号差，二者不能混用。
* 运行覆盖率实际证明 Sun 路径在 annual aberration 后、precession 前进入 `swi_bias()`。三组 Sun call-site 分别执行 **344、343、346** 次；default IAU2006 bias 矩阵分支执行 **560、559、562** 次，无禁用 bias 的 return。
* 三组另外使用未加 LLVM 覆盖率的普通 C 库运行，各组完整 JSON 数据均一致。

七个 mismatch 中，C `.se1` 对齐 Jovian **2/7**，C raw DE441 和 DE431 各 **3/7**。两负对照三组均对齐，且本轮 C 三组的差异仍只在 Personality Sun/Earth。
