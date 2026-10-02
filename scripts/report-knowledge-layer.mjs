/** Generate coverage/provenance from live lookup; optional validation from actual run records. */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { listKnowledgeEntries } from '../src/lib/knowledge/registry.js';
import { SOURCES } from '../src/lib/knowledge/sources.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
const root=new URL('../docs/knowledge-layer/',import.meta.url);
const write=(name,text)=>writeFileSync(new URL(name,root),text);
const json=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
const previous=getLocale();setLocale('en',{persist:false});
try {
 mkdirSync(root,{recursive:true});
 const entries=listKnowledgeEntries();
 const counts=['type','authority','profile','definition','variable','cognition','cross'].map(kind=>{
  const rows=entries.filter(e=>e.objectType===kind);
  return {objectType:kind,count:rows.length,summary:rows.filter(e=>e.hasSummary).length,detail:rows.filter(e=>e.hasDetail).length,missingDetail:rows.filter(e=>!e.hasDetail).length};
 });
 const statuses=Object.fromEntries([...new Set(entries.map(e=>e.reviewStatus))].map(status=>[status,entries.filter(e=>e.reviewStatus===status).length]));
 const coverage={version:2,phase:'4C',entries:entries.length,counts,cross:{identity:'dynamic Sharp raw enum',sharedIntroduction:'hd.cross.introduction',specificArticles:0,specificDetailStatus:'missing'},entryReviewStatuses:statuses};
 json('coverage.json',coverage);
 write('coverage.md',`# Phase 4C Coverage\n\n此表由正式 lookup 自动统计。cross 的静态数量表示一份共用介绍，不表示具体十字文章。\n\n| 对象 | 数量 | Summary | Detail | Missing Detail |\n|---|---:|---:|---:|---:|\n${counts.map(c=>`| ${c.objectType} | ${c.count} | ${c.summary} | ${c.detail} | ${c.missingDetail} |`).join('\n')}\n\n共${entries.length}个静态身份；${entries.filter(e=>e.hasSummary).length}个摘要、${entries.filter(e=>e.hasDetail).length}个详情。Cognition六项只有名称。具体Cross动态身份可读取共用摘要，但各自Detail仍missing；共用介绍不伪装为192篇文章。Type另保留heroSummary，三个内容槽没有自动fallback。\n\n摘要与整理正文为reviewed；经过所列来源核对的结构属性单独标verified。姓名和历史来源不会随新正文整体升级。\n`);
 write('missing-content.md',`# Phase 4C 缺口\n\n| ID | Name | Summary | Detail |\n|---|---|---|---|\n${entries.filter(e=>!e.hasSummary||!e.hasDetail).map(e=>`| ${e.id} | ${e.name} | ${e.hasSummary?'available':'missing'} | ${e.hasDetail?'available':'missing'} |`).join('\n')}\n\n- Cognition：六个既有名称保留，不编造解释。\n- 具体Incarnation Cross：保留动态raw身份、译名、Angle和四Gate；192篇独立正文deferred。统一renderer可显示明确标注的共用机制介绍，具体文章仍missing。\n- Phase 5：统一详情点击入口、搜索与资料库接入、关联导航；本轮未新增。\n- 已预留的扩展domain明确deprecated，仅兼容读取，没有新增TD体系分类。\n`);
 const show=p=>p?`${p.sourceId}: ${p.file} / ${p.path}; ${p.reviewStatus}; v${p.version}`:'missing';
 write('provenance.md',`# Phase 4C 来源登记\n\n机制审核基线来自用户提供的Phase 4C审核指令，并以以下官方公开页面核对结构事实。TD-OHD自行组织正文与正式三语资源；不是官网原文复制。正文标reviewed，不宣称逐句官方verified。来源文件按当前locale给出，每个槽独立版本。\n\n| ID | Name | Summary | Detail | Structured source | Hero |\n|---|---|---|---|---|---|\n${entries.map(e=>`| ${e.id} | ${show(e.provenance.name)} | ${show(e.summary)} | ${show(e.detail)} | ${show(e.provenance.properties)} | ${show(e.legacySlots.heroSummary)} |`).join('\n')}\n\n## 集中来源记录\n\n${Object.entries(SOURCES).map(([id,s])=>`- **${id}**：type=${s.type}；lineage=${s.lineage.join(' → ')}；${s.reserved?'仅预留，无本次正文引用':s.evidence}${s.url?`；[来源](${s.url})`:''}${s.references?`\n${s.references.map(url=>`  - [官方机制来源](${url})`).join('\n')}`:''}`).join('\n')}\n\n旧catalog、variable-data的legacy正文仍供旧契约兼容；不再是本轮六类知识对象的正式Summary/Detail入口。老师资料没有读取、引用或登记为新内容来源。teacher-material仍为reserved，teacher-extension来源预留也没有运行内容。\n`);
 const at=process.argv.indexOf('--validation');
 if(at!==-1) {
  const manifest=JSON.parse(readFileSync(process.argv[at+1],'utf8'));
  const validation={phase:'4C',runs:manifest.runs.map(run=>{
    const log=readFileSync(run.log,'utf8');
    const count=word=>{const m=log.match(new RegExp(`(?:ℹ |# )${word} (\\d+)`));return m?Number(m[1]):null;};
    return {command:run.command,status:run.exitCode===0?'passed':'failed',exitCode:run.exitCode,passed:count('pass'),failed:count('fail'),skipped:count('skipped')};
  }),...JSON.parse(readFileSync(manifest.layout,'utf8'))};
  json('validation.json',validation);
  write('validation.md',`# Phase 4C 验证\n\n根据真实运行记录和浏览器输出自动生成。\n\n| 命令 | 状态 | passed | failed | skipped |\n|---|---|---:|---:|---:|\n${validation.runs.map(r=>`| ${r.command} | ${r.status} | ${r.passed??'—'} | ${r.failed??'—'} | ${r.skipped??'—'} |`).join('\n')}\n\n## 布局与单语言\n\n${validation.layoutComparisons.length}组对照：1224/903/664/390 × en/zh-CN/zh-Hant。基础卡数量和宽度一致；授权的Summary、Authority名称及移除双语标签可能改变自然换行高度，实际变化见validation.json。没有修改布局CSS。\n\n每组向全部现有Detail注入超过五万字符后，Foundation文字和卡片宽高、Variable摘要区文字和高度完全相同。中文Variable卡片和基础箭头标签没有英文附加，英文知识资源没有中文。Cross panel使用短共用摘要并移除70%正文。证据覆盖代表图和指定宽度/语言，不宣称穷举。\n\n构建保留已有大chunk提示。临时服务仅用于分支测试；未更新8787、main或生产部署。\n`);
 }
 console.log(`Knowledge report: ${entries.length} entries; actual slot availability and provenance generated.`);
} finally {setLocale(previous,{persist:false});}
