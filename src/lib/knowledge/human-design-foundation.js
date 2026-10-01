import { definitionIds, definitionNames } from '../chart-engine/sharp-contract.js';
import { TYPES, AUTHORITIES, PROFILES } from '../human-design/catalog.js';
import { variableNames, variableDescriptions, variableValueId, cognitionNames } from '../human-design/variable-data.js';
import { typeName, authorityName, profileName, definitionName, variable, cognition, typeDescription, strategy, signature, notSelf } from '../vocabulary.js';
import { contentText, crossName } from '../content.js';

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
export const foundationRecords = [];
for (const [id, type] of Object.entries(TYPES)) foundationRecords.push(entry('type', id,
  ref(() => typeName(type.name), catalogFile, `TYPES.${id}.name`),
  ref(() => contentText(type.description), catalogFile, `TYPES.${id}.description`), {
    legacySlots: { heroSummary: ref(() => typeDescription(type.name), 'src/locales/en.js', `TYPE_PLAIN[${type.name}]`, 'td-ohd-presentation', { role: 'hero-summary', translations: ['src/locales/zh-CN/vocabulary.js', 'src/locales/zh-Hant/vocabulary.js'] }) },
    properties: () => ({ strategy: strategy(type.name), signature: signature(type.name), notSelf: notSelf(type.name), percentage: type.percentage }),
    propertySource: ref(null, catalogFile, `TYPES.${id}`)
  }));
const authorityFamilies = { emotional:'emotional', sacral:'sacral', splenic:'splenic', egoManifested:'ego', egoProjected:'ego', selfProjected:'self', mental:'mental', lunar:'lunar' };
for (const [id, family] of Object.entries(authorityFamilies)) {
  const authority = AUTHORITIES[family];
  const shared = family === 'ego' ? { sharedReference: 'legacy.authority.ego', note: 'shared legacy copy; subtype-specific explanation unavailable' } : {};
  foundationRecords.push(entry('authority', id,
    ref(() => authorityName(authority.name), catalogFile, `AUTHORITIES.${family}.name`, 'legacy-hd-static', shared),
    ref(() => contentText(authority.description), catalogFile, `AUTHORITIES.${family}.description`, 'legacy-hd-static', shared),
    { properties: () => ({ family }), propertySource: ref(null, catalogFile, `AUTHORITIES.${family}`) }));
}
for (const [id, profile] of Object.entries(PROFILES)) foundationRecords.push(entry('profile', id,
  ref(() => profileName(id), catalogFile, `PROFILES[${id}].name`),
  ref(() => contentText(profile.theme), catalogFile, `PROFILES[${id}].theme`)));
for (const [rawId, id] of Object.entries(definitionIds)) foundationRecords.push(entry('definition', id,
  ref(() => definitionName(definitionNames[rawId]), 'src/lib/chart-engine/sharp-contract.js', `definitionNames.${rawId}`, 'td-ohd-presentation')));
for (const [kind, names] of Object.entries(variableNames)) for (let color = 1; color <= 6; color++) {
  const valueId = variableValueId(kind, color), name = names[color - 1];
  foundationRecords.push(entry('variable', `${kind}:${valueId}`,
    ref(() => variable({ name })[0], variableFile, `variableNames.${kind}[${color - 1}]`, 'td-ohd-variable'), null, {
      detail: ref(() => contentText(variableDescriptions[kind][color - 1]), variableFile, `variableDescriptions.${kind}[${color - 1}]`, 'td-ohd-variable', { role: 'existing-variable-panel' }),
      properties: () => ({ kind, valueId, color }), propertySource: ref(null, variableFile, 'variableValueId', 'td-ohd-presentation')
    }));
}
const cognitionIds = ['smell', 'taste', 'outerVision', 'innerVision', 'feeling', 'touch'];
for (const [index, id] of cognitionIds.entries()) foundationRecords.push(entry('cognition', id,
  ref(() => cognition(cognitionNames[index]), variableFile, `cognitionNames[${index}]`, 'td-ohd-variable')));

// Dynamic identity, not a generated set of empty Cross articles.
export function crossRecord(query) {
  const rawId = query.objectId;
  if (!/^(RightAngle|LeftAngle|Juxtaposition)CrossOf[A-Za-z0-9]+$/.test(rawId)) return null;
  const cross = query.cross;
  if (cross?.rawId && cross.rawId !== rawId) throw new TypeError('Cross identity mismatch');
  return entry('cross', rawId,
    ref(() => cross ? crossName(cross) : rawId, 'src/lib/chart-engine/sharp-contract.js', 'incarnationCross', 'td-ohd-presentation'), null, {
      identitySource: ref(null, 'engine-core/TransitCore.cs', 'incarnationCross', 'sharp-identity'),
      properties: () => ({ rawId, ...(cross ? { gates: [...cross.gates], angle: cross.angle } : {}) }),
      propertySource: ref(null, 'src/lib/chart-engine/sharp-contract.js', 'derived.cross', 'td-ohd-presentation')
    });
}
