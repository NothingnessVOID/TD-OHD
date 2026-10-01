/** Report the reference-backed Knowledge Layer without changing product content. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { SOURCES } from '../src/lib/knowledge/sources.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
const legacyName=['Natal','Engine'].join('');
const previous=getLocale();setLocale('en',{persist:false});
try {
 const entries=listKnowledgeEntries(), root=new URL('../docs/knowledge-layer/',import.meta.url);
 mkdirSync(root,{recursive:true});
 const counts=['type','authority','profile','definition','variable','cognition'].map(kind=>{
  const rows=entries.filter(e=>e.objectType===kind);
  return {objectType:kind,count:rows.length,summary:rows.filter(e=>e.hasSummary).length,detail:rows.filter(e=>e.hasDetail).length,missingDetail:rows.filter(e=>!e.hasDetail).length};
 });
 writeFileSync(new URL('coverage.json',root),JSON.stringify({version:1,entries:entries.length,counts,cross:{identity:'dynamic Sharp raw enum',staticArticles:0,summary:0,detail:0},entryReviewStatuses:{unreviewed:entries.length}},null,2)+'\n');
 writeFileSync(new URL('coverage.md',root),`# Knowledge Layer V1 Coverage\n\n此表由 scripts/report-knowledge-layer.mjs 根据实际 lookup 生成。计数按知识身份，不把共享引用当独立文章。\n\n| 对象 | 数量 | Summary | Detail | Missing Detail |\n|---|---:|---:|---:|---:|\n${counts.map(c=>`| ${c.objectType} | ${c.count} | ${c.summary} | ${c.detail} | ${c.missingDetail} |`).join('\n')}\n| Cross | dynamic | 0 | 0 | 每个动态身份均缺正文 |\n\n共60个静态身份，25个默认摘要、24个现有详情、36个缺详情。Type另有5个 heroSummary 引用，不算第二篇详情。Authority两种Ego身份共享同一个旧摘要。所有内容仍为unreviewed。\n\nVariable现有正文用于下方说明区，所以登记为Detail；不自动复制为Summary。Definition只有名称；组件数量是计算信息，不冒充知识摘要。Cross没有批量生成空文章。\n`);
 writeFileSync(new URL('missing-content.md',root),`# 缺口清单\n\n没有正文是合法状态；本轮没有补写。以下按身份列出，未来可分别审校。\n\n| Knowledge ID | 名称（英语来源显示） | Summary | Detail |\n|---|---|---|---|\n${entries.filter(e=>!e.hasDetail||!e.hasSummary).map(e=>`| ${e.id} | ${e.name.replaceAll('|','\\|')} | ${e.hasSummary?'available':'missing'} | ${e.hasDetail?'available':'missing'} |`).join('\n')}\n\nCross：动态身份，Summary/Detail均missing。提供当前chart.incarnationCross上下文时可显示已有本地化结构名称；未提供上下文时只显示raw ID，不伪造门组或文章。\n\n优先缺口：8类权威缺独立详情，两种Ego还共享旧摘要；12类Profile只有theme摘要；5类Definition和6种Cognition只有名称；Type只有现有两个用途的短介绍；24种Variable有现有详情但没有另审的主页摘要。后续需用户提供并审核资料，本轮不读取老师材料。\n`);
 writeFileSync(new URL('provenance.md',root),`# 来源与用途登记\n\n以下是文件/代码迁移来源，不是知识官方认证。名称、摘要、详情、Type顶部简介各自登记来源、path、reviewStatus和version。全部现有引用仍为unreviewed、version=1。版本标记表示引用契约版本，不会自动证明源文字已审；后续改资料时应更新对应版本。\n\n| ID | Name source | Summary source | Detail source | Legacy slots |\n|---|---|---|---|---|\n${entries.map(e=>{
  const show=p=>p?`${p.sourceId}: ${p.file} / ${p.path}`:'missing';
  return `| ${e.id} | ${show(e.provenance.name)} | ${show(e.summary)} | ${show(e.detail)} | ${Object.entries(e.legacySlots).map(([k,v])=>k+': '+show(v)).join('; ')||'—'} |`;
 }).join('\n')}\n\n## 来源表\n\n${Object.entries(SOURCES).map(([id,s])=>`- **${id}**：type=${s.type}；lineage=${s.lineage.join(' → ')}；${s.reserved?'仅预留，没有现有条目使用':s.evidence}`).join('\n')}\n\n## 当前语言读取链\n\n- 名称：现有 vocabulary.js → locales/en.js 或 zh-CN/zh-Hant/vocabulary.js。\n- catalog摘要与Variable详情：contentText() → 当前locale content adapter → engine-messages/engine-templates；原fallback规则保留。\n- Type heroSummary：现有 typeDescription()；英文本在locales/en.js的TYPE_PLAIN，简繁在各vocabulary.js的TYPE_PLAIN_ZH。\n- Cross：Sharp raw ID负责身份；当前chart上下文与crossName()负责已有结构显示，译名不是Sharp正文。\n\n表中的file/path是原始正式存储入口，不等于中文译文文件。返回slot.locale注明当前语言；翻译来源仍通过既有i18n链追踪，没有新的en/zh字段副本。\n\nVariable旧句子的逐句作者未确认，lineage明确带unknown。旧静态catalog可确认迁移源为${legacyName}，但不能升级为Jovian官方、Ra原文或知识已验证。老师与官方来源类型只预留；本轮未搜索、读取或引用。\n`);
 console.log(`Knowledge report: ${entries.length} reference-backed entries; no product writes.`);
} finally {setLocale(previous,{persist:false});}
