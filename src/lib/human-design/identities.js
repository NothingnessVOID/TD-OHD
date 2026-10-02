// Neutral identities. No prose and no calculation-adapter dependency.
export const definitionIds = { Empty: 'none', SingleDefinition: 'single', SplitDefinition: 'split', TripleSplit: 'tripleSplit', QuadrupleSplit: 'quadrupleSplit' };
export const definitionNames = { Empty: 'No Definition', SingleDefinition: 'Single Definition', SplitDefinition: 'Split Definition', TripleSplit: 'Triple Split Definition', QuadrupleSplit: 'Quadruple Split Definition' };
export const authorityNames = { emotional:'Emotional Authority', sacral:'Sacral Authority', splenic:'Splenic Authority', egoManifested:'Ego Manifested Authority', egoProjected:'Ego-Projected Authority', selfProjected:'Self-Projected Authority', mental:'Mental/Environment', lunar:'Lunar Authority' };
// Official structured display facts; legacy chart calculation output remains unchanged.
export const typeFacts = {
 generator:{ family:'generator', taxonomy:'type', strategy:'Wait to Respond', signature:'Satisfaction', notSelf:'Frustration' },
 manifestingGenerator:{ family:'generator', taxonomy:'subtype', strategy:'Wait to Respond', signature:'Satisfaction', notSelf:'Frustration' },
 manifestor:{ family:'manifestor', taxonomy:'type', strategy:'Inform', signature:'Peace', notSelf:'Anger' },
 projector:{ family:'projector', taxonomy:'type', strategy:'Wait for Recognition and Invitation', signature:'Success', notSelf:'Bitterness' },
 reflector:{ family:'reflector', taxonomy:'type', strategy:'Wait a Lunar Cycle', signature:'Surprise', notSelf:'Disappointment' }
};
export const profileGeometry = { '1/3':'rightAngle', '1/4':'rightAngle', '2/4':'rightAngle', '2/5':'rightAngle', '3/5':'rightAngle', '3/6':'rightAngle', '4/6':'rightAngle', '4/1':'juxtaposition', '5/1':'leftAngle', '5/2':'leftAngle', '6/2':'leftAngle', '6/3':'leftAngle' };
export const definitionFacts = { none:{taxonomy:'state',componentCount:0},single:{taxonomy:'type',componentCount:1},split:{taxonomy:'type',componentCount:2},tripleSplit:{taxonomy:'type',componentCount:3},quadrupleSplit:{taxonomy:'type',componentCount:4} };
