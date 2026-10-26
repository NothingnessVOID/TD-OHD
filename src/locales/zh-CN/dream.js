/**
 * Simplified-Chinese DreamRave (sleep chart) display vocabulary.
 *
 * The sleep design reuses the waking gate, channel and centre IDs, but the same
 * gate means something different at night, so its name lives here instead of in
 * GATE_ZH. Structural identity stays English and stable; only presentation moves.
 *
 * Dream gate names and the six dream line themes follow Ra Uru Hu's DreamRave.
 * The teacher's own fuller readings will slot into the knowledge content layer.
 */

/** gate -> dream name. Fifteen gates only; the waking name is never reused here. */
export const DREAM_GATE_ZH = {
  62: '爱',
  20: '看见',
  57: '调频',
  8: '黑暗',
  1: '喜悦',
  12: '变异',
  27: '渴望',
  50: '性',
  5: '时间',
  15: '混沌',
  19: '环境',
  53: '飞离',
  42: '死亡',
  38: '攻击',
  28: '恐惧'
};

/** line -> dream line theme. Applies to all fifteen gates. */
export const DREAM_LINE_ZH = {
  1: '秘密',
  2: '占有',
  3: '动荡',
  4: '痴迷',
  5: '幻想',
  6: '愿景'
};

export const DREAM_REALM_ZH = {
  light: '光场',
  earth: '地球层面',
  demon: '噩梦领域'
};

export const DREAM_TYPE_ZH = {
  generator: '生产者',
  projector: '投射者',
  reflector: '反映者'
};

export const zhDreamGate = gate => DREAM_GATE_ZH[gate] || `第 ${gate} 闸门`;
export const zhDreamLine = line => DREAM_LINE_ZH[line] || `第 ${line} 爻`;
export const zhDreamRealm = realm => DREAM_REALM_ZH[realm] || realm || '—';
export const zhDreamType = id => DREAM_TYPE_ZH[id] || id || '—';
