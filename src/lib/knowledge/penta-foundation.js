import { PENTA_GATES, PENTA_CHANNELS } from '../human-design/penta-catalog.js';
import { getLocale } from '../i18n.js';
import { pentaContent } from './content/penta.js';

const corpus = (id, field, args) => {
  const item = pentaContent[getLocale()]?.[id];
  const value = typeof item === 'function' ? item(...args) : item;
  return value?.[field] ?? null;
};
const url = {
  J1: 'https://jovianarchive.com/blogs/deeper-mechanics-system-theory/the-penta',
  P1: 'https://jovianarchive.com/products/the-power-column-from-sacral-to-g',
  P2: 'https://jovianarchive.com/products/the-power-column-from-the-g-to-the-throat',
  B1: 'https://bg5businessinstitute.com/institute/business-success-code',
  B2: 'https://bg5businessinstitute.com/courses/1959/bg5-business-consultant-certification-program'
};
const scopeText = {
  en: { introduction:'Penta overview: group size and three-center structure', powerColumn:'Public descriptions of the Sacral → G and G → Throat sections; three G role-gate streams in the second section', contexts:'Family and small business', gate:'Penta gate topology', channel:'Penta channel pair in the BG5 course schedule' },
  'zh-CN': { introduction:'Penta 总览：人数与三中心', powerColumn:'公开介绍中的骶骨 → G 与 G → 喉两段；后者提到 G 中心角色门的三条表达流', contexts:'家庭与小型商业', gate:'Penta 闸门拓扑', channel:'BG5 课程表列出的 Penta 门对' },
  'zh-Hant': { introduction:'Penta 總覽：人數與三中心', powerColumn:'公開介紹中的薦骨 → G 與 G → 喉兩段；後者提到 G 中心角色門的三條表達流', contexts:'家庭與小型商業', gate:'Penta 閘門拓撲', channel:'BG5 課程表列出的 Penta 門對' }
};
const evidence = (sourceIds, id) => ({ status: 'verified', sourceIds, scope: `${scopeText[getLocale()]?.[id.split(':')[0]] ?? scopeText.en[id.split(':')[0]]}${id.includes(':') ? ` ${id.split(':')[1]}` : ''}`, urls: sourceIds.map(source => url[source]) });
const reference = (read, id, field, sourceId, extra = {}) => ({ read, sourceId, file: 'src/lib/knowledge/content/penta.js', path: `${id}.${field}`, reviewStatus: 'reviewed', version: 1, evidenceStatus: 'verified', ...extra });
function record(id, args, sourceIds, scope, properties) {
  const objectId = id.startsWith('gate:') ? `gate.${id.slice(5)}` : id.startsWith('channel:') ? `channel.${id.slice(8)}` : id;
  const sourceId = sourceIds.includes('B2') ? 'penta-bg5-course' : id === 'powerColumn' ? 'penta-power-column-public' : 'penta-jovian-article';
  const read = field => () => corpus(id.startsWith('gate:') ? 'gate' : id.startsWith('channel:') ? 'channel' : id, field, args);
  const hasSummary = !id.startsWith('gate:');
  const hasDetail = ['introduction','powerColumn','contexts'].includes(id);
  return {
    id: `hd.penta.${objectId}`, domain: 'human-design', objectType: 'penta', objectId: id,
    name: reference(read('name'), id, 'name', sourceId),
    summary: hasSummary ? reference(read('summary'), id, 'summary', sourceId) : null,
    detail: hasDetail ? reference(read('detail'), id, 'detail', sourceId) : null,
    reviewStatus: 'reviewed', version: 1,
    identitySource: { sourceId, file: 'docs/team/PHASE1D-EVIDENCE-MATRIX.md', path: scope, reviewStatus: 'verified', version: 1 },
    properties: () => ({ ...properties, evidence: evidence(sourceIds, id), interpretationStatus: hasDetail ? 'verified' : 'missing', unresolved: ['gapFormula','functionalCriteria','businessSkillByGate','memberRoleInference'] }),
    propertySource: { sourceId: 'penta-structure', file: 'src/lib/human-design/penta-catalog.js', path: scope, reviewStatus: 'verified', version: 1 }
  };
}
export const pentaRecords = [
  record('introduction', [], ['J1','B1'], '关键机制命题：3–5 人与三中心', { kind:'introduction' }),
  record('powerColumn', [], ['J1','P1','P2'], '关键机制命题：骶骨→G→喉', { kind:'powerColumn' }),
  record('contexts', [], ['J1'], '关键机制命题：家庭与小型商业', { kind:'contexts' }),
  ...PENTA_GATES.map(cell => record(`gate:${cell.gate}`, [cell.gate], ['B2'], `十二门：${cell.gate}`, { kind:'gate', ...cell })),
  ...PENTA_CHANNELS.map(channel => record(`channel:${channel.channelId}`, channel.gates, ['B2'], `六通道：${channel.channelId}`, { kind:'channel', channelId:channel.channelId, gates:channel.gates, centers:channel.centers, displayOrder:channel.displayOrder }))
];
