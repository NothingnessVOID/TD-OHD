# 第三对照源：SharpAstrology 作者官方 WebApp 实测

审计日期：2026-10-03。分支：`audit/natal-golden-reference`。

## 结论

用户指定的 **9 个案例均已通过官方网页表单实际输入并打开 Human Design 图表**。

**7 个 mismatch cases 全部属于 A：Sharp 官方 WebApp = TD-OHD 8787，二者 ≠ Jovian。**

两个负对照三方一致。没有 B 或 C 案例；七个 mismatch 中没有出现官方 WebApp 只修正部分案例的情况。

官方 WebApp 与 8787 的 **234 项 Gate.Line（9 × 26）逐项相同**，9 个 Profile 相同，化身十字身份也相同。与 Jovian 的激活差异仅为七例各自的 Personality Sun/Earth 两项，共 14 项；Design 的 117 项激活全部一致。

这证明同一批差异可以在作者自己的官方运行组合中复现，TD-OHD 独有封装或迁移并非复现这些差异的必要条件。它**尚未证明唯一根因**是某个常数、frame bias、ΔT 或星历版本；那些仍需独立的数值实验才能定案。

本轮没有修改任何生产计算、UI、8787 安装、时区规则或 Mandala offset，也没有合并 main 或部署。

## 证据与数据文件

- [observed-results.json](observed-results.json)：官方 WebApp 实际输出，全部 26 项激活、Profile、原样 Cross 名称、Design UTC 与输入显示。
- [comparison.json](comparison.json)：三方完整结构化对照、14 项差异、逐例分类、原样 Cross 文本和证据路径。
- [evidence/](evidence/)：每例输入 DOM、结果 DOM、结果截图，共 27 个文件。
- [activation-symbols.json](activation-symbols.json)：实际 DOM 行星 SVG，核对作者页面特有的行星排列。
- [page-assets.json](page-assets.json)：图表计算完成后浏览器实际观察到的资源 URL 清单。
- [asset-provenance.json](asset-provenance.json)：已观察 URL 的资源哈希、版本字符串和 DE441 header。
- [installation-verification.json](installation-verification.json)：本轮结束时 8787 的八项引擎/星历资产与上一轮哈希一致。
- [validation.json](validation.json)：482 项证据一致性检查通过；原有七项 Golden 失败仍然存在。

Jovian 与 8787 使用此前已保存的实际页面证据，本轮新增的是 Sharp 官方网页的九次实际操作。未通过源码计算、隐藏应用状态或直接调用计算 API 替代网页结果。

## 相同输入

九例地点均为 London, England, United Kingdom，IANA `Europe/London`。作者网页实际解析为 Greater London，坐标 `51.507446 / -0.127765`，结果页四舍五入为 `51.51 / -0.13`。

| Case | 当地出生日期与时间 | 历史总 UTC offset | 最终 UTC |
|---|---|---:|---|
| G1995-feb | 1995-02-22 01:08 | +00:00 | 1995-02-22 01:08Z |
| G1995-jun | 1995-06-22 00:43 | +01:00 | 1995-06-21 23:43Z |
| G2005-jul20 | 2005-07-20 22:40 | +01:00 | 2005-07-20 21:40Z |
| G2015-tight | 2015-01-26 01:20 | +00:00 | 2015-01-26 01:20Z |
| G2015-feb | 2015-02-04 06:56 | +00:00 | 2015-02-04 06:56Z |
| G2025-tight | 2025-01-19 22:57 | +00:00 | 2025-01-19 22:57Z |
| G2025-mar | 2025-03-15 18:56 | +00:00 | 2025-03-15 18:56Z |
| G1985-tight | 1985-01-25 18:34 | +00:00 | 1985-01-25 18:34Z |
| G2005-jul11 | 2005-07-11 02:47 | +01:00 | 2005-07-11 01:47Z |

每例输入 DOM 保存了网页解析出的完整 UTC 日期、基本 offset 与夏令时 offset；校验脚本另用 IANA 历史规则核对。夏令时三例也一致，没有引入真太阳时修正。

## 三方 Sun / Earth / Profile

每格格式：`Personality Sun / Earth；Design Sun / Earth；Profile`。

