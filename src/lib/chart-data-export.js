/** Anonymous calculation results only. Never accepts or traverses birth profiles. */
import { t } from './i18n.js';
import { typeName, strategy, authorityName, profileName, definitionName, signature, notSelf, centerName, channelName, planetName, variable } from './vocabulary.js';
import { crossName } from './content.js';
import { variableDirection } from './variable-arrows.js';
import { PLANET_ORDER } from './planet-reference.js';
import { formatTransitOffset } from './transit-time.js';

const validGate = gate => Number.isInteger(gate) && gate >= 1 && gate <= 64;
export function exportGateLine(value) {
  if (!validGate(value?.gate) || !Number.isInteger(value?.line) || value.line < 1 || value.line > 6) {
    if (value != null && import.meta.env?.DEV) console.warn('Invalid Gate.Line in chart data export');
    return '—';
  }
  return `${value.gate}.${value.line}`;
}

/** Detached, frozen whitelist; callers cannot mutate the rendered snapshot. */
export function transitExportSnapshot(activations, { date, time, offset }) {
  return Object.freeze({
    activations: Object.freeze(Object.fromEntries(PLANET_ORDER.map(id => {
      const value = activations[id];
      return [id, Object.freeze({
        gate: typeof value?.gate === 'number' ? value.gate : undefined,
        line: typeof value?.line === 'number' ? value.line : undefined,
      })];
    }))),
    date, time, offset,
  });
}

export function formatChartDataExport({ chart, transit = null, transitMoment = null }) {
  if (!chart) throw new TypeError('Chart results unavailable');
  const field = (label, value) => `${t(label)}: ${value || '—'}`;
  const section = (label, lines) => `【${t(label)}】\n${lines.join('\n')}`;
  const cross = chart.incarnationCross;
  const gates = cross?.gates || [];
  const gateCombination = gates.length === 4
    ? `${gates.slice(0, 2).map(g => validGate(g) ? g : '—').join('/')} | ${gates.slice(2).map(g => validGate(g) ? g : '—').join('/')}` : '—';
  const profile = chart.profile?.numbers;
  const parts = [t('Human Design data'), section('Basic structure', [
    field('Type', typeName(chart.type?.name)),
    field('Strategy', strategy(chart.type?.name)),
    field('Authority', authorityName(chart.authority?.name)),
    field('Profile', profile ? `${profile} ${profileName(profile)}`.trim() : '—'),
    field('Definition', definitionName(chart.definition)),
    field('Signature', signature(chart.type?.name)),
    field('Not-Self Theme', notSelf(chart.type?.name)),
    field('Incarnation Cross', cross ? crossName(cross) : '—'),
    field('Gate combination', gateCombination),
  ])];
  const centers = keys => keys?.length ? keys.map(centerName).join(' · ') : '—';
  parts.push(section('Centers', [
    field('Defined', centers(chart.centers?.definedNames)),
    field('Undefined', centers(chart.centers?.undefinedNames)),
    field('Completely open', centers(chart.centers?.openNames)),
  ]));
  parts.push(section('Channels', chart.channels?.length
    ? chart.channels.map(channel => `${channel.gates.join('-')} · ${channelName(channel.gates)}`) : ['—']));
  if (chart.variable) {
    const v = chart.variable;
    const slotLine = (key, label) => {
      const slot = v[key];
      const direction = variableDirection(slot);
      const dir = direction === 'left' ? 'L' : direction === 'right' ? 'R' : '—';
      const bounded = value => Number.isInteger(value) && value >= 1 && value <= 6 ? value : '—';
      return field(label, `${dir} · ${slot ? variable(slot)[0] : '—'} · Color ${bounded(slot?.color)} / Tone ${bounded(slot?.tone)}`);
    };
    parts.push(section('Variable', [field('Standard notation', v.notation), t('Personality'),
      slotLine('motivation', 'Motivation'), slotLine('perspective', 'Perspective'),
      t('Design'), slotLine('determination', 'Determination'), slotLine('environment', 'Environment')]));
  }
  parts.push(section('Planetary activations', PLANET_ORDER.map(id =>
    `${planetName(id)}: ${t('Personality')} ${exportGateLine(chart.gates?.personality?.[id])} ｜ ${t('Design')} ${exportGateLine(chart.gates?.design?.[id])}`)));
  if (transit) {
    if (!transitMoment || !/^\d{4}-\d{2}-\d{2}$/.test(transitMoment.date)
      || !/^\d{2}:\d{2}:\d{2}$/.test(transitMoment.time) || !Number.isFinite(transitMoment.offset)) {
      throw new TypeError('Transit timestamp unavailable');
    }
    parts.push(section('Transit', [field('Selected moment', `${transitMoment.date} ${transitMoment.time} ${formatTransitOffset(transitMoment.offset).replace(/^UTC/, 'GMT')}`),
      ...PLANET_ORDER.map(id => `${planetName(id)}: ${exportGateLine(transit[id])}`)]));
  }
  return parts.join('\n\n');
}
