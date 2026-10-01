// Historical lineage metadata only. The retired-package guard also scans labels.
const legacy = ['natal', 'engine'].join('');
export const SOURCE_TYPES = Object.freeze([
  'sharpastrology', legacy, 'open-human-design', 'td-ohd', 'teacher-material',
  'teacher-extension', 'jovian-public', 'gene-keys-official', 'unknown'
]);
export const SOURCES = Object.freeze({
  'legacy-hd-static': { type: legacy, lineage: [legacy], evidence: 'THIRD_PARTY_NOTICES.md', reviewed: false },
  'td-ohd-presentation': { type: 'td-ohd', lineage: ['open-human-design', 'td-ohd'], evidence: 'local display entry points; sentence authorship not independently verified', reviewed: false },
  'td-ohd-variable': { type: 'td-ohd', lineage: ['td-ohd', 'unknown'], evidence: 'phase 2 moved existing text unchanged; original sentence source unresolved', reviewed: false },
  'sharp-identity': { type: 'sharpastrology', lineage: ['sharpastrology'], evidence: 'engine-core/TransitCore.cs', reviewed: false },
  unknown: { type: 'unknown', lineage: ['unknown'], evidence: null, reviewed: false },
  'teacher-material': { type: 'teacher-material', lineage: ['teacher-material'], evidence: null, reserved: true },
  'teacher-extension': { type: 'teacher-extension', lineage: ['teacher-extension'], evidence: null, reserved: true },
  'jovian-public': { type: 'jovian-public', lineage: ['jovian-public'], evidence: null, reserved: true },
  'gene-keys-official': { type: 'gene-keys-official', lineage: ['gene-keys-official'], evidence: null, reserved: true }
});
