import { readWaContent } from './content.js';

// Reading excerpts keep authored topic/examples; implementation notes stay in the source record.
export const WA_READING_PARAGRAPHS=Object.freeze(Object.fromEntries(Object.entries({
 'penta-and-wa':[0,1], 'scale-and-template':[0], 'penta-roles':[0,1], 'alpha':[0,1],
 'gapping':[0,1], 'powerbases':[0], 'membership':[1], 'extension-and-context':[0,1],
 '45-21':[0,1], '51-25':[0], '2-14':[0,1], '59-6':[0,1], '27-50':[0,1], '3-60':[0,1]
}).map(([id,indices])=>[id,Object.freeze(indices)])));
const rules=Object.freeze({
 'penta-and-wa:en':[['group coverage','group activation patterns',1]],
 'gapping:zh-CN':[['实际成员进入后形成什么覆盖','实际成员进入后激活哪些闸门',1]],
 'gapping:zh-Hant':[['實際成員加入後形成何種覆蓋','實際成員加入後啟動哪些閘門',1]],
 'gapping:en':[['Coverage produced by the actual members','The gates activated by the actual members',1]],
 'membership:zh-CN':[['组内覆盖','组内闸门的激活情况',1]],
 'membership:zh-Hant':[['組內覆蓋','組內閘門的啟動情況',1]],
 'membership:en':[['headcount and coverage','headcount and active gates',1]],
 '2-14:en':[['same pair','same channel',2]],
 '51-25:en':[['pairs it with Powerbase study','teaches it alongside Powerbase study',1]]
});
const omitSummary=new Set(['scale-and-template','alpha']);

/** Display-only, explicit and fail-closed. Never rewrites the author registry or removes a negation. */
export function presentWaReading(source,locale) {
 if(!source||!['en','zh-CN','zh-Hant'].includes(locale))return null;
 const indices=WA_READING_PARAGRAPHS[source.objectId];if(!indices)return null;
 const paragraphs=source.detail.split(/\n\n+/);if(paragraphs.length!==3)return null;
 let detail=indices.map(index=>paragraphs[index]).join('\n\n');
 const applied=[];
 for(const [from,to,count] of rules[`${source.objectId}:${locale}`]||[]){
  if(detail.split(from).length-1!==count)return null;
  detail=detail.replaceAll(from,to);applied.push({from,to,count});
 }
 return {source,locale,summary:omitSummary.has(source.objectId)?null:source.summary,detail,
   paragraphIndexes:[...indices],wordingChanges:applied,presentationVersion:'wa-reading-ui-v1'};
}
export function readWaReadingExcerpt(id,locale='en') {return presentWaReading(readWaContent(id,locale),locale);}
