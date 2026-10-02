# TD-OHD Golden 审计：独立最终复核

审查日期：2026-10-02。审查范围：已保存的浏览器可见证据、固定安装版本 8787 的源码与文件指纹、固定 NuGet 源码、独立原始 C Swiss 数值诊断。安装版本、生产源码、原有报告正文均保持不动。

## 1. 可以采用的结论

**在 SharpAstrology.SwissEph 0.5.1 的普通 Sun/planet 校正路径中，已确认缺少原始 C Swiss 默认路径的 ICRS → J2000 frame-bias 步骤。** 这是相对于 C 2.10.03 默认 flag 语义的一处局部兼容性缺陷，证据不限于外部产品的离散爻值：精确源码缺少该调用；安装数据的 DE441 条件满足；Sharp flags 258 与加上 ICRS 的 131330 得到相同 Sun 数值；独立 C 131330 与 Sharp 258 的 Sun 数值一致，C 258 则不同。

**不能把这一个步骤称为全部 Jovian 差异的根因。** 在本轮相同 DE441 数据、相同直接 civil-JD 输入与固定 gate/line 算法的诊断中，换用原始 C 258 后，7 个真实浏览器差异中的 2 个 Gate.Line 与 Profile 对上；另外 5 个仍有 Personality Sun/Earth 爻差。这里还没有实现、运行或验收一个修复版 WASM。

## 2. 8787 基线与 ephemeris 条件

安装目录：`<LOCAL_INSTALL>`。安装元数据 commit：`7734b942160497c1c28d46002de0edd91df53230`。实际加载的 engine 资源由 dotnet.js 的内嵌运行配置确认，具体文件 SHA256 见同目录 `provenance.json` 与 `installed8787-dotnet-config.json`；没有把目录里闲置旧文件误当作已加载版本。

实际包版本及 NuGet repository commit：

| Package | Version | Exact commit |
| --- | --- | --- |
| SharpAstrology.SwissEph | 0.5.1 | `342a57997c1b987e7949acc98897c8b73d05939a` |
| SharpAstrology.HumanDesign | 1.2.0 | `8b78031ce9a4244b8eb0a4ce37e612b8d6782570` |
| SharpAstrology.Base | 0.14.0 | `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c` |

已读取安装 `dist/engine/ephe` 的原始文本头与 binary DE number，两份文件都写明 2026/05/26 创建、基于 **DE441**，binary number 也为 **441**。当前文件不能写作 DE431。

| File | Bytes | SHA256 |
| --- | ---: | --- |
| sepl_18.se1 | 484061 | `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66` |
| semo_18.se1 | 1304771 | `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7` |

