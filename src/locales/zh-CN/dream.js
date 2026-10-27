/**
 * Simplified-Chinese DreamRave (sleep chart) display vocabulary and readings.
 *
 * The sleep design reuses the waking gate, channel and centre IDs, but the same
 * gate means something different at night, so its name and its reading live here
 * instead of in GATE_ZH. Structural identity stays English and stable; only
 * presentation moves.
 *
 * Dream gate names, the six dream line themes and every reading below come from
 * the teaching material the project owner supplied (`人类图13星体与梦境图`,
 * recorded in THIRD_PARTY_NOTICES.md). They are kept in the author's own words —
 * including the vocabulary the document uses for pain, sleepwalking, sleep
 * paralysis and conditioning residue — because that wording is the teaching, not
 * a draft to be softened. The document also contains three person-name
 * placeholders (`{{PERSON_…}}`); those fragments are dropped rather than filled
 * with an invented name, and nothing else in a sentence changes.
 *
 * Content lives in the locale vocabulary layer, not in lib/knowledge/: that layer
 * hides anything without editorial review evidence (see
 * `lib/knowledge/penta-reading-policy.js`), and this material has none, so the
 * knowledge route would either show nothing or require a fabricated review
 * record. See docs/development/SLEEP-CHART-PENDING.md §1.3.
 *
 * Fields the document does not answer stay `null`; a null field is not rendered.
 * There are deliberately no 15 × 6 per-gate-per-line texts: the line themes are
 * universal, so the readings are six, not ninety.
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
  reflector: '梦境反映者',
  generator: '梦境生产者',
  projector: '梦境投射者',
  manifestor: '梦境显示者',
  manifestingGenerator: '梦境显示生产者'
};

/**
 * The five sleep types, in the document's own four-part breakdown.
 *
 * `mechanical` is 机械定义, `condition` is 形成条件, `contrast` is 清醒 vs 睡眠的反差,
 * `operating` is 运作状态 and `phenomenon` is 核心现象. A type the document leaves
 * blank in one of those parts carries `null` there rather than a paraphrase.
 */
