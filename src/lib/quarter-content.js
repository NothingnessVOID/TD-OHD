/** Four-quarter reading copy for the three explicit lenses.
 * Source: the user-supplied three-version material (Human Design / BG5 business / love),
 * 2026-11-17. Simplified Chinese is the working text; Traditional and English are faithful
 * adaptations. Presentation only: no source labels, scores, fit verdicts or organization advice.
 */
import { t } from './i18n.js';
import './quarter-messages.js';

export const QUARTER_LENS_IDS = Object.freeze(['hd', 'business', 'love']);

const content = {
  initiation: {
    theme: {
      en: 'Purpose fulfilled through Mind',
      'zh-CN': '通过心智来构建目标（Purpose fulfilled through Mind）',
      'zh-Hant': '透過心智來建構目標（Purpose fulfilled through Mind）'
    },
    hd: {
      en: 'This quarter leans toward mind, awakening and the first sprouting of ideas. Mind and awareness are the entry point for advancing its theme.',
      'zh-CN': '偏向心智、觉醒、理念的萌芽。以心智意识作为推进该主题的切入点。',
      'zh-Hant': '偏向心智、覺醒、理念的萌芽。以心智意識作為推進該主題的切入點。'
    },
    business: {
      en: 'It focuses on innovation in the mental field: conceptual work, knowledge transmission and starting things at the level of thought, rather than physical construction.',
      'zh-CN': '关注精神领域的创新、概念化、知识传播以及思想层面的启动，不涉及具体的物理建造。',
      'zh-Hant': '關注精神領域的創新、概念化、知識傳播以及思想層面的啟動，不涉及具體的物理建造。'
    },
    love: {
      en: 'Love begins with understanding: shared ideas and mental resonance come first; being able to talk and think alike is what draws you close.',
      'zh-CN': '爱从理解开始：重视心智与观念的共鸣，聊得来、想法相通才会靠近。',
      'zh-Hant': '愛從理解開始：重視心智與觀念的共鳴，聊得來、想法相通才會靠近。'
    }
  },
  civilization: {
    theme: {
      en: 'Purpose fulfilled through Form',
      'zh-CN': '通过形式来构建目标（Purpose fulfilled through Form）',
      'zh-Hant': '透過形式來建構目標（Purpose fulfilled through Form）'
    },
    hd: {
      en: 'This quarter leans toward form, manifestation, matter and structure. Its task is to turn the theme into visible institutions, works or real outcomes.',
      'zh-CN': '偏向形式、显化、物质与结构。任务是把这个主题转化为可见的制度、作品或现实成果。',
      'zh-Hant': '偏向形式、顯化、物質與結構。任務是把這個主題轉化為可見的制度、作品或現實成果。'
    },
    business: {
      en: 'It focuses on building in the material world: growth, giving form to ideas and producing actual results — making a concept land as something visible.',
      'zh-CN': '关注物质世界的建设、繁衍、形式的具象化与实际的产出，让构想落地为可见的物质成果。',
      'zh-Hant': '關注物質世界的建設、繁衍、形式的具象化與實際的產出，讓構想落地為可見的物質成果。'
    },
    love: {
      en: 'Love has to take form: a home, commitment, a life built together, and effort you can see.',
      'zh-CN': '爱需要落在形式上：家、承诺、共同建设的生活，以及看得见的付出。',
      'zh-Hant': '愛需要落在形式上：家、承諾、共同建設的生活，以及看得見的付出。'
    }
  },
  duality: {
    theme: {
      en: 'Purpose fulfilled through Bonding',
      'zh-CN': '通过联结来构建目标（Purpose fulfilled through Bonding）',
      'zh-Hant': '透過聯結來建構目標（Purpose fulfilled through Bonding）'
    },
    hd: {
      en: 'This quarter leans toward relationship, bonds and human interaction. Its theme is completed through meeting and colliding with other people.',
      'zh-CN': '偏向关系、羁绊、人际互动。必须通过人与人之间的联结与碰撞来完成该主题的修行。',
      'zh-Hant': '偏向關係、羈絆、人際互動。必須透過人與人之間的聯結與碰撞來完成該主題的修行。'
    },
    business: {
      en: 'It focuses on relationships, partner structures, companions and the exchange and balance of interests between people and groups.',
      'zh-CN': '关注人际关系、合伙人机制、伴侣以及群体之间的能量互动与利益平衡。',
      'zh-Hant': '關注人際關係、合夥人機制、伴侶以及群體之間的能量互動與利益平衡。'
    },
    love: {
      en: 'Relationship itself is the life theme: purpose is completed through meeting, attraction, pairing and continuation with others; it is rarely done alone.',
      'zh-CN': '关系本身就是人生主题：透过与他人的相遇、吸引、结伴与延续来完成目的，很少能独自完成。',
      'zh-Hant': '關係本身就是人生主題：透過與他人的相遇、吸引、結伴與延續來完成目的，很少能獨自完成。'
    }
  },
  mutation: {
    theme: {
      en: 'Purpose fulfilled through Transformation',
      'zh-CN': '通过蜕变来构建目标（Purpose fulfilled through Transformation）',
      'zh-Hant': '透過蛻變來建構目標（Purpose fulfilled through Transformation）'
    },
    hd: {
      en: 'This quarter leans toward transformation, transcendence, spirit and rebirth. It breaks old patterns and brings the theme to a final elevation or evolution.',
      'zh-CN': '偏向转化、超越、精神与重生。负责打破旧模式，为这个主题带来终极升华或进化。',
      'zh-Hant': '偏向轉化、超越、精神與重生。負責打破舊模式，為這個主題帶來終極昇華或進化。'
    },
    business: {
      en: 'It focuses on the end of old business structures, the start of a new cycle, and bringing fundamental evolution or reinvention to an industry or organization.',
      'zh-CN': '关注旧有商业结构的死亡、全新周期的开启，以及为行业或组织带来根本性的进化与重塑。',
      'zh-Hant': '關注舊有商業結構的死亡、全新週期的開啟，以及為行業或組織帶來根本性的進化與重塑。'
    },
    love: {
      en: 'Relationship is the field of transformation: endings and rebirths recur, and self-transformation is completed through one relationship after another.',
      'zh-CN': '关系是转化的场域：常经历结束与重生，透过一段段关系完成自我的蜕变。',
      'zh-Hant': '關係是轉化的場域：常經歷結束與重生，透過一段段關係完成自我的蛻變。'
    }
  }
};

