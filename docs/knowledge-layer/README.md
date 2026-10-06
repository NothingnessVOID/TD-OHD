# Knowledge Layer：当前 Phase 5

以后网站的计算结果和解释文字分别放在哪里：

- **计算**：Sharp 与 chart.raw / chart.calculation / chart.derived。
- **知识**：稳定 Knowledge ID、名称、结构属性、Summary、Detail、来源和版本。
- **主页**：基础卡只读极短 Summary，类型顶部只读独立 heroSummary。
- **Variable 卡片**：只读 Summary；点击具体卡片或基础总览的具体箭头可打开 Detail。
- **详情与资料库**：使用同一个 renderer 展示名称、摘要、结构信息和 Detail。

Phase 5 基于远端 feature/knowledge-content-v1 的 `ae11ffe27b329dceee1cb679e0b381283fc3e400`，在独立 feature/knowledge-access-v1 分支实施。Phase 4C 的历史内容审核报告保留；本阶段不更新 main、正式安装或部署。

## 正式 API

```js
import { getKnowledgeEntry, getKnowledgeEntryById, getKnowledgeSummary, getKnowledgeDetail } from '../../src/lib/knowledge/registry.js';
const query = { domain:'human-design', objectType:'authority', objectId:'egoProjected' };
getKnowledgeEntryById('hd.authority.egoProjected'); // 由同一份登记解析稳定 ID
getKnowledgeEntry(query);   // 身份、名称、独立槽、来源、审核状态、版本、结构属性
getKnowledgeSummary(query); // 只解析 Summary，返回 slot 或 null
getKnowledgeDetail(query);  // 只解析 Detail，返回 slot 或 null
```

Summary 和 Detail 没有双向fallback。heroSummary也是独立用途；getKnowledgeSummary({...query,surface:'hero'})明确读该槽。未知对象返回null，合法缺失也返回null；entry里的hasSummary/hasDetail和status分别标记可用性。

主页通过 foundation-summary.js 的专用短文本 facade，不能取得完整 Entry 或 Detail。旧chart消费者只保留明确的旧短文兼容，永远不回退到Detail。测试证明超长或抛错Detail不会改变主页和Variable摘要输出。

## 文件关系

| 文件 | 作用 |
|---|---|
| sources.js / schema.js | 来源类型、逐槽状态/版本、合法身份和domain |
| human-design-foundation.js | 正式内容引用和对象登记；不存正文副本 |
| registry.js | 单一lookup，分别解析内容槽 |
| foundation-summary.js | 主页摘要入口 |
| content/human-design-en.js | 英文正式资源 |
| content/human-design-zh-CN.js | 简体正式资源 |
| content/human-design-zh-Hant.js | 繁体正式资源 |
| content/index.js | 随当前locale选择资源，无运行时机器翻译 |
| terms.js | 稳定术语token经现有vocabulary/locale解析 |
| detail-renderer.js | 弹窗与资料库共用正文 renderer |
| access.js | 当前 chart 的稳定计算身份映射为 Knowledge query |
| detail-controller.js | Knowledge 独立选择、上下文、语言刷新与关闭状态 |
| ../detail-dialog.js | 单一 #gate-detail 外壳、owner 互斥、焦点和共享手机高度逻辑 |
| ../human-design/identities.js | 中立Definition映射、正式Type属性和Profile几何；不依赖adapter或知识正文 |

三语文件各有55个相同内容key，只含summary/detail。结构字段在中立模块或既有计算资料维护一份，不在三语正文文件重复保存机器字段。Knowledge计算身份与旧chart返回值保持兼容；adapter-v2不升级，缓存不用清空。

## 术语和安全

```js
import { resolveKnowledgeText } from '../../src/lib/knowledge/terms.js';
resolveKnowledgeText('[[term:type.generator]]'); // 当前语言纯文本
resolveKnowledgeText('[[term:authority.sacral]]',{rich:true}); // escape后的strong
```

类型、权威、中心、概念、Variable类别、几何术语都由现有vocabulary/t读取。名称变更后引用一起更新。未知或畸形token显式报错；rich模式转义普通文字与术语，只生成固定strong标签，不支持任意HTML。

## 统一详情

```js
import { renderKnowledgeDetail } from '../../src/lib/knowledge/detail-renderer.js';
renderKnowledgeDetail(query,{contextText:'当前上下文纯文本'});
```

上下文在独立aside中，不能改变知识正文。renderer返回HTML，无弹窗、路由、搜索或资料库菜单副作用。Detail缺失保持真实 missing 状态；不会凑用摘要。Phase 5 用户界面传入 showSpecificMissing:false，仅隐藏具体 Cross 缺独立文章的提示，不改变数据状态。

Cross使用raw枚举作为动态稳定ID；传入当前chart.incarnationCross可显示既有译名、角度和门组。共用机制位于hd.cross.introduction。动态Cross有共用摘要引用，但其独立Detail仍missing；renderer显示明确标注的共用介绍；具体正文缺失保留在内部数据中。没有生成192篇文章。

## 当前覆盖和缺口

5 Type、8 Authority、12 Profile、5 Definition、24 Variable均有Summary/Detail；6 Cognition只有名称。另有1份Cross共用介绍。总计61静态身份、55个摘要/详情。Ego两类名称和正文各自独立。MG保留显示身份，family=generator、taxonomy=subtype；No Definition保留可查询身份，taxonomy=state。

正文是根据用户提供的人工审核机制指令整理的TD-OHD表述，标reviewed；有明确来源支持的结构事实单独verified。历史名称与旧正文来源不会被整体升级成官方。老师来源无运行引用；预留的扩展domain明确deprecated，没有新增TD domain。

[Coverage](coverage.md) · [缺口](missing-content.md) · [来源](provenance.md) · [验证](validation.md) · [Phase 4C报告](phase-4-content-review.md)

## Phase 5 访问入口

基础卡 Type、Authority、Profile、Definition、Cross 和四个具体 Variable slot 可打开同一个 #gate-detail。Strategy、主要回路与四箭头总览外卡没有新增点击入口。Variable 面板四卡也可打开；Color/Tone/Base 与方向作为独立上下文显示。

资料库新增“基础知识”和“四箭头”分类：31 个基础 Knowledge 条目、24 个 Variable 条目。原有三个激活概念归入基础知识，旧 concept 路由保持有效，因此基础分类总计34项。Cognition不收录。

弹窗中的“在资料库中查看”转到 #library/knowledge/<stable-id>；具体 Cross 转到 hd.cross.introduction。详情正文由同一个 renderKnowledgeDetail() 生成，外壳和上下文不同不会复制正文。

[Phase 5 技术报告](phase-5-knowledge-access.md) · [当前验证](validation.md)

现有 Gate/Line/Channel/Center/I Ching/Gene Keys/Meridian 链保持不变。关系和团队算法、本命与行运计算、本机8787安装均未修改。