export const DREAM_TYPE_READING_ZH = {
  reflector: {
    mechanical: '在 15 个梦境闸门中，没有任何一条通道被完整接通（即没有任何梦境定义）。',
    condition: null,
    contrast: null,
    operating: '无论你白天是能量充沛的生产者，还是气场封闭的显示者，只要你图中没有那 6 条梦境通道的任意一条，你在睡着后都会退化为“梦境反映者”。你的能量场在夜间变得极其敞开，成为一块彻底的海绵，完全受制于行星行运（Transits）和同床伴侣的能量场。',
    phenomenon: '你的梦境几乎都是由外在环境“下载”给你的。你最容易在夜间吸收到深深的制约残留，这也是为什么“睡在自己的能量场里”对这类人具有绝对的生死意义。'
  },
  generator: {
    mechanical: '在梦境矩阵中，骶骨中心被定义。',
    condition: '只有当个案在清醒图中，本身就自带 15-5（韵律）、50-27（保存）或 53-42（周期）这三条通道中的至少一条时，才会成为梦境生产者。',
    contrast: '白天的生产者 / 晚上的投射者：白天拥有无限能量，但一到晚上骶骨就彻底关闭。如果强迫自己熬夜，或者带着未清空的骶骨能量入睡，醒来时会感到一种深层的苦涩与身体透支。',
    operating: '他们在夜间依然拥有固定的生命力引擎。他们的梦境主题高度围绕着底层的动物生存本能展开（如繁衍、寻找资源、应对物理压力）。在睡眠中，他们不是在“做梦”，而是在消耗或代谢一天中残留的纯粹物理能量。如果他们白天没有消耗完骶骨能量，夜间的梦境往往会异常沉重和劳累。',
    phenomenon: null
  },
  projector: {
    mechanical: '在梦境矩阵中拥有通道定义，但骶骨敞开，且没有动力中心连接到喉咙。',
    condition: '个案自带 20-57（脑波）、1-8（启发）或 28-38（挣扎）通道中的至少一条。',
    contrast: null,
    operating: '在梦中，他们缺乏持续的骶骨引擎，但拥有固定的认知或直觉雷达。他们的梦境往往不关乎繁衍或生存周期，而是一种对夜间信息的“聚焦”或“对抗”。比如带着 20-57 的人在梦里保持着极高的环境警觉，或者带着 1-8 的人在无意识的黑暗中接收某种非逻辑的灵感。他们依然需要被“暗夜力量”邀请或引导，才能在梦境场景中移动。',
    phenomenon: null
  },
  manifestor: {
    mechanical: '动力中心（根部）连接到喉咙，骶骨敞开。唯一的机械路径：28-38（根部到直觉）＋ 20-57（直觉到喉咙）。',
    condition: null,
    contrast: '白天：如果你白天是反映者，你习惯于在边缘观察，顺应环境，不轻易发起。夜晚变成显示者：在无意识状态下，你底层的动物性压力（如根部的恐惧与挣扎）直接找到了通往喉咙（显化）的出口！',
    operating: '这是在物理层面上动作最大的睡眠类型。当底层的恐惧（28号）和攻击性（38号）通过直觉直接冲向喉咙，身体在梦里试图“行动”或“发声”来释放压力。这些人最容易在睡眠中出现强烈的肢体动作：梦游、剧烈翻身、拳打脚踢、大声说梦话、甚至因极端的梦魇而惊叫醒来。这是因为他们的哺乳动物载具在梦中试图“发起”物理反击。',
    phenomenon: null
  },
  manifestingGenerator: {
    mechanical: '动力（骶骨或根部）连接到喉咙，且骶骨定义。机械路径：15-5（骶骨到G）＋ 1-8（G到喉咙）。',
    condition: null,
    contrast: '白天：如果你白天是反映者，你习惯于在边缘观察，顺应环境，不轻易发起。夜晚变成显生者：在无意识状态下，你底层的动物性压力（如根部的恐惧与挣扎）直接找到了通往喉咙（显化）的出口！',
    operating: '这是在物理层面上动作最大的睡眠类型。当底层的恐惧（28号）和攻击性（38号）通过直觉直接冲向喉咙，身体在梦里试图“行动”或“发声”来释放压力。这些人最容易在睡眠中出现强烈的肢体动作：梦游、剧烈翻身、拳打脚踢、大声说梦话、甚至因极端的梦魇而惊叫醒来。这是因为他们的哺乳动物载具在梦中试图“发起”物理反击。',
    phenomenon: null
  }
};