这些 hash 与生产 ephemeris manifest 的固定上游 commit `3186eed405bd2b4ff520c91d0b27bb25e9d75106` 一致。原始 C 的 Sun 校正条件为未设置 ICRS 且所用 DE number ≥ 403；DE441 满足这个条件。[原始 C Sun 校正路径](https://github.com/aloistr/swisseph/blob/175e1fcb3108bcd5c0d146c803f51dcf23508012/sweph.c#L4051)

## 3. 七个真实浏览器案例复核

我逐一核对 `browser-evidence/<id>.json`、`td8787-<id>.json`、官方前后一分钟 JSON 与已保存 DOM。下表使用官方页面显示的 UTC；六月、七月 London 的夏令时已换算，8787 输入使用相应 +1 offset。

| ID | UTC | 8787 P Sun / Profile | Jovian P Sun / Profile | 同 DE441 原始 C258 |
| --- | --- | --- | --- | --- |
| G1995-feb | 1995-02-22 01:08 | 55.3 / 3/6 | 55.4 / 4/6 | 仍为 55.3 / 3/6 |
| G1995-jun | 1995-06-21 23:43 | 15.2 / 2/5 | 15.3 / 3/5 | 15.3 / 3/5 |
| G2005-jul20 | 2005-07-20 21:40 | 56.2 / 2/5 | 56.3 / 3/5 | 56.3 / 3/5 |
| G2015-tight | 2015-01-26 01:20 | 41.4 / 4/1 | 41.5 / 5/1 | 仍为 41.4 / 4/1 |
| G2015-feb | 2015-02-04 06:56 | 13.2 / 2/5 | 13.3 / 3/5 | 仍为 13.2 / 2/5 |
| G2025-tight | 2025-01-19 22:57 | 60.4 / 4/1 | 60.5 / 5/1 | 仍为 60.4 / 4/1 |
| G2025-mar | 2025-03-15 18:56 | 36.3 / 3/6 | 36.4 / 4/6 | 仍为 36.3 / 3/6 |

各例 Design Sun 都一致。各例已保存的官方前一分钟显示旧爻、后一分钟显示新爻。2015 tight 同输入四次（原案例、repeat A、repeat B、final proof）始终为 41.5；1985 控制同输入三次始终为 41.4。这支持记录本轮输出稳定，不能据有限重复宣称所有情况下永久确定。

7 个实际 8787 Sun pair 都与 pinned native Sharp 诊断一致。因此本报告的“真实页面差异”有独立于 native 等效假设的浏览器证据。原始 C258 全 26 个 Gate.Line 诊断仅在 G1995-jun、G2005-jul20 两例全部对上；剩余五例各仅 Personality Sun 与相反 Earth 有爻差。全 26 个 Gate.Line 对上仍不能自动等同于 Variable、Color/Tone/Base、设计求根精度与所有 foundation 属性已验收。

计数范围提醒：审查时目录已有 47 个官方 26-activation JSON 和 9 个 8787 JSON。`seven-case-standard-frame-results.json` / `all-official-sun-offset-constraints.json` 的数值计算采用较早 32 条官方记录、28 个 unique UTC 的快照；新增前后分钟和 final proof 在本次人工/程序复核中读过，但未全部纳入那个数值快照。报告应分别标明这两个范围。

## 4. Frame-bias 的原理与精确源码位置

可以将 ICRS 与传统 J2000 坐标轴理解成两把刻度几乎相同、方向略有差别的尺。epoch 名称 J2000 并不意味着两套轴完全重合。DE441 的 raw 向量使用 ICRS 方向；默认 C 输出在进入岁差与章动前做一次很小的三维旋转。漏掉旋转不会在普通日期产生整度误差，但在本轮恰好离爻界只有百万分之几度的输入，会改变离散结果。它是向量转换，不能用统一加一个太阳黄经常数替代。[Swiss 官方 flag 说明](https://www.astro.com/swisseph/swephprg.htm)，[原始 C bias helper](https://github.com/aloistr/swisseph/blob/175e1fcb3108bcd5c0d146c803f51dcf23508012/swephlib.c#L2204)

所有 Sharp 链接均固定到 NuGet 0.5.1 的 repository commit：

| 函数/文件 | 位置 | 审查要点 |
| --- | --- | --- |
| `CorrectionPipeline.Apply<TFetcher>` | [L65](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Application/Bodies/CorrectionPipeline.cs#L65) | 普通 Sun/planet 入口；L322–337 aberration 后直接进入 L343 precession，缺少 bias |
| `CorrectionPipeline.ToJ2000Equator` | [L481](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Application/Bodies/CorrectionPipeline.cs#L481) | L494–498 将 J2000-equator raw frame 直接复制；这里不宜加入无条件转换 |
| `SwissEphBodyPositionSource.ComputeSunBarycentric` | [L122](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Infrastructure/SwissEph/SwissEphBodyPositionSource.cs#L122) | 读取 .se1 后返回 raw barycentric frame；未做 bias |
| `BodyStateFrame` | [L56](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Application/Bodies/BodyState.cs#L56) | 注释把 raw J2000-equator 与 ICRS axes 并列；不能据名称断言已转成传统 J2000 |
| `CatalogFrameTransforms.IcrsBias` | [L128](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Domain/Frames/CatalogFrameTransforms.cs#L128) | 已存在可复用 helper；`backward:false`，应按 Speed 旋转速度，按模型尊重 None |
| `AstronomicalModelOverrides.FrameBias` | [L126](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Domain/Frames/AstronomicalModelOverrides.cs#L126) | 默认 Iau2006；不能绕过已有模型选择 |
| `Se1FileReader` / `Se1Header` | [reader L335](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Infrastructure/SwissEph/Se1FileReader.cs#L335)，[header L105](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Infrastructure/SwissEph/Se1FileFormat.cs#L105) | 已读取 DE number，现有 BodyState 未携带这个 metadata |
| `PlanetocentricService` | [L277](https://github.com/CReizner/SharpAstrology.SwissEph/blob/342a57997c1b987e7949acc98897c8b73d05939a/Application/Bodies/PlanetocentricService.cs#L277) | 别的路径已经做 bias，可参考；不能再次重复旋转 |
| 原始 C `app_pos_etc_sun` | [L4051](https://github.com/aloistr/swisseph/blob/175e1fcb3108bcd5c0d146c803f51dcf23508012/sweph.c#L4051) | bias 在 aberration 后、保存 J2000 与 precession 前；planet 同类位置在 L2755 |

本轮 90 个 native 控制样本中，Sharp 默认 258 与 C131330 Personality Sun 最大差约 `2.27e-13°`；Design Sun 对齐其被截到毫秒的有效输入后最大差约 `4.65e-10°`。它们支持把本轮 Sun 主要 astronomy 差异定位到这一缺失转换，而不能扩展成所有天体/年代/flags 的完整精度证明。

两例 tight 上 C258 比 Sharp 黄经大约 `1.885e-6°`，相当于这两瞬间约 0.161 秒的太阳运动；C258 的边界仍分别在 exact minute 后约 0.110194 秒与 0.095095 秒。所以这个转换本身没有让两例 tight 的官方结果对上。

## 5. 后续最小修复建议：仅方案，没有实施

修复对象应先限定为 package 的这一个校正步骤。建议在 `CorrectionPipeline.Apply` 的 L343 precession 之前调用已有 `CatalogFrameTransforms.IcrsBias`，位置与原始 C 保持一致；不修改 HumanDesign offset、floor 算法、Profile 映射或 UI 显示。

必要条件：

1. 未设置 `EphemerisFlags.Icrs` 时才转换。ICRS 模式应保留与 C131330 的数值关系。
2. 对已确认 ICRS raw 数据且适用 DE≥403 的来源转换。本安装 DE441 条件已证实；可泛化的 package 修复应传递/查询有效 source 与 DE metadata，并遵守 C `swi_get_denum` 的规则（含它对 Moshier 返回 403 的语义），不能只依赖模糊的 frame enum 名称或无条件给全部 sources 加旋转。
3. 使用 `_models.FrameBias`，方向 `backward:false`，Speed 请求时同样旋转速度。`FrameBiasModel.None` 应保持原数值；J2000 输出虽跳过岁差，仍需要先处理 bias。
4. 不在 raw source、`ToJ2000Equator` 与既有 lunar/star/planetocentric 路径重复转换。先核实输出链和 source contract，再采用最小插入。
5. 在隔离构建中先做原始 C parity 检查，覆盖默认258、ICRS、J2000、None/IAU 模型与位置/速度；再用真实 WASM 重跑上述7例与相邻分钟、既有控制。不要将 C 替代计算的2例匹配写成已发布修复验收。

如果后续决定更换 ephemeris 数据，应作为独立候选变更记录旧/新 header、hash 与数值。官方历史 DE431 的可靠候选出处为 [b51a083 commit](https://github.com/aloistr/swisseph/commit/b51a083390bf3cdc93a6ba466cbc83b846c4cfc4)（公开 commit message 明确回退 DE431）下 `ephe/sepl_18.se1` / `semo_18.se1`；更早 [ad0935c commit](https://github.com/aloistr/swisseph/commit/ad0935c2993405b57db161240e0af7e451840efd) 也保留旧数据。其内容必须另查 header/hash，不能根据 message 就认定全部数值和官方服务配置。本审查没有改变当前 DE441 安装。

## 6. 报告需避免的过度断言

- “官方 server 算错”或“本地已绝对正确”：服务内部 engine、ephemeris、时间尺度与精度未公开。本轮证明的是两产品结果有差异，以及本地相对原始 C 有具体缺口。
- “Sharp 0.5.1 是 Swiss C2.08 port”：exact README L5 声明目标 C2.10.3；package 表中的旧 SwissEphNet 字样不足以证明2.08。
- “秒/毫秒残留造成随机跳爻”：已观察到的官方 public widget formatter 明确清零秒和毫秒；2015重复结果稳定。专门 ISO 参数的源码路径可确认，实际网络请求和服务选用字段未在本任务中验证。
- “Profile 被 adapter 改写”或“缓存导致这7例”：安装 adapter 保留 activation.line 与 raw.profile，缓存 key 含出生分钟和offset；新页面按次计算的真实证据不支持这个原因。源码中的一般并发风险不能替代本轮因果证据。
- “design root 误差导致人格太阳爻错”：人格太阳直接用出生时刻计算，Design root 不参与这个人格太阳值。Base/Swiss JD 路径的微秒/不足1ms误差亦不能解释所见0.1秒量级边界提前。
- “一项 float32 rounding 就能拟合官方”：1985/1995 控制也会被同一全局float32规则推到新爻，与观察相反。不能由两例可拟合推断服务在用float32。
- “只需统一改 offset”：32记录快照中的 offset 约束交集为空，只能否定该固定模型下单一常数拟合全部快照的方案；不能据此推断官方算法、采用拟合常数或外推所有输入。
- “URL 触发了 IANA 换算”：分享 URL 保留 place/iana，但实际计算用给定数字tz。可以写数字offset与独立 IANA 检查、官方UTC属性一致。
- “7例是产品整体错误率”：这是主动挑选太阳临界时间的诊断集，不能推算随机真实出生资料的发生比例。

源码、header与数值验证全部只读；新审查材料仅保存在 `/tmp/td-ohd-golden-provenance`。
