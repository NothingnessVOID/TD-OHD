# Knowledge Layer V1

以后网站的计算结果和解释文字分别放在哪里：

- **计算**：Sharp + chart.raw / chart.calculation / chart.derived。
- **知识**：Knowledge Layer 登记现有文字的身份、来源、用途、审核状态和版本；正文仍放在原资料文件。
- **主页摘要面**：只读 Summary 或明确保留的旧短文本。
- **详情面**：读 Detail；没有资料时明确返回 missing，不拿别的文字凑数。

本轮基于阶段 2 `c3ad5b08284d5a4b081f51cd571d82cdb1225eec`，独立分支 `feature/knowledge-layer-v1`。没有新增知识正文、翻译系统、弹窗或资料库菜单，没有读取老师材料或联网纠正文案。

## 结构与正式 API

只有五个小模块：

| 文件 | 职责 |
|---|---|
| src/lib/knowledge/sources.js | 来源类型及出处登记；教材/官方来源仅预留 |
| src/lib/knowledge/schema.js | domain、objectType、审核状态、版本及来源校验 |
| src/lib/knowledge/human-design-foundation.js | 60个已有对象的引用描述；Cross动态身份 |
| src/lib/knowledge/registry.js | 正式 lookup；没有数据库或CMS |
| src/lib/knowledge/foundation-summary.js | 主页只读摘要的兼容入口 |

```js
import { getKnowledgeEntry, getKnowledgeSummary, getKnowledgeDetail } from '../../src/lib/knowledge/registry.js';

const query = { domain: 'human-design', objectType: 'authority', objectId: 'egoProjected' };
getKnowledgeEntry(query);   // 身份、当前语言名称、独立内容槽、来源、状态、版本
getKnowledgeSummary(query); // slot 或 null；绝不读取 Detail
getKnowledgeDetail(query);  // slot 或 null；绝不回退到 Summary
```

Entry有：id/domain/objectType/objectId/name/locale、summary/detail、hasSummary/hasDetail、summaryStatus/detailStatus、provenance、reviewStatus、version、properties、legacySlots。每个有内容的slot单独带sourceId/file/path/reviewStatus/version/locale；名称及结构属性来源在provenance。字段中的原始file/path对应原存储，当前译文仍走旧语言入口。

60个静态身份包括5 Type、8 Authority、12 Profile、5 Definition、24 Variable、6 Cognition。ID基于内部身份，不随语言改变；Profile ID如hd.profile.1-3，objectId仍是1/3；Variable ID如hd.variable.motivation.hope，objectId为motivation:hope。

## Summary 与 Detail 的保险

主页调用foundationSummary → getKnowledgeSummary。这个函数只解析summary引用，不调用完整entry读取，也不触碰detail读取函数。即便Detail变得很长、或读取Detail会抛错，Summary仍独立。

**没有双向自动fallback**：Summary缺失不会取Detail；Detail缺失不会取Summary。普通缺失返回null，合法对象仍可lookup。完全未知对象返回null。

Type的基础卡description与顶部TYPE_PLAIN用途不同：前者是默认summary，后者单独登记legacySlots.heroSummary。两段各有来源，不拼成文章。strategy/signature/notSelf/percentage是structured properties，未塞进Detail。

主页中的名称、策略、定义计数、主要回路和箭头字符仍可使用既有明确短显示；本轮只迁移Type顶部/基础卡、Authority摘要和Profile theme。不会为了新架构重写整个页面。

已有下方Variable说明区是详情面，它通过getKnowledgeDetail读取同一24条旧解释；它不是主页Foundation摘要卡。没有新增详情入口或扩大默认信息密度。

## 缺口保持真实

- Type：两个现有摘要用途，没有独立Detail。
- Authority：8个身份都保留；egoManifested/egoProjected共享legacy.authority.ego摘要引用，未写两篇新机制文章，Detail缺失。
- Profile：theme登记为summary，Detail缺失。
- Definition：只有原名称。岛组/数量是计算结果，不冒充知识正文，Summary/Detail均缺失。
- Variable：24条当前说明区正文登记为Detail；没有另审的主页Summary，不复制一份。
- Cognition：6名称，无摘要/正文。
- Cross：动态identity，不批量造空文章；Summary/Detail缺失。

Cross读取：

```js
getKnowledgeEntry({
  domain: 'human-design', objectType: 'cross',
  objectId: chart.incarnationCross.rawId,
  cross: chart.incarnationCross
});
```

当前chart上下文提供原有本地化结构名称、门号和角度。如果只传raw ID而无上下文，返回raw身份标签，不推测门组。上下文rawId不匹配会报错，防止把另一张图结构贴到这个身份。

## 来源、审核和版本

这只是登记与读取，不是知识审核。现有内容全部unreviewed、version=1；并未标成Jovian验证、官方HD或Ra原文。

旧catalog静态资料记录NatalEngine迁移源，证据为THIRD_PARTY_NOTICES；这不证明逐句知识作者。Type顶部文案登记现有应用展示源。Variable原句登记TD-OHD维护且带unknown lineage，不猜测老师来源。

支持human-design/iching/gene-keys/meridian/td-ohd-extension/teacher-extension等domain；其他体系只是schema兼容，没有本轮迁移。来源类型、reserved条目与实际资产分开。reviewed表示人工阅过；verified需明确证据；custom表示扩展内容。版本由维护者在相应引用/内容变更时明确升级，不以有文字代替已审核。

## 不复制正文、不再造翻译字典

知识模块只保存read函数和metadata，引用catalog、variable-data、vocabulary、contentText及crossName。没有把已有正文复制到knowledge-data；简体/繁体仍读现有字典。测试检查重复文字、三语输出与实际引用结果。

本轮仅把sharp-contract中的既有definitionIds/definitionNames常量导出供引用；枚举值、算法和chart输出不变，因此不升级adapter-v2/cacheRule。原Gate/Line/Channel/Center/I Ching/Gene Keys/Meridian读取链和关系/团队代码不改。

## 报告与复现

- [coverage.md](coverage.md)：数量及真实可用性。
- [missing-content.md](missing-content.md)：逐身份缺口。
- [provenance.md](provenance.md)：逐槽来源与三语读取路径。
- [validation.md](validation.md)：单测、E2E、布局隔离证据。
- [phase-3-resolution.md](../content-audit/phase-3-resolution.md)：追加阶段状态，旧审计不覆盖。

```bash
node scripts/report-knowledge-layer.mjs
node --test tests/knowledge-layer.test.js
E2E_URL=http://127.0.0.1:5193 BASELINE_E2E_URL=http://127.0.0.1:5191 node tests/knowledge-layer-e2e.mjs
```

浏览器对照须分别启动阶段2/阶段3的Vite服务器，使用相应URL。报告脚本只生成coverage.md/coverage.json/missing-content.md/provenance.md，不写产品资料。

阶段3完成后停止，阶段4入口和教材审核待单独授权。