/** The document's account of what each of the fifteen dream gates does at night. */
export const DREAM_GATE_READING_ZH = {
  62: '在梦境中，它与人类的情感之爱无关，而是光之场的出口。它代表了我们在梦中对“光”与秩序的感知，是接收高维信息与宇宙几何图形的通道。',
  20: '梦境中的“观察者”。它决定了你在梦中能“看”到什么——不仅是画面，还包括你在梦中单纯目击事件发生的状态。',
  57: '梦境中的声学与直觉雷达。它让你在睡梦中依然保持对频率、声音或某种隐秘振动的高度敏感。',
  8: '代表梦境背景中的虚空、阴影与未知。有时梦中那种深邃、无法看清的黑色幕布，便是由这个闸门驱动的。',
  1: '一种脱离了心智逻辑的纯粹生命活力。在梦中，它表现为一种毫无理由的轻盈感或源于底层的哺乳动物愉悦。',
  12: '这是梦境与现实物质世界交汇的关口。它不仅带来梦境场景的突变，也是“梦话”（Sleep-talking）产生的机械源头——喉咙中心在这个闸门试图将梦境信息转化为声音。',
  27: '在梦中表现为一种无法被满足的抓取感，比如在梦里一直找东西、赶飞机，或是对某种物质、食物、安全感产生极其强烈的匮乏与渴望。',
  50: '褪去了社会的道德包装，还原为最底层的哺乳动物繁衍本能、部落角色以及原始的交配驱力。',
  5: '掌控梦境的时间感。它会导致梦里的时间变得极度扭曲——有时感觉经历了漫长的一生，有时又像被定格在某个瞬间。',
  15: '带来梦境中毫无逻辑的场景跳跃。上一秒在办公室，下一秒却在悬崖边，这种极端的节奏转换与失序感皆源于此。',
  19: '作为进入恶魔之界的出口，它主导了我们在梦境中的空间感知与跨维度体验。当个人设计中携带着 19 号闸门（例如作为设计地球的定位）时，这种底层的哺乳动物矩阵便在睡眠中建立了一条极其敏锐的通道，能直接感知到梦境空间的变化、无形存在的介入，以及深层潜意识中对环境安全感的原始需求。',
  28: '梦魇的源头。它代表了纯粹的生存焦虑，梦中那些潜伏在暗处追赶你的怪物，或是面临死亡威胁的极度恐惧感，都是 28 号闸门的制约运作。',
  38: '梦中的搏斗、挣扎与对抗。当你在梦里陷入肢体冲突、拼命反抗或感到巨大的物理压迫时，是这个闸门的肾上腺素在释放。',
  42: '关乎结束、死亡体验与周期的终结。它在梦中呈现为事物（或自身）的消亡、腐朽，或是一段经历的强制切断。',
  53: '这是一种极端的压力释放机制。经典的“坠落梦”、“失重飞翔梦”或是被追赶时拼命逃跑却迈不开腿的梦境，皆是 53 号闸门的典型显化。'
};

/** The dream names of the six dream channels. Keys are stable `<low>-<high>` ids. */
export const DREAM_CHANNEL_ZH = {
  '1-8': '启发通道',
  '5-15': '韵律通道',
  '20-57': '脑波通道',
  '27-50': '保存通道',
  '28-38': '挣扎通道',
  '42-53': '周期通道'
};

/**
 * The document's core distinction, kept as two separate statements because it is
 * the point of the whole channel teaching: a channel carried from birth is a
 * fixed dream landscape, a channel filled in by the night sky or a bed partner is
 * conditioning carrying a chemical residue. Shown above the per-channel text.
 */
export const DREAM_CHANNEL_DEFINITION_ZH = {
  fixed: '如果个案在清醒图中已定义该通道，这是其底层的睡眠常态与免疫机制。他们的梦境叙事固定，处理压力的方式也固定，不应被视为需要干预的“制约”。',
  conditioning: '如果个案在清醒图中未定义该通道（或只有半条），但在夜间因星象或伴侣能量场被临时接通，这就会形成“暗夜制约”。这些外来的、不属于个案的本能反应，会在醒来后转化为“化学残留”，在白天引发高度的非我行为和错误的商业/个人决策。'
};

/**
 * The six dream channels: `dream` is what the channel does at night, `fixed` is
 * the document's example for a channel carried from birth, `conditioning` is its
 * example for the same channel filled in from outside, and `residue` is the
 * daytime chemical residue. The document gives a `fixed` example for three
 * channels and a `conditioning` example for two; the rest stay null there and the
 * shared `DREAM_CHANNEL_DEFINITION_ZH` statements carry the rule.
 */
