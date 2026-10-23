/**
 * Panel ↔ export parity (FINAL-spec §14, risk 7).
 *
 * The right column prints a channel distribution; the clipboard export prints a
 * channel list. They are two projections of the same `chart.channels`, so their
 * counts must agree. Nothing enforced that before: the export tests only checked
 * export text, and the export E2E compares Transit/Timeline sun values, which
 * cannot stand in for this.
 *
 * The assertion is deliberately two-sided — the panel side goes through
 * `circuitCounts()` (the panel's only counting exit) and the export side is
 * parsed back out of the formatted text, so a change to either projection that
 * breaks the agreement fails here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS } from '../src/lib/human-design/catalog.js';
import { channelCircuit } from '../src/lib/circuit-topology.js';
import { circuitCounts } from '../src/lib/panel-graphics/counts.js';
import { formatChartDataExport } from '../src/lib/chart-data-export.js';

const channel = key => CHANNELS.find(item => item.gates.join('-') === key);

function chart(channelKeys) {
  const channels = channelKeys.map(channel);
  const gates = [...new Set(channels.flatMap(item => item.gates))];
  const circuitAnalysis = {
    individual: { channels: 0, names: [] },
    collective: { channels: 0, names: [] },
    tribal: { channels: 0, names: [] },
    integration: { channels: 0, names: [] },
    dominant: null
  };
  for (const item of channels) circuitAnalysis[channelCircuit(item).group].channels += 1;
  return {
    type: { name: 'Generator' },
    authority: { name: 'Sacral' },
    definition: 'single',
    profile: { numbers: '4/1' },
    channels,
    gates: { all: gates, design: {}, personality: {} },
    centers: { definedNames: [], undefinedNames: [], openNames: [] },
    circuitAnalysis
  };
}

/**
 * The Channels section body, as the user would read it out of the clipboard.
 * Matched by position, not by header text: the export is localised, so the
 * header is 【Channels】 / 【通道】 / 【通道】 depending on locale. Channels is
 * always the third section (title, Basic structure, Centers, Channels, …).
 */
function exportedChannelLines(text) {
  const sections = text.split('\n\n').filter(block => block.startsWith('【'));
  const body = sections[2];
  assert.ok(body, `export has no Channels section (found ${sections.length} sections)`);
  return body.split('\n').slice(1).filter(Boolean);
}

test('the panel distribution and the export list agree on the channel count', () => {
  for (const keys of [['1-8', '7-31', '6-59', '2-14'], ['1-8'], []]) {
    const model = chart(keys);
    const panelTotal = circuitCounts(model).reduce((sum, group) => sum + group.count, 0);
    const lines = exportedChannelLines(formatChartDataExport({ chart: model }));
    // An empty chart exports a single em-dash placeholder, not zero lines.
    const expected = keys.length || 1;
    assert.equal(panelTotal, keys.length, `panel total for ${keys.length} channels`);
    assert.equal(lines.length, expected, `export lines for ${keys.length} channels`);
    if (keys.length) assert.equal(panelTotal, lines.length, 'panel and export disagree');
  }
});

test('every exported channel line is one of the counted channels', () => {
  const keys = ['1-8', '7-31', '6-59', '2-14'];
  const model = chart(keys);
  const lines = exportedChannelLines(formatChartDataExport({ chart: model }));
  const exported = lines.map(line => line.split(' · ')[0]);
  assert.deepEqual(exported.sort(), [...keys].sort());
});
