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

const localeIndex = locale => locale?.startsWith('zh-Hant') ? 2 : locale?.startsWith('zh') ? 0 : 1;

export function planetReference(planet, locale = 'en') {
  return summaries[planet]?.[localeIndex(locale)] || '';
}

export function activationSourceReference(source, locale = 'en') {
  return sources[source]?.[localeIndex(locale)] || '';
}

export const PLANET_REFERENCE_IDS = Object.freeze(Object.keys(summaries));