export const DREAM_CHANNEL_READING_ZH = {
  '1-8': {
    dream: '白天代表特立独行的自我表达。在梦中，它是在黑暗与虚无中寻找光芒的通道。梦境往往具有很强的超现实主义色彩，甚至是一种没有任何情节、只有纯粹黑暗背景与突如其来的心智愉悦交织的体验。',
    fixed: null,
    conditioning: null,
    residue: '不落地的狂热或深深的忧郁。醒来时，要么带着一种毫无现实基础的“虚假灵感”（导致你去执行根本行不通的计划），要么陷入一种不被世人理解的孤立主义忧郁中。'
  },
  '5-15': {
    dream: '白天代表顺应生命之流。在梦中，它是打乱线性时空的罪魁祸首。当这条通道运作时，梦里的时间感会彻底崩溃：你可能在梦里过完了一生，或者梦里的场景毫无逻辑地疯狂闪跳（前一秒在开会，后一秒在深海）。',
    fixed: '你的睡眠本身就有着不按线性逻辑运作的特殊韵律。',
    conditioning: null,
    residue: '失序与急躁。醒来后，生物钟感觉被完全打乱。你会觉得时间不够用，一整天都在兵荒马乱中赶进度，导致你的 BG5 决策节奏完全脱轨。'
  },
  '20-57': {
    dream: '在白天，这是极度敏锐的直觉通道。在梦中，它变成了纯粹的哺乳动物警觉系统。当这条通道在梦中被接通，个体会对夜间的物理环境（如细微的声音、气压变化）极为敏感。梦境往往没有清晰的情节，而是充满了一种处于高度戒备状态下的“观察”与“聆听”。',
    fixed: null,
    conditioning: null,
    residue: '莫名其妙的偏执与神经质。醒来后，即使没有发生任何事，也会有一种“有什么地方不对劲”的底层焦虑，导致在白天的商业或人际互动中过度防卫。'
  },
  '27-50': {
    dream: '白天代表家族的守护与滋养。在梦里，社会化的道德被剥离，它退化为纯粹的动物性法则：交配、族群等级、以及对生存资源的极度饥渴。梦境中常出现疯狂寻找某种东西、保护幼崽，或者原始的性冲动。',
    fixed: '你在睡梦中自然会散发出一种守护与滋养的哺乳动物磁场。',
    conditioning: null,
    residue: '强烈的匮乏感与依赖性。醒来后，可能会突然对物质安全感感到恐慌（例如担心公司现金流突然断裂），或者在情感上对他人产生不理智的黏附与抓取。'
  },
  '28-38': {
    dream: '白天代表为了寻找生命意义而战。在梦中，它就是纯粹的生存战场。这就是为什么很多人会在梦里跟人打架、拼命挣扎、或者被恐怖的怪物追杀。身体在床上可能也会伴随肌肉紧绷和不自觉的抽动。',
    fixed: '你在梦里就是会以高强度的身体律动或对抗来释放白天的压力。这对你的身体来说是健康的机制，你醒来不会觉得是被制约了，而是完成了例行的能量代谢。',
    conditioning: '你本来没有这条通道，但同床伴侣的能量或者星象接通了它。你被迫在梦里“打了一整夜不属于你的仗”，醒来后那份极度的疲惫、好斗与暴躁，就是非我的化学残留。',
    residue: '极度的疲惫与好斗心态。醒来后，由于在梦里“打了一整夜的仗”，身体的肾上腺素系统被严重消耗。白天会变得极具攻击性、充满火药味，很容易在团队管理或客户沟通中挑起不必要的冲突。'
  },
  '42-53': {
    dream: '白天代表完成一个经验周期。在梦里，这是一条充满物理压力的通道，由根部中心直达骶骨。它在梦中最典型的表现就是经典的“坠落梦”、“一直跑却到达不了终点”，或者是经历事物（甚至自己）在梦中死去的终结感。',
    fixed: null,
    conditioning: '你本来没有，但在梦中被接通了。你被迫承受了不属于你的循环压力与死亡/终结感，醒来后，你带着沉重感和想要切断某件事的冲动去开启新的一天。',
    residue: '沉重感与停滞感。醒来后，会感到一种深深的无力感（Depression），感觉自己被困在了某段关系或某个商业项目中，甚至会因为夜间残留的压力，在白天冲动地想要“辞职”或“切断”某个原本好好的合作。'
  }
};

/**
 * The three portals: what the portal collects at night and what it bleeds into
 * once the Ajna and Solar Plexus come back online in the morning. `target` names
 * the centre and gate the residue overflows into.
 */
