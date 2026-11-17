/** One registered knowledge identity per quarter. Presentation reads the lens copy from
 * quarter-content.js; identity, purpose theme and the 16 gates come from the same stable
 * quarter module, so no second gate table and no separate per-lens object identities.
 */
import { QUARTER_IDS, quarterName, quarterGatesFor } from '../quarter.js';
import { quarterTheme, quarterLensText } from '../quarter-content.js';
import { getLocale } from '../i18n.js';

const SOURCE = 'quarter-three-view-2026';
const CONTENT_FILE = 'src/lib/quarter-content.js';

const reference = (read, file, path) => ({ read, sourceId: SOURCE, file, path, reviewStatus: 'reviewed', version: 1 });

function quarterRecord(id) {
  return {
    id: `hd.quarter.${id}`,
    domain: 'human-design',
    objectType: 'quarter',
    objectId: id,
    name: reference(() => quarterName(id, getLocale()), 'src/lib/quarter.js', `labels.${id}`),
    summary: reference(() => quarterTheme(id, getLocale()), CONTENT_FILE, `content.${id}.theme`),
    detail: reference(() => quarterLensText(id, 'hd', getLocale()), CONTENT_FILE, `content.${id}.hd`),
    reviewStatus: 'reviewed',
    version: 1,
    properties: () => ({ id, gates: quarterGatesFor(id) }),
    propertySource: { sourceId: 'jovian-structure', file: 'src/lib/quarter.js', path: 'quarterGroups', reviewStatus: 'reviewed', version: 1 }
  };
}

export const quarterRecords = QUARTER_IDS.map(quarterRecord);
