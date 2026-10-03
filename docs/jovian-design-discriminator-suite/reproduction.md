# 复现步骤与边界

工作目录为本研究仓库根目录。冻结 V1 的提交为 `e29caef`；基础提交为 `d3693d4942a23e043fa75efd84287f7393656f78`。保留 `research/jovian-design-discriminator-suite-v1` 分支。下列命令读取冻结文件，运行时、重新搜索和校验输出写入 `/tmp`。不要把重新搜索或封存的输出目录指定为已冻结的 `docs/jovian-design-discriminator-suite`。

## 1. 原生运行时

需要 Python 3.12+、curl、clang 或 cc。完整资产 URL、大小、SHA-256 在 `docs/ra-era-astronomy-stack/acquisition-manifest.json`；源代码、星历与共享库保存在仓库外。需要全部资产，包括约190 MiB 的 `de406.eph`，因此不能使用 `--skip-jpl`。

```sh
export PYTHONDONTWRITEBYTECODE=1
unset SE_EPHE_PATH
python3 -B docs/jovian-discriminator-suite/scripts/reproduce.py \
  --runtime /tmp/ra-era-research \
  --output /tmp/jdd-inherited-native-reproduction \
  --prepare
```

这个继承入口调用历史 `prepare(runtime, False)` 与 `build()`：按 manifest 下载、检查资产哈希和大小、核对 DSC 中的源码包哈希、解包核对版本宏，再构建真实 1.76、1.77、2.10 及明确标记的实验库。它随后回放上轮冻结28例，核对输出及所有取得资产。不会修改继承文档。下载地址当前可达性并未由本次文档复核重新验证。

已准备好的 `/tmp/ra-era-research` 可以直接用于后续步骤。重新编译的库哈希依赖平台、编译器、工具链；冻结 V1 校验要求字节级相同的库哈希。跨平台或更换编译器后，即使数值接近，也不能宣称通过同一 V1 封存校验，应保留独立构建记录。本轮源码包与数据包均不纳入仓库。

## 2. 继承的已有官方证据

```sh
python3 -B docs/jovian-design-discriminator-suite/scripts/existing_evidence.py \
  --runtime /tmp/ra-era-research
```

该脚本没有 `--output` 参数。它从已保存的历史研究材料归一化，写入本套件的 `existing-official-records.json`、`existing-design-discriminators.json`，并以每模型独立子进程生成回顾性预测。它读取已知官方输出，所以属于 retrospective evidence；不能把这些记录计入新的盲测。运行前后可检查 `git diff`，这些输出不属于预测封存锁。

## 3. 重新搜索，仅用于独立 scratch 结果

当前设计搜索复用了旧 Personality transition 日期作为种子，而不是直接复用旧 Personality 分歧。先重建种子池：

```sh
mkdir -p /tmp/jdd-research-replay/screen /tmp/jdd-research-replay/full
python3 -B docs/jovian-discriminator-suite/scripts/search.py scan \
  --runtime /tmp/ra-era-research \
  --output /tmp/jdd-research-replay/personality-transition-seeds.json
python3 -B docs/jovian-design-discriminator-suite/scripts/search.py scan \
  --runtime /tmp/ra-era-research \
  --seeds /tmp/jdd-research-replay/personality-transition-seeds.json \
  --output /tmp/jdd-research-replay/search-pool.json
for model in C1 C2 C3 C4 C5 C6; do
  python3 -B docs/jovian-design-discriminator-suite/scripts/search.py evaluate \
    --runtime /tmp/ra-era-research --model "$model" \
    --pool /tmp/jdd-research-replay/search-pool.json \
    --output "/tmp/jdd-research-replay/screen/$model.json"
done
python3 -B docs/jovian-design-discriminator-suite/scripts/search.py select \
  --pool /tmp/jdd-research-replay/search-pool.json \
  --screen /tmp/jdd-research-replay/screen \
  --output /tmp/jdd-research-replay/full-pool.json
for model in C1 C2 C3 C4 C5 C6; do
  python3 -B docs/jovian-design-discriminator-suite/scripts/search.py evaluate \
    --runtime /tmp/ra-era-research --model "$model" --full \
    --pool /tmp/jdd-research-replay/full-pool.json \
    --output "/tmp/jdd-research-replay/full/$model.json"
done
python3 -B docs/jovian-design-discriminator-suite/scripts/seal.py \
  --work /tmp/jdd-research-replay --runtime /tmp/ra-era-research \
  --output /tmp/jdd-research-replay/new-draft
```

以上均为实际 CLI 参数。最后一条不带 `--seal`，仅准备新草稿；再次运行时应换新的输出目录，因为脚本拒绝覆盖。上轮 scan 对慢行星连续扫描，对快速天体只扫描每年1月、7月前14天，所以搜索并非1980–2030所有出生分钟的穷举。

搜索 Newton 仅用于 C2 Design 爻线边界与太阳 +88° 的逆映射、以及初筛。正式 `--full` 预测经 `research_models.chart()` 直接调用不可变的 `Model.chart()` 和 `Native.design()` 原64轮二分根算法。每个模型在独立 Python 进程中运行，避免历史原生库全局状态冲突。完整记录13项 Personality、13项 Design、Profile、边界距离和±1/±5秒敏感度。

## 4. 固定 V1 输入回放与冻结前修正

V1 初选28分钟保持不变，正式封存前以原二分算法重算所有六模型及四次秒扰动；不根据官方输出重选。Newton 与二分根的最大时间差约40微秒，Gate.Line、Profile及所有敏感度分类均未改变。正式预测以二分值为准。

将冻结输入写成 worker pool，再逐模型回放：