export const DREAM_PORTAL_READING_ZH = {
  62: {
    target: '眉心中心（17 号闸门）',
    night: '夜间接收大量关于秩序、结构、视觉画面的光之场信息。',
    morning: '暗夜信息一涌入眉心，就会被头脑强制转化为“观点（Opinions）”。醒来后，你可能会对某件还没发生的事产生极其固执的偏见，或者满脑子都是强迫性的细节逻辑（比如死磕 PPT 里的某个毫无意义的排版）。这种“非我观点”根本不是你通过觉察得出的，而是 62 号门户在早晨强行塞进你眉心中心的暗夜垃圾。'
  },
  12: {
    target: '情绪中心（22 号闸门）',
    night: '夜间处理最世俗的物质拉扯、混沌的节奏以及肉体层面的变异与压抑。',
    morning: '12-22 是一条极具破坏力的个体情绪通道。当夜间的地球重力感通过 12 号溢出到 22 号时，醒来最直接的表现就是“起床气”与“毫无理由的社交厌恶”。你会感到一种深沉的忧郁，不想和任何人说话。如果在这种溢出状态下立刻去面对客户或伴侣，你会表现出极度冷漠甚至充满攻击性的社交态度，从而在清晨就毁掉一整天的人际关系。'
  },
  19: {
    target: '情绪中心（49 号闸门）',
    night: '夜间沉浸在恶魔之界中，疯狂吸收环境中最底层的生存恐惧、空间焦虑和动物性匮乏。',
    morning: '这是所有溢出中最剧烈、最痛苦的。当底层的生存恐惧通过 19 号溢出到 49 号时，它会转化为极度爆炸的部落愤怒与情感勒索。醒来后，你会觉得极度缺乏安全感、极度需要别人的关注和保证（黏人）。如果伴侣或团队成员没有立刻满足你的情感/物质需求，49 号闸门就会爆发：“你既然不照顾我，那我就拒绝你、切断关系！”很多伴侣在清晨毫无逻辑的激烈争吵，甚至商业合伙人突然想要散伙，都是因为 19 号门户的恶魔溢出操控了情绪中心。'
  }
};

/**
 * The six night forces ("暗夜力量"), one set shared by every dream gate: the line
 * theme is universal, not per gate. `waking` is the waking profile role the
 * document puts beside it, `dream` is the night-force mechanism, `residue` is the
 * conditioning it leaves behind in the morning.
 */
export const DREAM_LINE_READING_ZH = {
  1: {
    waking: '奠定基础、恐惧未知',
    dream: '一爻的暗夜力量是“潜行”的。当制约通过一爻进入时，它是悄无声息的。在梦境的表现上，你可能会梦到自己在隐藏某物、发现秘密，或者在暗处观察。',
    residue: '这种制约如同木马程序，你醒来时可能完全记不清做了什么梦，但制约已经隐秘地植入。你会在接下来的几天里，莫名其妙地对某件事产生底层的怀疑或恐惧。'
  },
  2: {
    waking: '自然天赋、被投射',
    dream: '在梦境图中，二爻代表完全丧失自主权。所谓的“附体（Possession）”不是灵异事件，而是指你被梦境的机制“接管”了。在梦里，你会做出在清醒时绝对不可能做出的事情，你的反应、性格完全不像你自己。',
    residue: '醒来后，你会有一种极其异样、陌生的感觉，仿佛昨晚在你的身体里活了一遍别人的生活。这种残留会严重干扰你白天的自我认同，让你在决策时偏离真实的轨迹。'
  },
  3: {
    waking: '试错、突变、适应',
    dream: '三爻在梦境中是极度不稳定的物理与心理能量。它带来了梦境中的碰撞、追逐、破碎以及场景的剧烈切换。',
    residue: '这是最容易在物理层面显化的爻数。带着三爻梦境的人，在床上往往会辗转反侧、踢被子、甚至梦游或惊醒。醒来后，即便睡了很久，依然会感到极度的疲惫与消耗，仿佛在梦里“打了一整晚的仗”。'
  },
  4: {
    waking: '人际网络、外部化',
    dream: '四爻的暗夜力量具有极强的“抓取性”。在梦境中，它会将你的注意力死死钉在某一个特定的人、一句话或一个场景上，导致极度重复的梦境模式。',
    residue: '醒来后，这种力量会转化为“痴迷（Obsession）”。你可能会一整天都在强迫性地思考梦里的那个人，或者对某个念头挥之不去。在非我状态下，这种夜间植入的痴迷很容易在白天演变成冲动且错误的商业或人际决策。'
  },
  5: {
    waking: '普遍化、解决危机、承受投射',
    dream: '五爻是梦境中最具诱惑力的造梦师。它会制造出极其宏大、美好或极具戏剧张力的幻象（Fantasy）。在梦里，你可能会体验到极致的浪漫、成功或是成为某种救世主。',
    residue: '五爻带来的制约残留是最危险的，因为它让你“爱上”了非我的幻觉。当你醒来面对现实的落差时，这种残留会诱导你在白天去追求那些根本不属于你的、不切实际的“大饼”或幻梦，从而破坏你原本通过策略与权威建立的务实基础。'
  },
  6: {
    waking: '客观、超然、过渡',
    dream: '六爻在梦境中制造了一种强烈的“抽离感（Separation）”。你可能会体验到清明梦（知道自己在做梦），或者以第三视角的“上帝视角”俯瞰梦境中的自己。它也会带来一些看似宏大的、不属于个人维度的前瞻性画面（Vision）。',
    residue: '六爻的制约会导致一个人醒来后，感到强烈的“灵魂不附体”或与现实世界脱节。这种抽离感会让你在白天显得冷漠、心不在焉，难以将精力聚焦在当下的物质与商业运作中。'
  }
};

