/** Shared, deliberately brief planetary activation context.
 * Sources: https://jovianarchive.com/pages/human-design-dictionary
 *          https://jovianarchive.com/blogs/chart-interpretations-components/planetary-accents-in-human-design
 */
const summaries = {
  sun: ['表达与生命力：被激活的闸门呈现太阳主题。', 'Expression and life force: the activated gate carries the Sun theme.', '表達與生命力：被啟動的閘門呈現太陽主題。'],
  earth: ['落地与平衡：与太阳相对，支持其主题在生活中落实。', 'Grounding and balance: opposite the Sun, it anchors that theme in lived experience.', '落地與平衡：與太陽相對，支持其主題在生活中落實。'],
  moon: ['推动力：被激活的闸门提示行动背后的驱动主题。', 'Driving force: the activated gate points to a theme behind movement and action.', '推動力：被啟動的閘門提示行動背後的驅動主題。'],
  northNode: ['未来方向与环境：交点描述逐渐走向的生活背景。', 'Future direction and environment: this node describes a developing life backdrop.', '未來方向與環境：交點描述逐漸走向的生活背景。'],
  southNode: ['早期方向与环境：交点描述较熟悉的生活背景。', 'Earlier direction and environment: this node describes a familiar life backdrop.', '早期方向與環境：交點描述較熟悉的生活背景。'],
  mercury: ['思考与表达：被激活的闸门提示值得传达的主题。', 'Thinking and communication: the activated gate marks a theme seeking expression.', '思考與表達：被啟動的閘門提示值得傳達的主題。'],
  venus: ['价值与关系：被激活的闸门为相处方式带来价值主题。', 'Values and relating: the activated gate colors how values appear in relationships.', '價值與關係：被啟動的閘門為相處方式帶來價值主題。'],
  mars: ['能量运用：被激活的闸门提示逐渐学会成熟使用的动力。', 'Use of energy: the activated gate points to a drive that can mature with experience.', '能量運用：被啟動的閘門提示逐漸學會成熟使用的動力。'],
  jupiter: ['原则与扩展：被激活的闸门呈现规则和保护的主题。', 'Principles and expansion: the activated gate carries themes of law and protection.', '原則與擴展：被啟動的閘門呈現規則和保護的主題。'],
  saturn: ['责任与限制：被激活的闸门提示需要认真面对的功课。', 'Responsibility and limits: the activated gate points to lessons of discipline.', '責任與限制：被啟動的閘門提示需要認真面對的功課。'],
  uranus: ['独特与改变：被激活的闸门提示突破旧模式的领域。', 'Uniqueness and change: the activated gate points to departures from old patterns.', '獨特與改變：被啟動的閘門提示突破舊模式的領域。'],
  neptune: ['遮蔽与看清：被激活的闸门提示容易误读、需要耐心观察的主题。', 'Veiling and perception: the activated gate points to a theme that may take time to see clearly.', '遮蔽與看清：被啟動的閘門提示容易誤讀、需要耐心觀察的主題。'],
  pluto: ['真相与转化：被激活的闸门提示深入面对的主题。', 'Truth and transformation: the activated gate points to a theme of deep change.', '真相與轉化：被啟動的閘門提示深入面對的主題。'],
};

const sources = {
  design: ['设计：出生前设计时刻的身体层面激活。', 'Design: a body-side activation at the pre-birth design moment.', '設計：出生前設計時刻的身體層面啟動。'],
  personality: ['人格：出生时刻的意识层面激活。', 'Personality: a conscious-side activation at birth.', '人格：出生時刻的意識層面啟動。'],
  transit: ['行运：所选时刻的临时激活，会随天体位置变化。', 'Transit: a temporary activation at the selected time.', '行運：所選時刻的臨時啟動，會隨天體位置變化。'],
};

