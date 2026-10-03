# 复现 v3

只需要 Python 标准库与原版 Swiss C，不调用或覆盖 8787。所有编译库、raw kernel 与完整 EOP 文件放在仓库外。使用 v2 已固定的 source commit 与 raw DE441，版本、bytes、SHA256 见 [environment.json](environment.json)。

## 准备原版 C 与 DE441

从仓库根目录执行，macOS 库名为 `.dylib`，Linux 为 `.so`：

```sh
TD_OHD_C_WORK=/tmp/td-ohd-root-cause-v2
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-prepare.py --workdir "$TD_OHD_C_WORK"
python3 docs/golden-reference/root-cause-v2/scripts/swiss-c-fetch.py --directory "$TD_OHD_C_WORK/ephe" --file de441.eph
TD_OHD_C_LIB="$TD_OHD_C_WORK/libswisseph21003.dylib"
```

已有且哈希验证成功的 raw DE441 可以复用，不需要 DE431。运行前核对环境文件中的 raw441 SHA256。`run.py` 会逐文件验证固定 C 源码和冻结 Golden JSON；每次计算要求 actual ephemeris flag 为 JPL，并检查 runtime DE number。

## 严格顺序

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/run.py --phase time --library "$TD_OHD_C_LIB" --source "$TD_OHD_C_WORK/c-source" --ephe "$TD_OHD_C_WORK/ephe"
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/run.py --phase legacy --library "$TD_OHD_C_LIB" --source "$TD_OHD_C_WORK/c-source" --ephe "$TD_OHD_C_WORK/ephe"
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/run.py --phase components --library "$TD_OHD_C_LIB" --source "$TD_OHD_C_WORK/c-source" --ephe "$TD_OHD_C_WORK/ephe"
```

TIME-A 若不与 v2 完全一致立即报错；TT 与 UT1 不满足 double 精度核对也立即报错。所有 preset 和组件组由父进程调用独立 subprocess，避免 Swiss 全局状态混用。官方 getter 在当前 C 版本没有把 selectors 写回 `samod`，所以读取其 `sdet` 描述中的 `-amod` 行。0 selector 按固定 header 的 DEFAULT 展开。

## EOP 与 Horizons

准备单独诊断 ephe 目录，保持旧 raw DE441 目录没有 EOP，便于验证缺文件退化。不要覆盖安装目录：

```sh
TD_OHD_V3_WORK=/tmp/td-ohd-root-cause-v3
mkdir -p "$TD_OHD_V3_WORK/ephe"
ln -s "$TD_OHD_C_WORK/ephe/de441.eph" "$TD_OHD_V3_WORK/ephe/de441.eph"
curl -fL https://data.iers.org/products/eop/long-term/c04_14/iau1980/eopc04_14.62-now -o "$TD_OHD_V3_WORK/c04.txt"
curl -fL https://maia.usno.navy.mil/ser7/finals.all -o "$TD_OHD_V3_WORK/finals.txt"
cp "$TD_OHD_V3_WORK/c04.txt" "$TD_OHD_V3_WORK/ephe/eop_1962_today.txt"
cp "$TD_OHD_V3_WORK/finals.txt" "$TD_OHD_V3_WORK/ephe/eop_finals.txt"
```

这两份远端文件会更新，**重新下载后的哈希未必与本次证据相同**。精确复现本次 full 模式需使用 [eop-provenance.json](eop-provenance.json) 标识的快照；使用更新数据时必须记录新的 SHA256、日期范围和结果，不覆盖本轮结论。核对 IAU1980 dPsi/dEps 列，而非 IAU2000 dX/dY。

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/capture.py --source "$TD_OHD_C_WORK/c-source" --library "$TD_OHD_C_LIB" --raw441 "$TD_OHD_C_WORK/ephe/de441.eph" --c04 "$TD_OHD_V3_WORK/c04.txt" --finals "$TD_OHD_V3_WORK/finals.txt" --installation-dist '/Users/abyssldx/Library/Application Support/OpenHumanDesign/app/dist'
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/run.py --phase horizons --library "$TD_OHD_C_LIB" --source "$TD_OHD_C_WORK/c-source" --ephe "$TD_OHD_V3_WORK/ephe" --guard-ephe "$TD_OHD_C_WORK/ephe"
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/compare.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/golden-reference/root-cause-v3/scripts/validate.py --source "$TD_OHD_C_WORK/c-source"
```

`capture.py` 会验证完整 C04 连续日序、全部九例的覆盖、文件哈希和出生日期前后原始行；本机路径和 8787 HTTP 核对只适用于这台安装，其他机器可直接运行计算而不运行该安装核对。上述脚本会重新生成 **v3 审计输出**，不改生产文件。最终全包 manifest 必须在更新报告后重新生成，不能把旧 manifest 当作新输出的验证。

DE405/406 和真正旧 Swiss source 本轮未执行。`--phase kernels` 仅预留有充分 preset 证据且准备了可信 kernel 后的诊断入口，不能把未执行的入口当作已完成证据。