| Case | Jovian | Sharp 官方 WebApp | TD-OHD 8787 | 分类 |
|---|---|---|---|---|
| G1995-feb | 55.4 / 59.4；34.6 / 20.6；4/6 | 55.3 / 59.3；34.6 / 20.6；3/6 | 55.3 / 59.3；34.6 / 20.6；3/6 | A |
| G1995-jun | 15.3 / 10.3；25.5 / 46.5；3/5 | 15.2 / 10.2；25.5 / 46.5；2/5 | 15.2 / 10.2；25.5 / 46.5；2/5 | A |
| G2005-jul20 | 56.3 / 60.3；3.5 / 50.5；3/5 | 56.2 / 60.2；3.5 / 50.5；2/5 | 56.2 / 60.2；3.5 / 50.5；2/5 | A |
| G2015-tight | 41.5 / 31.5；44.1 / 24.1；5/1 | 41.4 / 31.4；44.1 / 24.1；4/1 | 41.4 / 31.4；44.1 / 24.1；4/1 | A |
| G2015-feb | 13.3 / 7.3；1.5 / 2.5；3/5 | 13.2 / 7.2；1.5 / 2.5；2/5 | 13.2 / 7.2；1.5 / 2.5；2/5 | A |
| G2025-tight | 60.5 / 56.5；28.1 / 27.1；5/1 | 60.4 / 56.4；28.1 / 27.1；4/1 | 60.4 / 56.4；28.1 / 27.1；4/1 | A |
| G2025-mar | 36.4 / 6.4；11.6 / 12.6；4/6 | 36.3 / 6.3；11.6 / 12.6；3/6 | 36.3 / 6.3；11.6 / 12.6；3/6 | A |
| G1985-tight | 41.4 / 31.4；44.1 / 24.1；4/1 | 41.4 / 31.4；44.1 / 24.1；4/1 | 41.4 / 31.4；44.1 / 24.1；4/1 | 负对照一致 |
| G2005-jul11 | 53.4 / 54.4；42.1 / 32.1；4/1 | 53.4 / 54.4；42.1 / 32.1；4/1 | 53.4 / 54.4；42.1 / 32.1；4/1 | 负对照一致 |

### Incarnation Cross

下表 Sharp 名称直接来自页面；省略开头的 `The` 仅用于紧凑排版，JSON/DOM 保留原样。TD 的 raw ID 来自已有数值诊断；两个负对照用现有中文页面证据。四个 Gate 在三方全部相同。

| Case | Jovian Cross | Sharp 官方 Cross | TD-OHD 8787 身份 | 比较 |
|---|---|---|---|---|
| G1995-feb | Right Angle Cross of The Sleeping Phoenix | Right Angle Cross of the Sleeping Phoenix | RightAngleCrossOfTheSleepingPhoenix | 同一角度、家族、四 Gate |
| G1995-jun | Right Angle Cross of The Vessel of Love | Right Angle Cross of the Vessel of Love 2 | RightAngleCrossOfTheVesselOfLove2 | 同一角度、家族、四 Gate；Jovian 未显示数字 2 |
| G2005-jul20 | Right Angle Cross of Laws | Right Angle Cross of Laws 2 | RightAngleCrossOfLaws2 | 同一角度、家族、四 Gate；Jovian 未显示数字 2 |
| G2015-tight | Left Angle Cross of The Alpha | Juxtaposition Cross of Fantasy | JuxtapositionCrossOfFantasy | Jovian 不同；Sharp = TD |
| G2015-feb | Right Angle Cross of The Sphinx | Right Angle Cross of the Sphinx | RightAngleCrossOfTheSphinx | 同一角度、家族、四 Gate |
| G2025-tight | Left Angle Cross of Distraction | Juxtaposition Cross of Limitation | JuxtapositionCrossOfLimitation | Jovian 不同；Sharp = TD |
| G2025-mar | Right Angle Cross of Eden | Right Angle Cross of the Eden | RightAngleCrossOfTheEden | 同一角度、家族、四 Gate |
| G1985-tight | Juxtaposition Cross of Fantasy | Juxtaposition Cross of Fantasy | 并列化身十字之幻想 | 同一身份 |
| G2005-jul11 | Juxtaposition Cross of Beginnings | Juxtaposition Cross of Beginnings | 并列化身十字之开始 | 同一身份 |

两个 Cross 身份差异对应 Profile 的 `4/1 → 5/1` 差异；未把英文冠词、大小写、变体编号显示差异误算成 Gate / 计算差异。

## 官方 WebApp 的实际引擎与星历

从浏览器观察到的部署 WASM URL 下载到本地临时目录，仅检查版本字符串和哈希，未执行它们进行替代计算。三项核心程序集的版本与源提交均与 8787 所用包相同：

| 核心包 | 部署程序集版本字符串 |
|---|---|
| Base | 0.14.0+b029ea0a57fabf84b0d0209aa8d6871b6e64a41c |
| SwissEph | 0.5.1+342a57997c1b987e7949acc98897c8b73d05939a |
| HumanDesign | 1.2.0+8b78031ce9a4244b8eb0a4ce37e612b8d6782570 |