/**
 * The thirteen planets in a dream. Keys are the engine's stable planet ids, never
 * display text (AGENTS.md §4). `role` is the document's own subtitle for the
 * planet, `mechanics` is 机械运作, `dream` is 梦境显化 and `residue` is 制约残留.
 *
 * The document treats the two lunar nodes as one topic and the three outer
 * planets as one topic, so those share paragraphs; both nodes carry the shared
 * text so that either chip can be read on its own.
 */
const OUTER_MECHANICS = '由于运行极慢，它们不会带来快速切换的剧情，而是对全人类的梦境底座进行长达数年的“背景辐射”。';
const NODE_MECHANICS = '南北交点不是实体星体，而是月亮轨道与地球轨道的交汇点。行运南北交点在每个闸门会停留数月之久。当行运交点落入梦境闸门时，它布置了全人类长达几个月的“梦境底色与布景”。';
const NODE_DREAM = '交点不制造具体的剧情（那是太阳和行星的事），它制造氛围。如果北交点进入 19 号闸门（恶魔之界门户），那么接下来的几个月里，人类在夜间对物理空间、暗黑能量和未知环境的敏感度将被集体放大，犹如整个地球的梦境都搬进了一个充满原始压力的萨满洞穴。如果交点落在 62 号闸门（光之场门户），梦境的背景就会变得非常结构化、充满几何图形或看似有秩序的细节。';
const NODE_RESIDUE = '南北交点带来的不是一两天的脾气暴躁，而是一段时期内，整个社会集体潜意识的“底色偏移”。作为领导者或咨询师，看懂了交点的梦境行运，你就看懂了这几个月里你的团队、你的客户在潜意识底层到底在经历什么样的集体环境洗脑。';

