// Local presentation metadata; not returned by SharpAstrology. Text preserved unchanged.
export const variableNames = {
  determination: ['Appetite', 'Taste', 'Thirst', 'Touch', 'Sound', 'Light'],
  environment: ['Caves', 'Markets', 'Kitchens', 'Mountains', 'Valleys', 'Shores'],
  motivation: ['Fear', 'Hope', 'Desire', 'Need', 'Guilt', 'Innocence'],
  perspective: ['Survival', 'Possibility', 'Power', 'Wanting', 'Probability', 'Personal']
};
export const cognitionNames = ['Smell', 'Taste', 'Outer Vision', 'Inner Vision', 'Feeling', 'Touch'];
export const variableDescriptions = {
  determination: [
    'Eat simple, one thing at a time. Consecutive diet.',
    'Sensitive palate. Open or closed taste preferences.',
    'Temperature sensitivity. Hot or cold food and drink.',
    'Environment affects digestion. Calm surroundings needed.',
    'Acoustic environment matters. Sound affects metabolism.',
    'Light conditions affect eating. Direct or indirect light.'
  ],
  environment: [
    'Enclosed, protected, selective spaces. Privacy and shelter.',
    'Places of exchange and gathering. Commercial, busy spaces.',
    'Transformative spaces where things are heated and prepared.',
    'Elevated spaces with views and room to see.',
    'Acoustically rich environments. Sounds and resonance.',
    'Transitional spaces. Edges, boundaries, thresholds.'
  ],
  motivation: [
    'Motivated to understand the unknown. Natural researcher and learner.',
    'Motivated by patience and trust. Waits and observes before acting.',
    'Motivated to move and organize. Initiates with purpose.',
    'Motivated by service. Identifies what must be done for the collective.',
    'Motivated by deep responsibility. Driven to fix and manage.',
    'Motivated by non-doing. Shows up without agenda or expectation.'
  ],
  perspective: [
    'Awareness focused on security and self-preservation.',
    'Open, optimistic view. Sees potential everywhere.',
    'Focused on influence and impact. Sees dynamics of control.',
    'Driven by desire. Sees what is needed or missing.',
    'Analytical, practical view. Calculates odds and outcomes.',
    'Introspective, self-reflective, deeply personal lens.'
  ]
};


// Stable IDs are independent of editable display names.
const variableValueIds = {
  determination: ['appetite', 'taste', 'thirst', 'touch', 'sound', 'light'],
  environment: ['caves', 'markets', 'kitchens', 'mountains', 'valleys', 'shores'],
  motivation: ['fear', 'hope', 'desire', 'need', 'guilt', 'innocence'],
  perspective: ['survival', 'possibility', 'power', 'wanting', 'probability', 'personal']
};
export const variableValueId = (kind, color) => variableValueIds[kind][color - 1];

export function variablePresentation(kind, color, tone) {
  return { name: variableNames[kind][color - 1], description: variableDescriptions[kind][color - 1],
    ...(kind === 'determination' ? { cognition: { name: cognitionNames[tone - 1] } } : {}) };
}
