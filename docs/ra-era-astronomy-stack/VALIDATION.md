# 验证记录

执行日期：2026-10-03。macOS arm64，Apple clang17，Python3.12；所有native库独立进程。结果见 [validation.json](validation.json)。

## Passed

- 实际下载并构建Swiss1.76.00、1.77.00、2.10.03。检查archive SHA-256、bytes、版本宏和运行时version；两份DSC公布的archive SHA-256一致，未做PGP验签。
- 30种实际组合，共378条case计算、9,828项activation记录。检查数字有限、Gate/Line合法、Personality/Design各13项、完整差异列表及match count可独立重算。
- 每个native调用返回flags严格等于请求flags，error buffer为空；无Moshier fallback。Swiss路径从实际planet/moon file metadata核验406/431/441，JPL路径从JPL metadata核验406。现代Swiss使用se1文件时`swed.jpldenum`保持0是正常行为，不误判为未加载数据。
- 所有Design太阳弧与88°误差小于1e-8°；实测最大 **4.646949491871055e-10°**。每例保留出生/Design TT和模型UT1及民用UTC转换语义。
- `utc-as-ut1`每例重新调用真正native `swe_calc_ut()`；与等价TT调用Sun差小于1e-10°。
- 1.76、1.77正确TT：A–E各2/5；完整旧UTC转换各4/5；UTC数值传UT1各5/5、九例9/9、45条45/45。
- 扩展45条具有40个唯一UTC，包含重复采集。没有将重复记录包装成独立样本。
- 模型1976/1980实验的五例5/5和九例7/9同时记录，不能只报前者。
- 固定角offset所需区间交集为空；官方精确longitude未知字段保留null，没有伪造残差。
- 1.77八个关键文件与独立旧mirror逐字节一致；Moshier源文件差异保留。错版tag明确排除，1.70没有制造数值结果。
- 所有30组合在第二次从归档重新构建、独立进程复跑后，**结果JSON精确相同**。该精确复跑结论限定本次相同机器/编译环境，不是跨平台bitwise保证。
- 基线Golden JSON、myBodyGraph平台Golden JSON及冻结mapping逐字节未改；tracked diff限于`docs/ra-era-astronomy-stack/`。
- 限定提交格式md/json/py/自有只读C探针，没有第三方源码、星历、PDF、共享库、数据库、账号response或临时日志；扫描私有home路径及credential payload。合成Golden cases保留。

`checkCount`统计循环内断言次数，约2.6万；不是2.6万个独立测试案例。新增文档自身进入扫描后该数会略变，不影响数值结论。

## Skipped / unavailable

- Swiss1.70：未取得可验证原源码，未构建、未测试。
- 原2010/2011 Horizons代码、历史EOP和SOFA2009源码：未闭合完整historical pipeline，不声称已复原。
- 官方精确longitude、Color/Tone/Base、秒级transition及官方Design timestamp：未披露或没有本轮可用证据，不以Gate.Line相同替代验证。
- Linux：脚本提供编译分支，但本轮未实跑。
- `npm test`、UI/E2E、生产build：本轮没有修改任何生产代码/页面，未运行；验证的是研究脚本与native计算，不宣称生产测试已重新通过。
- main合并、8787升级、正式缓存生成、部署：没有执行。

## 可复现命令

完整再跑时建议把输出放到仓库外，避免覆盖已归档结果。需要约200MiB第三方下载空间，必须遵守各资产原许可。

```bash
python3 docs/ra-era-astronomy-stack/scripts/reproduce.py \
  --runtime /tmp/ra-era-reproduction \
  --output /tmp/ra-era-reproduction-results
python3 docs/ra-era-astronomy-stack/scripts/analyze.py \
  --results /tmp/ra-era-reproduction-results \
  --output /tmp/ra-era-analysis.json
python3 docs/ra-era-astronomy-stack/scripts/validate.py \
  --runtime /tmp/ra-era-reproduction \
  --recheck-results /tmp/ra-era-reproduction-results \
  --output /tmp/ra-era-validation.json
```

`--skip-jpl`跳过大文件及直接JPL实验，需要明确标记部分运行；完整validator要求30组合，不能把skip称为完整验证。