const businessLead = {
  en: 'In BG5 the Incarnation Cross is called the life work theme; the four quarters decide the ultimate field in which a career or business operates.',
  'zh-CN': '轮回交叉在 BG5 中称为终生商业主题，四象限决定商业运作的终极领域。',
  'zh-Hant': '輪迴交叉在 BG5 中稱為終生商業主題，四象限決定商業運作的終極領域。'
};

const pick = (record, locale) => record?.[locale] ?? record?.en ?? null;

/** Primary purpose theme (the quarter's core law). */
export function quarterTheme(id, locale = 'en') {
  return pick(content[id]?.theme, locale);
}

/** The business lens opens with the life-work-theme framing; other lenses do not. */
export function quarterBusinessLead(locale = 'en') {
  return pick(businessLead, locale);
}

/** Body text of one lens. Unknown ids or lenses return null, never a fallback to another lens. */
export function quarterLensText(id, lens, locale = 'en') {
  if (!QUARTER_LENS_IDS.includes(lens)) return null;
  return pick(content[id]?.[lens], locale);
}

/** Reading-category labels: Human Design / OC16 / Love, localized through the shared catalog. */
export function quarterLensOptions() {
  return QUARTER_LENS_IDS.map(id => [id, t(`Quarter lens ${id}`)]);
}
