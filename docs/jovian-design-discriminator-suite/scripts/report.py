"""Render readable research report and prediction-free manual test pack."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(n):return json.loads((ROOT/n).read_text())
def main():
    inputs=load('design-discriminator-cases.json')['cases']
    pred={r['id']:r for r in load('design-predictions-sealed.json')['cases']}
    official={r['id']:r for r in load('official-results.json')['cases']}
    comp=load('comparison.json');search=load('search-summary.json')
    modelTable=['|模型|Design /364|Personality /364|全部 /728|整图 /28|Profile /28|',
                '|---|---:|---:|---:|---:|---:|']
    for m,z in comp['totals'].items():
        modelTable.append(f"|{m}|{z['designMatched']}|{z['personalityMatched']}|{z['matchedActivations']}|{z['fullCharts']}|{z['profileMatched']}|")
    table=['|Case|出生 UTC|主要 Design 判别天体|官方|C1|C2|C3|C4|C5|C6|',
           '|---|---|---|---|---|---|---|---|---|---|']
    for c in inputs:
        cid=c['id'];body=c['disagreementBodies'][0]
        o=official[cid]['observations']['Jovian']['captures'][0]
        vals=[pred[cid]['models'][m]['design'][body]['gateLine'] for m in ['C1','C2','C3','C4','C5','C6']]
        table.append('|'+ '|'.join([cid,c['birthUtc'],body,o['design'][body],*vals])+'|')
    (ROOT/'case-table.md').write_text('# 新 Design 判别结果\n\n每行只列主要判别天体；完整 26 项、Profile 与每模型不一致列表见 JSON。\n\n'+'\n'.join(table)+'\n')
    manual=['# 隔离浏览器手工复测清单','',
        '本文件不含模型预测或官方期望值，适合独立盲采。V1 输入已封存，复测不能修改它。',
        '', 'Jovian：28/28已各正常提交两次。myBodyGraph：28/28待测；隔离浏览器停在登录页，未接管用户Chrome或转移会话。',
        '', '使用 London (England), United Kingdom / Europe/London。按当地日期和时间输入，核对页面出生UTC。每例每平台正常提交两次，记录完整两侧13项、Profile、Type；有DesignDate则照抄原标签，未知时区写UNKNOWN。有免费Color/Tone/Base可照抄；不要调用未观察到的私有API。',
        '', '|Case|London 当地出生时间|出生 UTC|UTC offset|敏感度|', '|---|---|---|---:|---|']
    for c in inputs:
        manual.append(f"|{c['id']}|{c['birthLocal']}|{c['birthUtc']}|{c['utcOffsetMinutes']} min|"+('±1秒稳定；±5秒敏感' if c['sensitive'] else '±5秒稳定')+'|')
    manual+=['','## 记录模板','','```json','{"id":"JDD-XX","platform":"myBodyGraph","repeat":1,"capturedAtUtc":"...","birthUtcDisplayed":"...","personality":{"sun":"..."},"design":{"sun":"..."},"profile":"...","type":"...","designDateDisplayed":null,"designDateTimezone":"UNKNOWN","evidence":"..."}','```','','禁止补齐缺失字段为模型预测。新采集请保存独立文件，保留本轮已采集结果与原封存。']
    (ROOT/'manual-test-pack.md').write_text('\n'.join(manual)+'\n')
    README='''# Design 侧判别研究 V1

## 先说结论

**C2 继续领先。本轮28个新出生UTC，Jovian每例正常提交两次，C2的Design为364/364，完整26项为728/728，整图和Profile均28/28。**

本轮真正区分了Swiss1.76与1.77，也区分了历史C2与Modern Swiss。没有出现C2的Personality正确而Design错误的案例，没有其他候选反超。

C2仍可称为 **Strong Jovian-compatible historical candidate**。这些结果已足以支持下一阶段单独授权的隔离Compatibility Mode研究原型；尚不能称为“官方确认算法”，也不足以直接替换生产引擎。官网没有提供精确黄经或实现源码，Gate.Line只把黄经限制在一个区间。本轮新增案例只在Jovian完成验证，myBodyGraph没有隔离浏览器登录会话，28例待交叉复测。

## 1. 先处理已有数据

扫描451个资料文件入口，归一化162条官方来源观察，去重为69个出生UTC，全部有完整26项及Profile。排除1项未能确认属于合成资料的控制记录，未重新发布其出生资料。

已有1个Design判别UTC：`D1985-after`，`1985-01-02T15:21:00Z`。官方Design Sun/Earth为48.6/21.6，C5为48.5/21.5，C1/C2/C3/C4/C6均符合官方。其来源为[原始DOM](../golden-reference/browser-evidence/D1985-after.dom.txt)及[结构化记录](../golden-reference/browser-evidence/D1985-after.json)。本轮没有重新提交这个历史案例。

历史69例C2为897/897 Design、1794/1794全部激活、69/69整图。历史只有这1个Design判别案例，其余68例的Design不能区分候选；不能把历史高命中率当作28例新盲测的替代品。详见[历史盘点](existing-design-discriminators.json)。

## 2. 本轮模型与成绩

所有模型定义继承上轮冻结版本，没有根据官方结果重调参数。

|模型|版本与星历|时间输入|分类|
|---|---|---|---|
|C1|Swiss1.77.00 + 压缩DE406|UTC数值JD传swe_calc_ut|HISTORICAL STACK|
|C2|Swiss1.76.00 + 压缩DE406|同C1|HISTORICAL STACK|
|C3|Swiss1.77.00 + 压缩DE406|正确UTC→TT|HISTORICAL STACK|
|C4|Swiss2.10.03 + 压缩DE441|正确UTC→TT|MODERN REFERENCE|
|C5|Swiss1.77.00 + DE406，IAU1976/1980实验|正确UTC→TT|ARTIFICIAL EXPERIMENT|
|C6|Swiss1.77.00 + direct JPL DE406|UTC数值JD传swe_calc_ut|HISTORICAL STACK|

这里HISTORICAL STACK表示真实历史库及默认模型的实验运行，不表示已证明Jovian采用该组合；utc-as-ut1记录一种调用约定，不能称为物理正确的UTC转换。请求flags为258（C6为257），返回flags经原生调用校验；版本、来源、库与星历SHA均在封存JSON及继承获取manifest中。

MODEL_TABLE

表格只统计本轮28个不同UTC，各次重复提交不重复计分。所有模型Personality均364/364，差异集中在Design，符合本轮筛选目的。

|Design成对比较|预测分歧案例|官方支持C2|官方支持其他|平局|
|---|---:|---:|---:|---:|
|C2 vs C1|7|7|0|0|
|C2 vs C3|9|9|0|0|
|C2 vs C4|24|24|0|0|
|C2 vs C5|24|24|0|0|
|C2 vs C6|16|16|0|0|

尤其JDD-01/02的官方Design Sun为39.3/62.1；C1预测39.2/62.2，因此对应Profile也不同。JDD-03至07还以Mercury、Moon、Mars区分1.76与1.77，不只是Sun。完整逐例见[案例表](case-table.md)与[计分JSON](comparison.json)。

C1不一致Design天体为Sun/Earth各2、Mercury2、Moon2、Mars1；C3还包括Node两项和Neptune；C4/C5/C6的具体不一致项均逐例保存。C2本轮没有任何不一致字段。

## 3. 搜索与样本质量

从1980–2030模型边界种子出发，逆解Design天体爻线切换，再以太阳前推88°转换成出生时刻、取邻近分钟。候选池31300余个出生分钟；3900个有C2 Design分歧，462个作六模型完整预测，最后固定28个不同UTC。搜索不是全时间穷举：快速天体种子为每年指定1月/7月窗口。新28例与历史69例UTC无重叠。

覆盖全部11类独立Design天体：Sun、Moon、True Node、Mercury、Venus、Mars、Jupiter、Saturn、Uranus、Neptune、Pluto；Earth/South Node作为派生项仍完整保存。年代分布：1980s13、1990s3、2000s3、2010s5、2020s4。本轮案例是合成数据，London当地时间、历史offset与输入UTC均冻结。

全部28例在每个候选±1秒内保持完整26项和Profile；21例±5秒稳定。JDD-01至07是7个窄边界案例，±5秒会变化，已标敏感。网站输入只支持分钟，页面实际显示的出生UTC逐次核对。这些专选分歧案例有判别力，命中率不能推成普通出生图人群准确率。

## 4. 封存与盲采

V1封存时间：`2026-10-03T14:11:22.185555+00:00`。预采集提交：`e29caef4ebabc9e35d3e60862ae1579455a3bf6d`。第一次新官方采集：`2026-10-03T14:35:18.457Z`，最后一次：`2026-10-03T14:47:42.075Z`。封存文件哈希始终一致。

初选28UTC在封存前改用继承的64轮二分根完整回放，替代搜索阶段Newton近似；没有重新挑案例。两种求根差约40微秒，Gate.Line、Profile及所有敏感度分类都不变。正式预测根与原模型逐位复算一致，最大88°弧残差为`4.595790414896328e-10°`。Newton仅用于找候选时刻。

所有操作仅在Codex In-app Browser中执行，未使用用户Chrome或提取cookie/token。通过正常表单填写London当地日期/分钟并选择城市，逐次读取Properties出生UTC及渲染SVG红黑两列。读取Personality/Design各13项及Profile，保存Type和Cross附加上下文；不调用未观察到的私有API。

[原始页面值转录](evidence/jovian-paired-dom.tsv)保留两个真实采集时间。重复值在浏览器中独立读取，展开后的[56条记录](evidence/jovian-dom-submissions.tsv)通过原浏览器导出的FNV转录校验（30758921，14967 ASCII字符）。FNV用来检查转录无误，证据文件另有SHA256；它不替代第三方页面证据来源本身。结构化正式结果见[official-results.json](official-results.json)。

myBodyGraph停在[登录页证据](evidence/mybodygraph-availability.dom.txt)，没有可用合法隔离会话。本轮未登录、未注册、未跨浏览器转移会话，生成不含预测的[手工测试包](manual-test-pack.md)。Jovian正常UI显示完整Gate.Line，未观察到Color/Tone/Base或Design Date。PDF按钮正常点击未返回可保存下载，未将该尝试记为已取得PDF；本轮来源证据采用DOM页面值。

## 5. Design Date能否额外证明C2的88°根？

**本轮不能据Design Date确认C2更接近官方真实根时间。** 新Jovian图面没有该日期字段，myBodyGraph未取得新结果。历史33个UTC有分钟级Design Date标签，但时区未披露，全部保持`UNKNOWN`，不擅自当UTC。

每模型同时保存Design TT JD根、库ΔT反解的modelUT1数值时钟、闰秒表转换的民用UTC。前者数值日历无Z，不冒充民用UTC或实测UT1；后者是模型推算，均非官方观测。分钟标签的舍入规则也未知。历史Date标签专项检查见[分析](design-date-analysis.md)。

Design激活匹配为C2整条88°求根加天体计算组合提供支持，不能单凭离散值拆分认定是根时间、星历、时间尺度或模型中哪一项被官网采用。没有官方精确Design UTC/黄经时，不能把一分钟标签制造成秒级证据。

## 6. 验证、范围与下一步判断

- 封存输入/预测/关键脚本及继承文件SHA一致，原生库和获取资产SHA验证通过。
- 独立进程回放28×6×26=4368项，longitude和Design TT根差均0，Profile与±1/±5秒分类一致，见[native-verification.json](native-verification.json)。
- 官方28唯一ID/UTC完整、历史重叠0、每例两个严格递增采集时间、每列13个合法Gate.Line、两次结果稳定、Profile与两侧Sun Line一致。
- 独立计分器再次核验分母、逐例计分、Design成对胜负、raw转录和SHA，见[完整性报告](postcollection-integrity.json)及[validation.json](validation.json)。
- 仅新增本研究目录。生产代码、main、正式缓存与8787未修改；未运行生产npm/E2E，因为没有生产路径修改。
- 没有添加offset、epsilon、统一时间加减、Gate特判或根据官方结果重调任何参数。C5继续明确为实验组合。

研究问题现在的回答：C2领先；1.76/1.77可以区分；Legacy/Modern可以区分；C2没有Personality对而Design错；其他候选没有反超。仍只说明结果兼容，不能证明官方内部用Swiss1.76、DE406或utc-as-ut1。已达到开展隔离Compatibility原型的研究门槛，myBodyGraph新28例复测及更精细官方数据仍有价值；本阶段未实现原型。

## 文件与复现

核心输入和预测：`design-discriminator-cases.json`、`design-predictions-sealed.json`、`SHA256SUMS.json`。旧证据盘点：`existing-design-discriminators.json`、`existing-official-records.json`。官方及计分：`official-results.json`、`comparison.json`。校验和Date分析、manual pack、脚本均在本目录。

详细运行命令见[reproduction.md](reproduction.md)。源码/星历获取来源与hash继承自[获取manifest](../ra-era-astronomy-stack/acquisition-manifest.json)，大型第三方星历、库与临时池不提交。公开分支仅包含研究文档和脚本，用户账户和个人资料不纳入新增资料。

分支：`research/jovian-design-discriminator-suite-v1`，基线：`d3693d4942a23e043fa75efd84287f7393656f78`。最终提交message：`research: add Jovian design discriminator suite`。不merge、不deploy。
'''
    README=README.replace('MODEL_TABLE','\n'.join(modelTable))
    (ROOT/'README.md').write_text(README)
    print('Rendered README, case table, prediction-free manual test pack')
if __name__=='__main__':main()
