// Historical lineage metadata only. The retired-package guard also scans labels.
const legacy = ['natal', 'engine'].join('');
export const SOURCE_TYPES = Object.freeze([
  'sharpastrology', legacy, 'open-human-design', 'td-ohd', 'teacher-material',
  'teacher-extension', 'jovian-public', 'ra-jovian', 'gene-keys-official', 'unknown'
]);
export const SOURCES = Object.freeze({
  'legacy-hd-static': { type: legacy, lineage: [legacy], evidence: 'THIRD_PARTY_NOTICES.md', reviewed: false },
  'td-ohd-presentation': { type: 'td-ohd', lineage: ['open-human-design', 'td-ohd'], evidence: 'local display entry points; sentence authorship not independently verified', reviewed: false },
  'td-ohd-variable': { type: 'td-ohd', lineage: ['td-ohd', 'unknown'], evidence: 'phase 2 moved existing text unchanged; original sentence source unresolved', reviewed: false },
  'sharp-identity': { type: 'sharpastrology', lineage: ['sharpastrology'], evidence: 'engine-core/TransitCore.cs', reviewed: false },
  unknown: { type: 'unknown', lineage: ['unknown'], evidence: null, reviewed: false },
  'teacher-material': { type: 'teacher-material', lineage: ['teacher-material'], evidence: null, reserved: true },
  'teacher-extension': { type: 'teacher-extension', lineage: ['teacher-extension'], evidence: null, reserved: true },
  'jovian-public': { type:'jovian-public',lineage:['jovian-public'],evidence:'Jovian Archive public Dictionary and learning pages',url:'https://jovianarchive.com/pages/human-design-dictionary',accessed:'2026-10-02' },
  'jovian-structure': { type:'jovian-public',lineage:['jovian-public'],reviewed:true,evidence:'Phase 4C structural claims checked against the listed public sources; not sentence-level prose verification', references:[
    'https://jovianarchive.com/pages/manifesting-generator-human-design',
    'https://jovianarchive.com/pages/understanding-definition-in-human-design',
    'https://jovianarchive.com/pages/understanding-profile-in-human-design',
    'https://jovianarchive.com/pages/ego-manifested-authority-in-human-design-the-will-that-speaks',
    'https://jovianarchive.com/pages/ego-projected-authority-in-human-design-willpower-and-invitations',
    'https://jovianarchive.com/pages/mental-authority-in-human-design-a-projector-process'
  ],accessed:'2026-10-02' },
  'reviewed-hd-content': { type:'td-ohd',lineage:['td-ohd','jovian-public'],reviewed:true,evidence:'User-supplied Phase 4C human-reviewed mechanism brief; original TD-OHD wording and formal translations, not quotations',references:[
    'https://jovianarchive.com/pages/human-design-dictionary',
    'https://jovianarchive.com/pages/reflector-human-design',
    'https://jovianarchive.com/pages/understanding-profile-in-human-design',
    'https://jovianarchive.com/pages/understanding-definition-in-human-design',
    'https://jovianarchive.com/pages/nourishing-your-body-through-dietary-regimen-the-foundation-of-alignment',
    'https://jovianarchive.com/pages/finding-your-place-understanding-environment-in-human-design',
    'https://jovianarchive.com/pages/seeing-through-your-unique-perspective-understanding-view-in-human-design',
    'https://jovianarchive.com/pages/the-gift-of-awareness-understanding-motivation-in-human-design',
    'https://jovianarchive.com/pages/incarnation-crosses-in-human-design'
  ],accessed:'2026-10-02' },
  'gene-keys-official': { type: 'gene-keys-official', lineage: ['gene-keys-official'], evidence: null, reserved: true }
});