export const DREAM_PLANET_READING_ZH = {
  sun: {
    role: '暗夜的终极主轴与主题',
    mechanics: '不管在白天还是黑夜，流日太阳（Transit Sun）永远占据中微子信息流的 70%。它是大程序（The Program）发出的最强指令。太阳代表核心生命力。',
    dream: '流日太阳决定了整个地球在当晚的“梦境全局主题”。当流日太阳落入这 15 个梦境闸门时，它就像一个超级探照灯，把该闸门的哺乳动物本能强制打入全人类的潜意识底座。如果是其他行星（如水星、金星）在梦境闸门，它可能只是梦里的一个插曲。但如果是太阳在梦境闸门，它就是梦的核心剧情。比如，当流日太阳走到 42 号闸门（死亡/终结），全球的人在那个周期内的梦境基调，都会染上一种“事物走向终点、循环必须结束”的沉重感。',
    residue: '太阳带来的制约残留是最具支配性的。醒来后，你一整天的基本活力，都会被昨晚太阳植入的主题强行牵引。'
  },
  earth: {
    role: '梦境的物理重力场',
    mechanics: '流日地球在曼陀罗轮轴上永远与流日太阳处于精准的 180 度对立面。太阳是释放的主题，地球则是这个主题在物质层面的落地。Dream Rave 本质上是一个极度物理、极度依附肉体的哺乳动物矩阵。地球行运在梦境中代表了强烈的物理重力与肉体实感。',
    dream: '如果流日地球落入梦境闸门，它会将梦境中的感受死死地锚定在身体的感官上。它让你在梦里感觉到真正的痛楚、真实的饥饿、极度的疲劳，或者是极其清晰的触觉（比如梦到掉进水里的窒息感、被抓住的压迫感）。在人类图曼陀罗的 64 闸门对分相中，这 15 个梦境闸门里只有一对是精准的对立面：27 号闸门（渴望，属地球层面）与 28 号闸门（恐惧，属恶魔之界）。这意味着，在一年之中有那么几天，当流日太阳在 27 号时，流日地球必定在 28 号（反之亦然）。这几天，梦境图会同时遭受太阳和地球的最高强度轰炸！在这几天睡觉，全人类的潜意识都会在“极度的物质匮乏抓取（27）”与“纯粹的生存死亡恐惧（28）”之间被剧烈撕扯，造成最可怕的集体梦魇与晨间焦虑。',
    residue: null
  },
  northNode: {
    role: '潜意识的集体舞台：你这一生要走向哪里（人生下半场）',
    mechanics: NODE_MECHANICS,
    dream: NODE_DREAM,
    residue: NODE_RESIDUE
  },
  southNode: {
    role: '潜意识的集体舞台：你从哪里来（人生上半场）',
    mechanics: NODE_MECHANICS,
    dream: NODE_DREAM,
    residue: NODE_RESIDUE
  },
  moon: {
    role: '梦境的聚光灯与细节锚点',
    mechanics: '月亮运行速度最快，是暗夜程序中最活跃的齿轮。它负责驱动梦境的“焦点”。',
    dream: '当流日月亮落入梦境闸门，它会极其清晰地放大梦境中的某个特写镜头——一个形状、一种特定的气味、或者某个极具物理实感的微小物件。',
    residue: '醒来后，你往往记不清完整的剧情，但会对梦里的那个“细节”产生挥之不去的执念，导致你在商业或日常决策中，莫名其妙地在某个无关紧要的细枝末节上钻牛角尖。'
  },
  mercury: {
    role: '破译失败的通讯员',
    mechanics: '水星代表沟通与信息传递。在梦中，它试图将 5 中心的哺乳动物数据，强行翻译成人类的语言。',
    dream: '水星行运是导致说梦话（Sleep-talking）最核心的物理诱因，特别是当它落入 12 号闸门（突变门户，连接喉咙中心）时。身体试图通过发声系统传达梦境，但因为没有头脑的逻辑参与，发出的往往是无意义的呢喃或断裂的词汇。',
    residue: '早晨醒来时，会感到喉咙干涩，或者伴随着一种强烈的“我有话没说清楚”的憋屈感。'
  },
  venus: {
    role: '剥离道德的哺乳动物法则',
    mechanics: '在白天，金星关乎人类的价值观与爱。在梦里，社会道德被彻底剥除，金星退化为纯粹的动物性吸引力、繁衍本能与族群确立。',
    dream: '当金星尤其是与 50 号（性）、27 号（渴望）发生互动时，会引发极度原始的性梦，或者关于保护幼崽、族群阶级（谁臣服于谁）的梦境。这里面没有任何“浪漫”，只有物理的交配与族群维系。',
    residue: '这种制约会让你在白天面对同事或客户时，潜意识里用“动物族群的阶级感”去评判对方，产生不理智的亲近或排斥。'
  },
  mars: {
    role: '梦魇与暗夜搏斗的引擎',
    mechanics: '火星是不成熟、暴烈的突变能量。在梦里，它是直接刺激肾上腺素系统的引信。',
    dream: '当火星行运落入恶魔之界的闸门（如 28、38、42、53）或与之形成通道时，这就成了典型的梦魇制造机。它带来追逐、撕咬、坠落、暴力对抗。身体在床上可能会出现抽搐、盗汗、甚至梦游。',
    residue: '醒来时，你的身体就像真的去打了一场架，极度疲惫且充满火药味。白天你会极具攻击性，很容易在商业谈判中因为一点小事就与人起冲突。'
  },
  jupiter: {
    role: '规则的扭曲与重压：扩张',
    mechanics: null,
    dream: '在梦中会无限放大某个维度的体验。如果木星在恶魔之界，恐惧会被放大到宇宙级别；如果木星在光之场，你可能会体验到一种失去边界的虚假狂喜。',
    residue: null
  },
  saturn: {
    role: '规则的扭曲与重压：限制',
    mechanics: null,
    dream: '在梦中带来极强的重力感与约束。经典的“鬼压床”（睡眠瘫痪）或在梦里被困在迷宫、深渊中无法动弹，往往是土星行运强压在 15-5 或 53-42 这类通道上导致的物理显化。醒来后会带着深沉的压抑感和无力感。',
    residue: null
  },
  uranus: {
    role: '时代的底层基因洗脑',
    mechanics: OUTER_MECHANICS,
    dream: '给神经系统带来突如其来的电击感，导致睡眠极其破碎，频繁惊醒。',
    residue: null
  },
  neptune: {
    role: '时代的底层基因洗脑',
    mechanics: OUTER_MECHANICS,
    dream: '制造最浓重的精神迷雾，让你在梦里失去一切方向感，甚至体验到跨维度的信息渗透。',
    residue: null
  },
  pluto: {
    role: '时代的底层基因洗脑',
    mechanics: OUTER_MECHANICS,
    dream: '带来关乎生死、腐朽、深层基因重组的暗夜恐惧。',
    residue: null
  }
};

