/**
 * Traditional-Chinese DreamRave (sleep chart) display vocabulary.
 *
 * Regional terminology is reviewed independently of Simplified Chinese, so this
 * file owns its own wording rather than converting it. Structural identity
 * (gate, channel and centre IDs) stays English and stable.
 */

export const DREAM_GATE_ZH = {
  62: '愛',
  20: '看見',
  57: '調頻',
  8: '黑暗',
  1: '喜悅',
  12: '變異',
  27: '渴望',
  50: '性',
  5: '時間',
  15: '混沌',
  19: '環境',
  53: '飛離',
  42: '死亡',
  38: '攻擊',
  28: '恐懼'
};

export const DREAM_LINE_ZH = {
  1: '祕密',
  2: '佔有',
  3: '動盪',
  4: '痴迷',
  5: '幻想',
  6: '願景'
};

export const DREAM_REALM_ZH = {
  light: '光場',
  earth: '地球層面',
  demon: '噩夢領域'
};

export const DREAM_TYPE_ZH = {
  generator: '生產者',
  projector: '投射者',
  reflector: '反映者'
};

export const zhDreamGate = gate => DREAM_GATE_ZH[gate] || `第 ${gate} 閘門`;
export const zhDreamLine = line => DREAM_LINE_ZH[line] || `第 ${line} 爻`;
export const zhDreamRealm = realm => DREAM_REALM_ZH[realm] || realm || '—';
export const zhDreamType = id => DREAM_TYPE_ZH[id] || id || '—';
