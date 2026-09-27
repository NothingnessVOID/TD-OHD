/** Final Chinese readings: one file per domain; no review-overlay precedence. */
import catalog from './engine-messages.json' with { type: 'json' };
import templateSources from './engine-templates.json' with { type: 'json' };
import gates from './gates.json' with { type: 'json' };
import lines from './lines.json' with { type: 'json' };
import channels from './channels.json' with { type: 'json' };
import hexagrams from './hexagrams.json' with { type: 'json' };
import geneKeys from './gene-keys.json' with { type: 'json' };
import { createChineseReadings } from '../chinese-readings.js';
import * as vocabulary from './vocabulary.js';

export const GATE_DESCRIPTIONS = gates;
export const LINE_DESCRIPTIONS = lines;
export const CHANNEL_DESCRIPTIONS = channels;
export const HEXAGRAM_DESCRIPTIONS = Object.fromEntries(Object.entries(hexagrams).map(([number, data]) => [number, { name: vocabulary.HEXAGRAM_ZH[number], ...data }]));
export const GENE_KEY_DESCRIPTIONS = geneKeys;

const adapter = createChineseReadings({
  catalog, templateSources, gates, lines, channels, hexagrams: HEXAGRAM_DESCRIPTIONS, vocabulary,
  crossAngles: { 'Right Angle': '右角', 'Left Angle': '左角', Juxtaposition: '並列' },
  crossLabel: '輪迴交叉之', unknown: '未知'
});
export const zhText = adapter.text;
export const zhCross = adapter.cross;