/** The page-frame sentence for the two halves of a sleeping design. */
export const DREAM_SIDE_MEANING_ZH = {
  design: '梦演变的方向',
  personality: '梦中的意识'
};

/** The page-frame sentence for the two sources of a dream's shape. */
export const DREAM_CONDITIONING_ZH = {
  natal: '自身固定的梦中状态',
  external: '行运或伴侣是制约的“天气”，影响梦的走向'
};

export const zhDreamGate = gate => DREAM_GATE_ZH[gate] || `第 ${gate} 闸门`;
export const zhDreamLine = line => DREAM_LINE_ZH[line] || `第 ${line} 爻`;
export const zhDreamRealm = realm => DREAM_REALM_ZH[realm] || realm || '—';
export const zhDreamType = id => DREAM_TYPE_ZH[id] || id || '—';
export const zhDreamTypeReading = id => DREAM_TYPE_READING_ZH[id] || null;
export const zhDreamGateReading = gate => DREAM_GATE_READING_ZH[gate] || null;
export const zhDreamChannelName = key => DREAM_CHANNEL_ZH[key] || null;
export const zhDreamChannelReading = key => DREAM_CHANNEL_READING_ZH[key] || null;
export const zhDreamChannelDefinition = kind => DREAM_CHANNEL_DEFINITION_ZH[kind] || null;
export const zhDreamPortalReading = gate => DREAM_PORTAL_READING_ZH[gate] || null;
export const zhDreamLineReading = line => DREAM_LINE_READING_ZH[line] || null;
export const zhDreamPlanetReading = planet => DREAM_PLANET_READING_ZH[planet] || null;
export const zhDreamSideMeaning = side => DREAM_SIDE_MEANING_ZH[side] || null;
export const zhDreamConditioning = kind => DREAM_CONDITIONING_ZH[kind] || null;