```sh
mkdir -p /tmp/jdd-fixed-replay
python3 -B - <<'PY'
import json
from pathlib import Path
cases=json.loads(Path('docs/jovian-design-discriminator-suite/design-discriminator-cases.json').read_text())['cases']
Path('/tmp/jdd-fixed-replay/pool.json').write_text(json.dumps({'points':[{'utc':c['birthUtc'],'triggers':[]} for c in cases]},indent=2)+'\n')
PY
for model in C1 C2 C3 C4 C5 C6; do
  python3 -B docs/jovian-design-discriminator-suite/scripts/search.py evaluate \
    --runtime /tmp/ra-era-research --model "$model" --full \
    --pool /tmp/jdd-fixed-replay/pool.json \
    --output "/tmp/jdd-fixed-replay/$model.json"
done
```

本次封存使用已审查的 `/tmp/jovian-design-discriminator/draft-bisection-28`，该临时草稿名称与文件名是历史执行现场，不保证未来机器存在。它含 `cases.json`、`predictions-sealed.json`、`search-summary.json`，预测含继承来源哈希。固定草稿封存 CLI 的实际形式为：

```sh
python3 -B docs/jovian-design-discriminator-suite/scripts/seal.py \
  --fixed-draft /tmp/jovian-design-discriminator/draft-bisection-28 \
  --runtime /tmp/ra-era-research \
  --output /tmp/jdd-fixed-replay/seal-copy --seal
```

该命令仅在草稿确实存在时适用，输出必须使用全新 scratch 目录。它不重选案例，检查固定28例ID与UTC的双射、原二分根标签、库哈希、flags、继承脚本及资产哈希，再使用新冻结时间写入 `design-discriminator-cases.json`、`design-predictions-sealed.json`、`search-summary.json` 和 `SHA256SUMS.json`。新复制封存有新时间；本轮官方证据继续只对应原 V1 封存时间，不能用复制封存替换其来源关系。

## 5. 独立数值与封存校验

```sh
python3 -B docs/jovian-design-discriminator-suite/scripts/verify.py \
  --suite docs/jovian-design-discriminator-suite \
  --runtime /tmp/ra-era-research \
  --output /tmp/jdd-v1-independent-verification.json \
  --require-seal
```

该入口校验新旧封存、继承文件、原生库及全部取得资产；要求研究分支、基线祖先关系、仓库改动限于本套件新文档。每个模型另起原生 worker，独立重算冻结28例，核对4368项激活、黄经、Design TT根、Profile及四组秒敏感度。`--predictions PATH`、`--cases PATH` 可指定草稿，但省略时自动读取正式 design 文件名；草稿核验不带 `--require-seal`。本步骤没有官方评分。

## 6. 官方证据完成后的比较

```sh
python3 -B docs/jovian-design-discriminator-suite/scripts/compare.py
```

`compare.py` 没有 CLI 参数；固定读取本套件正式 design 文件、`official-results.json`、`existing-official-records.json` 及证据哈希manifest，写入未封存的 `comparison.json`、`validation.json`。需要完整28个不同ID与UTC，每个可用平台每例两次稳定采集，采集时间晚于原封存，且新UTC不能与继承官方UTC重叠。未完成全部官方采集时不要运行最终评分。证据manifest和独立原生报告缺失时脚本拒绝最终通过；来源证明仍应单独审查，不能将脚本退出成功当作原始证据真实性的替代品。

## 两种 Design 时钟

`designTtJd` 是同一模型中太阳回退88°的二分根。`designModelUt1Jd` 由该库原有 ΔT 反解，`designModelUt1NumericClock` 是无Z的数值日历标签；在 `utc-as-ut1` 模型中可用作反向调用的数值输入时钟，不宣称民用UTC，也不等于IERS实测UT1。

`designCivilUtcFromTt`（同时保留继承字段 `designUtcFromTt`）通过完整闰秒表由TT转换为民用UTC。预测的两个时钟都不代表已观测的官方DesignDate。官方未标注时区的历史日期只能保留为显示标签，不能自行认作UTC。本轮可见Jovian图面没有取得DesignDate；未来闰秒也不能预先确认。

## 可复现性限制

原预测关键脚本、继承模型脚本和资产哈希已经封存；下载服务可达性及相同工具链构建不是封存保证。完整搜索池、逐模型初筛与462例fullpool保存在临时目录，未入Git。可以按上文再生候选池，精确V1复现应使用已冻结28输入及原二分算法，而非从新搜索结果重新挑28例。

封存的 `sourceProvenance` 与 `SHA256SUMS.json` 锁定资产来源；临时草稿丢失不影响冻结输入及数值校验，但精确回放原封存操作需要保留该草稿或另行明确构造新的草稿。分歧样本是有意选取的鉴别集，评分不估计普通人群准确率，也不能仅由离散Gate.Line相同唯一识别官方内部算法。

## 页面值转录与最终完整性

`python3 -B docs/jovian-design-discriminator-suite/scripts/import_official.py` 只读独立DOM转录，不读预测；认证浏览器导出checksum并生成正式JSON、56条值和证据SHA清单。`python3 -B docs/jovian-design-discriminator-suite/scripts/report.py` 由保存结果生成README、case-table及不含预测的manual pack。

```sh
python3 -B docs/jovian-design-discriminator-suite/scripts/postcollection_integrity.py \
  --complete --output /tmp/jdd-v1-postcollection-integrity.json
```

该独立检查逐字段核对DOM转录→56观察→official JSON，另算26/13项匹配与成对胜负，验证来源哈希和封存。检验离散数值而不拟合候选。保存的 `native-verification.json` 为完整原生核验报告去除重复预测后的摘要，原生worker全值可以重新输出到/tmp。