// Concept cards describe the three calculation layers once, outside every
// individual planet. The design instant follows 88° of solar arc, not a fixed
// number of calendar days. Sources:
// https://engaginglearning.jovianarchive.com/Human_Design/The_Chart_and_BodyGraph/Activation
// https://jovianarchive.com/pages/human-design-dictionary
// https://jovianarchive.com/pages/understanding-transits-in-human-design
const concepts = {
  design: {
    name: ['设计', 'Design', '設計'],
    reading: [
      '设计列根据出生前太阳位置回退约 88°时的天体位置计算，通常以红色标示。在人类图体系中，它描述身体层面、本人未必容易察觉的特质。这个时刻按太阳位置确定，并非固定提前 88 天。',
      'The Design column uses planetary positions when the Sun was about 88° behind its birth position. Usually shown in red, it describes the body and traits that may be less consciously recognized. This moment is calculated from solar position, not a fixed 88 calendar days before birth.',
      '設計列根據出生前太陽位置回退約 88°時的天體位置計算，通常以紅色標示。在人類圖體系中，它描述身體層面、本人未必容易察覺的特質。這個時刻按太陽位置確定，並非固定提前 88 天。'
    ]
  },
  personality: {
    name: ['人格', 'Personality', '人格'],
    reading: [
      '人格列根据出生时刻的天体位置计算，通常以黑色标示。在人类图体系中，它描述本人较容易意识到和认同的特质。人格列与设计列共同构成出生图。',
      'The Personality column uses planetary positions at birth. Usually shown in black, it describes traits a person may more readily recognize and identify with. Together with the Design column, it forms the birth chart.',
      '人格列根據出生時刻的天體位置計算，通常以黑色標示。在人類圖體系中，它描述本人較容易意識到和認同的特質。人格列與設計列共同構成出生圖。'
    ]
  },
  transit: {
    name: ['行运', 'Transit', '行運'],
    reading: [
      '行运是太阳、月亮、交点及行星持续运行，在所选时刻形成的激活。把这些位置映射到人体图，可以查看当时激活的闸门；与出生图叠加时，也可能暂时补全通道、定义能量中心。行运状态随时间变化，不会改写出生图。',
      'Transits are activations formed by the changing positions of the Sun, Moon, lunar nodes and planets at a selected moment. Mapped onto a BodyGraph, they show temporarily active gates and may complete channels or define centers when overlaid on a birth chart. They change with time and do not alter the birth chart.',
      '行運是太陽、月亮、交點及行星持續運行，在所選時刻形成的啟動。把這些位置映射到人體圖，可以查看當時啟動的閘門；與出生圖疊加時，也可能暫時補全通道、定義能量中心。行運狀態隨時間變化，不會改寫出生圖。'
    ]
  }
};

const localeIndex = locale => locale?.startsWith('zh-Hant') ? 2 : locale?.startsWith('zh') ? 0 : 1;

export function planetReference(planet, locale = 'en') {
  return summaries[planet]?.[localeIndex(locale)] || '';
}

export function activationSourceReference(source, locale = 'en') {
  return sources[source]?.[localeIndex(locale)] || '';
}

export const ACTIVATION_CONCEPT_IDS = Object.freeze(Object.keys(concepts));
export function activationConceptName(id, locale = 'en') {
  return concepts[id]?.name[localeIndex(locale)] || '';
}
export function activationConceptReference(id, locale = 'en') {
  return concepts[id]?.reading[localeIndex(locale)] || '';
}
export function activationConceptAliases(id) {
  return concepts[id]?.name || [];
}

export const PLANET_REFERENCE_IDS = Object.freeze(Object.keys(summaries));

// Canonical chart-column order and symbols, shared by the graph and library.
export const PLANET_ORDER = Object.freeze([
  'sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
  'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
]);
export const PLANET_GLYPHS = Object.freeze({
  sun: '☉', earth: '⊕', moon: '☽', northNode: '☊', southNode: '☋',
  mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
  uranus: '♅', neptune: '♆', pluto: '♇'
});
export const PLANET_NAMES = Object.freeze({
  sun: 'Sun', earth: 'Earth', moon: 'Moon', northNode: 'North Node',
  southNode: 'South Node', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  pluto: 'Pluto'
});