官方部署 `AppData/ephemeridesSettings.json` 为 `Source: Swiss`。浏览器实际观察到下载六个 `.se1` 文件，覆盖 1200–2399；九例使用 1800–2399 区块。文件头均为 `SWISSEPH 3`、DE441、**2026/04/18** 创建。

8787 的相关文件是 **2026/05/26** 创建的 DE441：

| 文件 | 作者官方 WebApp SHA-256 | TD-OHD 8787 SHA-256 |
|---|---|---|
| sepl_18.se1 | b8e657c1f5a9c51821ef973baf233a3c07137101e35b95e00ac0e9eeea7fbeb8 | ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66 |
| semo_18.se1 | 7034c7825a0fef2f660d99161aa8e60429adfa315d269ac68042ef5a5e6319bf | 1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7 |

这是不同二进制构建，不能简写成“DE441 所以相同”。实际页面证明：在这九个分钟级输入上，不同构建仍产生相同 26 项 Gate.Line。**不代表两份文件在所有时间的黄经数值完全相同，也不代表文件版本对其他边界没有影响。**

源代码参照提交：[e217ca3](https://github.com/CReizner/SharpAstrology.WebApp/tree/e217ca3bc05b679b07920c33ae2097021ff44d09)，本轮 `git ls-remote` 确认仍为作者仓库 main。部署 WebApp 自身的精确源提交未从部署元数据确认，因此将它标为未知，没有把源码 HEAD 自动当作部署提交。

## 实际操作与复现

1. 打开 [作者官方 WebApp](https://creizner.github.io/SharpAstrology.WebApp/)。
2. 工具栏 `+` 创建 person；使用 Case ID 作为合成测试名称。
3. 输入日期 `YYYY/MM/DD`、时间 `HH:mm`、Country `United Kingdom`、City `London`。
4. 点击 `Check place`；核对 Europe/London 与完整 UTC 日期/时间，再创建。
5. 默认打开占星图。关闭已缓存的 Database 标签，用工具栏数据库按钮重新打开列表，点击该行的 **HD 图标**，进入 Human Design 页面。
6. 保存 Evaluation 和激活列 DOM，并截图；逐项对照上述 JSON。

表单注意：本次浏览器操作中直接 `.fill()` 可能仅改变可见字段，Blazor 内部绑定值仍为空。实际使用逐字符键盘事件并 `Tab` 离开字段；只有 `Check place` 显示正确出生 UTC 后才提交。日期、时间、Country、City 与结果页输入均有证据。

激活顺序也必须按页面核对。作者页面左列 Design、右列 Personality，行序为：Sun、Earth、North Node、South Node、Moon、Mercury、**Uranus**、Venus、Mars、**Neptune**、Saturn、Jupiter、Pluto。Uranus 使用圆点加向上箭头的另一种符号。TD 和 Golden JSON 的键不靠相同数组位置猜测；`activation-symbols.json` 留存了实际 SVG。

截图 API 即使请求 fullPage，实际返回仍是 `903×703` 的 JPEG 视口图。因此截图只作为 Evaluation/输入与图表现场证据；**完整 26 项的依据是每例结果 DOM**，没有把视口截图宣称为全页图。

### 校验命令

```bash
python3 docs/golden-reference/sharp-webapp/validate-and-compare.py
python3 docs/golden-reference/tools/validate-evidence.py
python3 docs/golden-reference/tools/verify-manifest.py
```

新增脚本无网络访问、无引擎调用，从已有 DOM、九例 observed JSON、既有 Jovian/8787 证据生成 comparison/validation。校验覆盖输入、IANA UTC、26 项 DOM 映射、太阳爻线与 Profile、截图格式、核心包版本、DE441 版本不同等。482 项全部通过。此前 1596 项证据一致性检查继续通过。

通过的是**审计证据一致性**，不是“计算已经修好”。Golden reference 的七例失败仍保留，原 `golden-cases.json` 没有改动。

## 下一步范围与限制

本轮已完成用户要求的作者官方运行组合复现，停在证据层。后续若授权继续定位，应优先针对上游 Sharp/SwissEph 运行组合与 Jovian 的数值差异做实验，包括已有 frame bias 候选、ΔT 与独立星历验证。

这批实际输出不支持“作者官方 WebApp 能对齐 Jovian，只有 TD-OHD 迁移出错”的 B 假设。仍不能据此忽略独立核对配置，也不能未经 Golden 回归直接改 offset、添加时间修正或把不同年代的差异归于一个未经验证的原因。

未触碰 UI、知识资料、关系/团队计算；未修改出生地点精度；未读取老师教材；完整 Swiss 二进制、WASM 与临时下载仅保留本地，Git 只提交证据、版本/哈希、校验脚本和报告。
