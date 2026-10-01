// TD-OHD local structural analysis. Source attribution and MIT terms: THIRD_PARTY_NOTICES.md.
// See THIRD_PARTY_NOTICES.md. No astronomical position calculation occurs here.
import { GATES, CHANNELS, CENTERS } from './human-design/catalog.js';
import { channelCircuit } from './circuit-topology.js';

// Accept the transit activation contract supplied by the SharpAstrology provider.
export function analyzeTransitActivations(natalChart, transits) {
  const natalGates = new Set(natalChart.gates?.all || []);
  const natalDefinedCenters = new Set(natalChart.centers?.definedNames || []);

  // Find channel completions: natal hanging gate + transit gate = complete channel
  const channelCompletions = [];
  const allGatesCombined = new Set([...natalGates, ...transits.activeGates]);

  for (const channel of CHANNELS) {
    const [gate1, gate2] = channel.gates;
    const combinedHasChannel = allGatesCombined.has(gate1) && allGatesCombined.has(gate2);
    const natalHasChannel = natalGates.has(gate1) && natalGates.has(gate2);

    if (combinedHasChannel && !natalHasChannel) {
      // This channel is completed by the transit
      const natalGate = natalGates.has(gate1) ? gate1 : (natalGates.has(gate2) ? gate2 : null);
      const transitGate = !natalGates.has(gate1) && transits.activeGates.includes(gate1) ? gate1 :
                          (!natalGates.has(gate2) && transits.activeGates.includes(gate2) ? gate2 : null);

      // Find which planet provides the transit gate
      const transitPlanet = Object.entries(transits.gates)
        .find(([, g]) => g.gate === transitGate)?.[0];

      channelCompletions.push({
        channel: channel.name,
        gates: channel.gates,
        centers: channel.centers,
        theme: channel.theme,
        circuit: channelCircuit(channel).group,
        natalGate,
        transitGate,
        transitPlanet,
        type: natalGate ? 'hanging_gate_completion' : 'pure_transit',
        significance: natalGate ? 'high' : 'moderate'
      });
    }
  }

  // Find temporarily defined centers
  const combinedChannels = CHANNELS.filter(ch =>
    allGatesCombined.has(ch.gates[0]) && allGatesCombined.has(ch.gates[1])
  );
  const combinedCenters = new Set();
  combinedChannels.forEach(ch => ch.centers.forEach(c => combinedCenters.add(c)));

  const temporarilyDefinedCenters = [];
  for (const center of combinedCenters) {
    if (!natalDefinedCenters.has(center)) {
      temporarilyDefinedCenters.push({
        center,
        centerName: CENTERS[center]?.name,
        theme: CENTERS[center]?.theme,
        notSelfTheme: CENTERS[center]?.notSelfTheme
      });
    }
  }

  // Identify transit gates that activate natal gates (same gate, different activation)
  const reinforcedGates = [];
  for (const transitGate of transits.activeGates) {
    if (natalGates.has(transitGate)) {
      const transitPlanet = Object.entries(transits.gates)
        .find(([, g]) => g.gate === transitGate)?.[0];
      reinforcedGates.push({
        gate: transitGate,
        gateName: GATES[transitGate]?.name,
        center: GATES[transitGate]?.center,
        transitPlanet,
        meaning: `Transit ${transitPlanet} reinforces your natal Gate ${transitGate} (${GATES[transitGate]?.name}) — this energy is amplified today.`
      });
    }
  }

  // Key transits: Sun gate (changes every ~6 days) and Moon gate (changes every ~10 hours)
  const sunGate = transits.gates.sun;
  const moonGate = transits.gates.moon;

  return {
    transitDate: transits.date,
    transitGates: transits.gates,
    channelCompletions,
    temporarilyDefinedCenters,
    reinforcedGates,
    highlights: {
      sun: {
        ...sunGate,
        completesChannel: channelCompletions.some(c => c.transitGate === sunGate.gate),
        reinforcesNatal: natalGates.has(sunGate.gate)
      },
      moon: {
        ...moonGate,
        completesChannel: channelCompletions.some(c => c.transitGate === moonGate.gate),
        reinforcesNatal: natalGates.has(moonGate.gate)
      }
    },
    stats: {
      channelCompletions: channelCompletions.length,
      hangingGateCompletions: channelCompletions.filter(c => c.type === 'hanging_gate_completion').length,
      temporarilyDefinedCenters: temporarilyDefinedCenters.length,
      reinforcedGates: reinforcedGates.length,
      totalTransitGates: transits.activeGateCount
    }
  };
}

export default analyzeTransitActivations;
