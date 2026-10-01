// TD-OHD local structural analysis. Source attribution and MIT terms: THIRD_PARTY_NOTICES.md.
// See THIRD_PARTY_NOTICES.md. No astronomical position calculation occurs here.
import { GATES, GENE_KEY_SPECTRUM } from './human-design/catalog.js';

export function calculateGeneKeys(humanDesignResult) {
  const { personality, design } = humanDesignResult.gates;

  // Helper to create sphere data (now includes line number)
  const createSphere = (gateData, sphereName) => {
    const gate = gateData?.gate || gateData;
    const line = gateData?.line || null;
    return {
      key: gate,
      line: line,
      keyLine: line ? `${gate}.${line}` : String(gate),
      name: GATES[gate]?.name || `Gate ${gate}`,
      sphere: sphereName,
      shadow: GENE_KEY_SPECTRUM[gate]?.[0] || 'Shadow',
      gift: GENE_KEY_SPECTRUM[gate]?.[1] || 'Gift',
      siddhi: GENE_KEY_SPECTRUM[gate]?.[2] || 'Siddhi',
      spectrum: GENE_KEY_SPECTRUM[gate] || ['Shadow', 'Gift', 'Siddhi']
    };
  };

  // ACTIVATION SEQUENCE - The 4 Prime Gifts
  const activationSequence = {
    lifeWork: createSphere(personality.sun, "Life's Work"),
    evolution: createSphere(personality.earth, "Evolution"),
    radiance: createSphere(design.sun, "Radiance"),
    purpose: createSphere(design.earth, "Purpose")
  };

  // VENUS SEQUENCE - Relationships
  const venusSequence = {
    attraction: createSphere(design.moon, "Attraction"),
    iq: createSphere(personality.venus, "IQ"),
    eq: createSphere(personality.mars, "EQ"),
    sq: createSphere(design.venus, "SQ")
  };

  // PEARL SEQUENCE - Prosperity
  const pearlSequence = {
    vocation: createSphere(design.mars, "Vocation"),
    culture: createSphere(design.jupiter, "Culture"),
    pearl: createSphere(personality.jupiter, "Pearl")
  };

  // Calculate the 3 Pathways of the Activation Sequence
  const pathways = {
    challenge: `${activationSequence.lifeWork.key} → ${activationSequence.evolution.key}`,
    breakthrough: `${activationSequence.evolution.key} → ${activationSequence.radiance.key}`,
    coreStability: `${activationSequence.radiance.key} → ${activationSequence.purpose.key}`
  };

  // Core is the same Gene Key as Vocation (Design Mars) - viewed through Venus Sequence lens
  const core = createSphere(design.mars, "Core");

  // Brand is the same Gene Key as Life's Work (Personality Sun) - viewed through Pearl Sequence lens
  const brand = createSphere(personality.sun, "Brand");

  // All unique Gene Keys in the profile (11 total, but some spheres share keys)
  const allKeys = [
    activationSequence.lifeWork,
    activationSequence.evolution,
    activationSequence.radiance,
    activationSequence.purpose,
    venusSequence.attraction,
    venusSequence.iq,
    venusSequence.eq,
    venusSequence.sq,
    pearlSequence.vocation, // Same as Core
    pearlSequence.culture,
    pearlSequence.pearl
  ];

  return {
    // Activation Sequence (primary)
    ...activationSequence,

    // Full sequences
    activationSequence,
    venusSequence,
    pearlSequence,

    // Shared spheres (same Gene Key, different lens)
    core, // Same as vocation
    brand, // Same as lifeWork

    // Pathways
    pathways,

    // All Gene Keys in profile
    allKeys,

    // Summary
    primeGifts: [
      activationSequence.lifeWork.gift,
      activationSequence.evolution.gift,
      activationSequence.radiance.gift,
      activationSequence.purpose.gift
    ],

    summary: `Life's Work: ${activationSequence.lifeWork.keyLine} (${activationSequence.lifeWork.gift}), ` +
             `Evolution: ${activationSequence.evolution.keyLine} (${activationSequence.evolution.gift}), ` +
             `Radiance: ${activationSequence.radiance.keyLine} (${activationSequence.radiance.gift}), ` +
             `Purpose: ${activationSequence.purpose.keyLine} (${activationSequence.purpose.gift})`,

    note: 'Gene Keys profile calculated from Human Design planetary positions'
  };
}
