import { definitionIds, definitionNames, authorityNames, typeFacts, profileGeometry, definitionFacts } from '../human-design/identities.js';
import { reviewedText, knowledgeContent } from './content/index.js';
import { getLocale, t } from '../i18n.js';
import { TYPES, PROFILES } from '../human-design/catalog.js';
import { variableNames, variableValueId, cognitionNames } from '../human-design/variable-data.js';
import { typeName, authorityName, profileName, definitionName, variable, cognition, typeDescription, strategy, signature, notSelf } from '../vocabulary.js';
import { crossName } from '../content.js';

// References wrap the existing source. No explanation text is stored here.
const ref = (read, file, path, sourceId = 'legacy-hd-static', extra = {}) =>
  ({ read, sourceId, file, path, reviewStatus: 'unreviewed', version: 1, ...extra });
const catalogFile = 'src/lib/human-design/catalog.js';
const variableFile = 'src/lib/human-design/variable-data.js';
const entry = (objectType, objectId, name, summary = null, extra = {}) => ({
  id: `hd.${objectType}.${objectId.replaceAll('/', '-').replaceAll(':', '.')}`,
  domain: 'human-design', objectType, objectId, name, summary, detail: null,
  reviewStatus: 'unreviewed', version: 1, ...extra
});
// Independent slots resolve only their own locale resource and terms.
const reviewedRef = (key, slot) => ref(() => reviewedText(key, slot), 'src/lib/knowledge/content/human-design-{locale}.js', `${key}.${slot}`, 'reviewed-hd-content', { reviewStatus:'reviewed',version:2, templateRead:()=>knowledgeContent[getLocale()][key][slot], presentationRead:()=>slot === 'detail' ? knowledgeContent[getLocale()][key].presentation : undefined });
export const foundationRecords = [];
for (const [id, type] of Object.entries(TYPES)) foundationRecords.push(entry('type', id,
  ref(() => typeName(type.name), catalogFile, `TYPES.${id}.name`),
  reviewedRef(`type.${id}`, 'summary'), {
    legacySlots: { heroSummary: ref(() => typeDescription(type.name), 'src/locales/en.js', `TYPE_PLAIN[${type.name}]`, 'td-ohd-presentation', { role: 'hero-summary', ...(['manifestingGenerator','reflector'].includes(id)?{reviewStatus:'reviewed',version:2}:{}), translations: ['src/locales/zh-CN/vocabulary.js', 'src/locales/zh-Hant/vocabulary.js'] }) },
    detail: reviewedRef(`type.${id}`, 'detail'), reviewStatus:'reviewed', version:2,
    properties: () => ({ ...typeFacts[id], strategy: strategy(type.name), signature: signature(type.name), notSelf: notSelf(type.name) }),
    propertySource: ref(null, 'src/lib/human-design/identities.js', `typeFacts.${id}`, 'jovian-structure', { reviewStatus:'verified',version:2 })
  }));
const authorityFamilies = { emotional:'emotional', sacral:'sacral', splenic:'splenic', egoManifested:'ego', egoProjected:'ego', selfProjected:'self', mental:'mental', lunar:'lunar' };
for (const [id, family] of Object.entries(authorityFamilies)) {
  foundationRecords.push(entry('authority', id,
    ref(() => authorityName(authorityNames[id]), 'src/lib/human-design/identities.js', `authorityNames.${id}`, 'jovian-structure', {reviewStatus:'verified',version:2}),
    reviewedRef(`authority.${id}`, 'summary'),
    { detail:reviewedRef(`authority.${id}`, 'detail'),reviewStatus:'reviewed',version:2, properties: () => ({ family }), propertySource: ref(null, 'src/lib/human-design/identities.js', `authorityNames.${id}`, 'jovian-structure', {reviewStatus:'verified',version:2}) }));
}
for (const [id, profile] of Object.entries(PROFILES)) foundationRecords.push(entry('profile', id,
  ref(() => profileName(id), catalogFile, `PROFILES[${id}].name`),
  reviewedRef(`profile.${id}`, 'summary'), {detail:reviewedRef(`profile.${id}`, 'detail'),reviewStatus:'reviewed',version:2,properties:()=>({geometry:profileGeometry[id]}),propertySource:ref(null,'src/lib/human-design/identities.js',`profileGeometry[${id}]`,'jovian-structure',{reviewStatus:'verified',version:2})}));
for (const [rawId, id] of Object.entries(definitionIds)) foundationRecords.push(entry('definition', id,
  ref(() => definitionName(definitionNames[rawId]), 'src/lib/human-design/identities.js', `definitionNames.${rawId}`, 'td-ohd-presentation'), reviewedRef(`definition.${id}`, 'summary'), {detail:reviewedRef(`definition.${id}`, 'detail'),reviewStatus:'reviewed',version:2,properties:()=>definitionFacts[id],propertySource:ref(null,'src/lib/human-design/identities.js',`definitionFacts.${id}`,'jovian-structure',{reviewStatus:'verified',version:2})}));
for (const [kind, names] of Object.entries(variableNames)) for (let color = 1; color <= 6; color++) {
  const valueId = variableValueId(kind, color), name = names[color - 1];
  foundationRecords.push(entry('variable', `${kind}:${valueId}`,
    ref(() => variable({ name })[0], variableFile, `variableNames.${kind}[${color - 1}]`, 'td-ohd-variable'), reviewedRef(`variable.${kind}:${valueId}`, 'summary'), {
      detail: reviewedRef(`variable.${kind}:${valueId}`, 'detail'),reviewStatus:'reviewed',version:2,
      properties: () => ({ kind, valueId, color }), propertySource: ref(null, variableFile, 'variableValueId', 'td-ohd-presentation')
    }));
}
const cognitionIds = ['smell', 'taste', 'outerVision', 'innerVision', 'feeling', 'touch'];
for (const [index, id] of cognitionIds.entries()) foundationRecords.push(entry('cognition', id,
  ref(() => cognition(cognitionNames[index]), variableFile, `cognitionNames[${index}]`, 'td-ohd-variable')));

foundationRecords.push(entry('cross','introduction',ref(()=>t('Incarnation Cross'),'src/locales/ui-contexts.json','Incarnation Cross','td-ohd-presentation'),reviewedRef('cross.introduction','summary'),{detail:reviewedRef('cross.introduction','detail'),reviewStatus:'reviewed',version:2}));

// Dynamic identity, not a generated set of empty Cross articles.
export function crossRecord(query) {
  const rawId = query.objectId;
  if (!/^(RightAngle|LeftAngle|Juxtaposition)CrossOf[A-Za-z0-9]+$/.test(rawId)) return null;
  const cross = query.cross;
  if (cross?.rawId && cross.rawId !== rawId) throw new TypeError('Cross identity mismatch');
  return entry('cross', rawId,
    ref(() => cross ? crossName(cross) : rawId, 'src/lib/chart-engine/sharp-contract.js', 'incarnationCross', 'td-ohd-presentation'), reviewedRef('cross.introduction','summary'), {
      identitySource: ref(null, 'engine-core/TransitCore.cs', 'incarnationCross', 'sharp-identity'),
      properties: () => ({ rawId, introductionKnowledgeId:'hd.cross.introduction', ...(cross ? { gates: [...cross.gates], angle: cross.angle } : {}) }),
      propertySource: ref(null, 'src/lib/chart-engine/sharp-contract.js', 'derived.cross', 'td-ohd-presentation')
    });
}
