import { esc } from './format.js';

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

// Detail supplied in the user-approved restoration attachment; summaries above are unchanged.
const details = {
  "sun": [
    "Sun（太阳）代表一个人生命力最集中的表达位置之一，也是图表中最重要的激活之一。\n\n太阳所在的 Gate（闸门）会把该闸门的主题放到非常显眼的位置，成为一个人持续散发、表达和被别人感受到的主要生命主题。\n\nPersonality Sun（人格太阳）通常更容易被本人意识到和认同；Design Sun（设计太阳）则更多通过身体、行为和别人对你的观察表现出来。\n\n传统 Human Design 教学常以“约 70%”强调 Sun / Earth 轴在图表中的重要性。这里的重点不是做精确能量百分比计算，而是理解：太阳及其对面的地球，是阅读整张图时非常核心的一条轴线。",
    "The Sun represents one of the positions where a person's life force is most concentrated in expression, and is one of the chart's most important activations.\n\nThe Sun's Gate places that Gate's theme in a highly visible position, becoming a major life theme that a person continually radiates, expresses, and conveys to others.\n\nThe Personality Sun is usually easier for the person to recognize and identify with. The Design Sun is expressed more through the body, behavior, and other people's observations of you.\n\nTraditional Human Design teaching often uses about 70% to emphasize the importance of the Sun / Earth axis in the chart. The point here is not to calculate an exact percentage of energy, but to understand that the Sun and the Earth opposite it form a central axis for reading the whole chart.",
    "Sun（太陽）代表一個人生命力最集中的表達位置之一，也是圖表中最重要的啟動之一。\n\n太陽所在的 Gate（閘門）會把該閘門的主題放到非常顯眼的位置，成爲一個人持續散發、表達和被別人感受到的主要生命主題。\n\nPersonality Sun（人格太陽）通常更容易被本人意識到和認同；Design Sun（設計太陽）則更多通過身體、行爲和別人對你的觀察表現出來。\n\n傳統 Human Design 教學常以“約 70%”強調 Sun / Earth 軸在圖表中的重要性。這裏的重點不是做精確能量百分比計算，而是理解：太陽及其對面的地球，是閱讀整張圖時非常核心的一條軸線。"
  ],
  "earth": [
    "Earth（地球）永远与 Sun（太阳）处在轮盘的对面。\n\n如果太阳代表主要的生命力与表达主题，地球更像让这股力量能够站稳、落地并保持平衡的根基。\n\n地球所在的 Gate（闸门）常常提示：一个人需要通过什么主题，让太阳的力量不只是停留在理想、表达或冲动里，而能进入现实生活、身体经验和稳定的日常运作。\n\n因此 Sun / Earth 最适合成对阅读：一个负责“发光”，一个负责“站稳”。",
    "The Earth is always opposite the Sun on the wheel.\n\nIf the Sun represents the main theme of life force and expression, the Earth is more like the foundation that allows this force to stand firmly, take root, and remain balanced.\n\nThe Earth's Gate often indicates the theme through which a person can bring the Sun's power into real life, bodily experience, and stable daily operation, rather than leaving it only in ideals, expression, or impulse.\n\nThe Sun / Earth are therefore best read as a pair: one shines, the other provides firm footing.",
    "Earth（地球）永遠與 Sun（太陽）處在輪盤的對面。\n\n如果太陽代表主要的生命力與表達主題，地球更像讓這股力量能夠站穩、落地並保持平衡的根基。\n\n地球所在的 Gate（閘門）常常提示：一個人需要通過什麼主題，讓太陽的力量不只是停留在理想、表達或衝動裏，而能進入現實生活、身體經驗和穩定的日常運作。\n\n因此 Sun / Earth 最適合成對閱讀：一個負責“發光”，一個負責“站穩”。"
  ],
  "moon": [
    "Moon（月亮）与推动力、关注焦点和生命中容易牵动一个人的主题有关。\n\n月亮所在的 Gate（闸门）常常表现为一种持续拉动注意力的力量：某类事情特别容易让你产生“想去做、想去靠近、想去经历”的推动感。\n\n它并不自动等于你的 Inner Authority（内在权威）。除了 Reflector（月亮权威）的特殊机制之外，月亮的星体含义和“用什么方式做决定”是两件不同的事情。\n\n阅读月亮时，重点是观察：**什么主题一直在推动这个人向前移动。**",
    "The Moon is associated with driving force, focus, and themes that readily move a person in life.\n\nThe Moon's Gate often appears as a force that continually draws attention: certain kinds of things readily bring a feeling of wanting to act, approach, or experience.\n\nIt does not automatically equal your Inner Authority. Apart from the special mechanism of Reflectors with Lunar Authority, the planetary meaning of the Moon and the way decisions are made are two different matters.\n\nWhen reading the Moon, the emphasis is on observing: **what theme keeps driving this person forward?**",
    "Moon（月亮）與推動力、關注焦點和生命中容易牽動一個人的主題有關。\n\n月亮所在的 Gate（閘門）常常表現爲一種持續拉動注意力的力量：某類事情特別容易讓你產生“想去做、想去靠近、想去經歷”的推動感。\n\n它並不自動等於你的 Inner Authority（內在權威）。除了 Reflector（月亮權威）的特殊機制之外，月亮的星體含義和“用什麼方式做決定”是兩件不同的事情。\n\n閱讀月亮時，重點是觀察：**什麼主題一直在推動這個人向前移動。**"
  ],
  "southNode": [
    "South Node（南交点）更像生命早期或较熟悉阶段的“舞台背景”。\n\n它不主要描述“你是谁”，而是描述你长期置身其中、反复遇见并逐渐积累经验的环境和主题。\n\n在人生前半段，南交点主题通常比较熟悉，像已经走过很多次的道路。随着生命周期推进，重心会逐渐从 South Node 转向 North Node。\n\n这个变化不是某一天突然切换，而是一个渐进过程，常在人类图所说的 Uranus Opposition（天王星对分）阶段附近变得明显，大约发生在 38～42 岁这一生命区间。\n\nPersonality Node 更偏意识层面的观察背景；Design Node 更偏身体实际置身的环境与场景。",
    "The South Node resembles the stage backdrop of early life or a more familiar phase.\n\nIt primarily describes the environments and themes you inhabit over time, repeatedly encounter, and gradually gain experience in, rather than who you are.\n\nDuring the first half of life, South Node themes are usually more familiar, like roads traveled many times. As the life cycle progresses, the emphasis gradually moves from the South Node toward the North Node.\n\nThis change is gradual rather than a sudden switch on a particular day. It often becomes noticeable around the phase Human Design calls Uranus Opposition, roughly within the age range of 38–42.\n\nThe Personality Node relates more to the backdrop of conscious observation; the Design Node relates more to the environments and situations the body actually inhabits.",
    "South Node（南交點）更像生命早期或較熟悉階段的“舞臺背景”。\n\n它不主要描述“你是誰”，而是描述你長期置身其中、反覆遇見並逐漸積累經驗的環境和主題。\n\n在人生前半段，南交點主題通常比較熟悉，像已經走過很多次的道路。隨着生命週期推進，重心會逐漸從 South Node 轉向 North Node。\n\n這個變化不是某一天突然切換，而是一個漸進過程，常在人類圖所說的 Uranus Opposition（天王星對分）階段附近變得明顯，大約發生在 38～42 歲這一生命區間。\n\nPersonality Node 更偏意識層面的觀察背景；Design Node 更偏身體實際置身的環境與場景。"
  ],
  "northNode": [
    "North Node（北交点）描述生命逐渐走向的背景与舞台。\n\n它并不是“必须完成的任务”，也不是要求一个人抛弃 South Node 的经验，而是随着人生推进，环境、遇见的人、关注重点和观察世界的方式逐渐发生变化。\n\nSouth Node 积累的经验会成为进入 North Node 新舞台时携带的基础。\n\n这种转换通常是渐进的，并常在人类图所说的 Uranus Opposition（天王星对分）阶段附近更明显，大约在 38～42 岁这一生命区间。\n\nPersonality Node 更偏意识与视角的背景；Design Node 更偏身体实际经历的环境与场景。",
    "The North Node describes the backdrop and stage toward which life gradually moves.\n\nIt is not a task that must be completed, nor a requirement to abandon South Node experience. As life progresses, the environment, people encountered, areas of focus, and ways of observing the world gradually change.\n\nExperience accumulated through the South Node becomes the foundation carried into the North Node's new stage.\n\nThis transition is usually gradual and often becomes more apparent around the phase Human Design calls Uranus Opposition, roughly within the age range of 38–42.\n\nThe Personality Node relates more to the backdrop of awareness and perspective; the Design Node relates more to the environments and situations actually experienced by the body.",
    "North Node（北交點）描述生命逐漸走向的背景與舞臺。\n\n它並不是“必須完成的任務”，也不是要求一個人拋棄 South Node 的經驗，而是隨着人生推進，環境、遇見的人、關注重點和觀察世界的方式逐漸發生變化。\n\nSouth Node 積累的經驗會成爲進入 North Node 新舞臺時攜帶的基礎。\n\n這種轉換通常是漸進的，並常在人類圖所說的 Uranus Opposition（天王星對分）階段附近更明顯，大約在 38～42 歲這一生命區間。\n\nPersonality Node 更偏意識與視角的背景；Design Node 更偏身體實際經歷的環境與場景。"
  ],
  "mercury": [
    "Mercury（水星）与思考、信息交换和沟通表达有关。\n\n水星所在的 Gate（闸门）会把某个主题带入“我会怎么谈论它、怎样表达它、什么事情值得被说出来”的层面。\n\n它既可以表现为经常思考某个主题，也可以表现为别人反复从你的表达里听见同一种关注。\n\n阅读 Mercury 时，可以问：\n\n**这个人最自然会把什么主题带进语言、信息和沟通中？**",
    "Mercury is associated with thinking, exchanging information, and communication.\n\nMercury's Gate brings a theme into the realm of how I talk about it, how I express it, and what is worth saying.\n\nIt can appear both as frequent thought about a particular theme and as a recurring concern that others hear in your expression.\n\nWhen reading Mercury, you can ask:\n\n**What theme does this person most naturally bring into language, information, and communication?**",
    "Mercury（水星）與思考、信息交換和溝通表達有關。\n\n水星所在的 Gate（閘門）會把某個主題帶入“我會怎麼談論它、怎樣表達它、什麼事情值得被說出來”的層面。\n\n它既可以表現爲經常思考某個主題，也可以表現爲別人反覆從你的表達裏聽見同一種關注。\n\n閱讀 Mercury 時，可以問：\n\n**這個人最自然會把什麼主題帶進語言、信息和溝通中？**"
  ],
  "venus": [
    "Venus（金星）与价值观、道德标准、关系中的边界和审美判断有关。\n\n金星所在的 Gate（闸门）会提示一个人在哪些主题上更容易形成“什么是对的、什么值得、我欣赏什么、我不能接受什么”的标准。\n\n这些标准会进入关系、金钱、审美和人与人相处的方式中。\n\n阅读 Venus 时，重点不是简单把它等同于“爱情”，而是看：\n\n**这个 Gate 的主题如何成为一个人的价值尺度。**",
    "Venus is associated with values, moral standards, boundaries in relationships, and aesthetic judgments.\n\nVenus's Gate suggests the themes in which a person is more likely to develop standards of what is right, what is worthwhile, what they appreciate, and what they cannot accept.\n\nThese standards enter relationships, money, aesthetics, and the way people relate to one another.\n\nWhen reading Venus, the emphasis goes beyond simply equating it with love, to asking:\n\n**How does this Gate's theme become a person's measure of value?**",
    "Venus（金星）與價值觀、道德標準、關係中的邊界和審美判斷有關。\n\n金星所在的 Gate（閘門）會提示一個人在哪些主題上更容易形成“什麼是對的、什麼值得、我欣賞什麼、我不能接受什麼”的標準。\n\n這些標準會進入關係、金錢、審美和人與人相處的方式中。\n\n閱讀 Venus 時，重點不是簡單把它等同於“愛情”，而是看：\n\n**這個 Gate 的主題如何成爲一個人的價值尺度。**"
  ],
  "mars": [
    "Mars（火星）带有行动力、冲动、欲望与成长过程中的“不成熟能量”主题。\n\n火星所在的 Gate（闸门）可能在早期表现得比较直接、急促或缺少分寸，需要通过现实碰撞、犯错和经验逐渐学会更成熟地使用。\n\n因此 Mars 不只是“行动力强”，更重要的是：\n\n**这里有一股需要被教育、练习和成熟化的动力。**\n\n随着经验累积，同一个 Gate 的火星主题可以从冲动变成真正可用的力量。",
    "Mars carries themes of action, impulse, desire, and immature energy in the process of growth.\n\nMars's Gate may initially appear in a direct, hurried, or poorly measured way. Real-world collisions, mistakes, and experience are needed to gradually learn to use it more maturely.\n\nMars is therefore more than strong drive to act. More importantly:\n\n**There is a drive here that needs education, practice, and maturation.**\n\nAs experience accumulates, the same Gate's Mars theme can develop from impulse into genuinely usable strength.",
    "Mars（火星）帶有行動力、衝動、慾望與成長過程中的“不成熟能量”主題。\n\n火星所在的 Gate（閘門）可能在早期表現得比較直接、急促或缺少分寸，需要通過現實碰撞、犯錯和經驗逐漸學會更成熟地使用。\n\n因此 Mars 不只是“行動力強”，更重要的是：\n\n**這裏有一股需要被教育、練習和成熟化的動力。**\n\n隨着經驗累積，同一個 Gate 的火星主題可以從衝動變成真正可用的力量。"
  ],
  "jupiter": [
    "Jupiter（木星）与原则、法则、保护和扩展有关。\n\n木星所在的 Gate（闸门）提示一个人在哪些主题上容易形成自己的原则，以及遵循这些原则时，什么样的成长、机会和扩展更容易发生。\n\n传统教学也常用“幸运、祝福、扩张”描述木星，但这里的“幸运”并不是随机中奖，更接近：\n\n**当一个人遵守这个位置所代表的原则时，扩展和机会更容易顺着这个主题出现。**",
    "Jupiter is associated with principles, laws, protection, and expansion.\n\nJupiter's Gate suggests the themes in which a person readily forms their own principles, and the growth, opportunities, and expansion more likely to arise when those principles are followed.\n\nTraditional teaching also often describes Jupiter in terms of luck, blessings, and expansion. Luck here is less like randomly winning a prize and closer to:\n\n**When a person follows the principles represented by this position, expansion and opportunities are more likely to arise along this theme.**",
    "Jupiter（木星）與原則、法則、保護和擴展有關。\n\n木星所在的 Gate（閘門）提示一個人在哪些主題上容易形成自己的原則，以及遵循這些原則時，什麼樣的成長、機會和擴展更容易發生。\n\n傳統教學也常用“幸運、祝福、擴張”描述木星，但這裏的“幸運”並不是隨機中獎，更接近：\n\n**當一個人遵守這個位置所代表的原則時，擴展和機會更容易順着這個主題出現。**"
  ],
  "saturn": [
    "Saturn（土星）与限制、责任、纪律、后果和成熟有关。\n\n土星所在的 Gate（闸门）常常不是最轻松的部分。它会让某个主题变得不能随便敷衍：如果没有认真面对，现实往往会以阻力、代价或重复课题的方式要求你重新学习。\n\n随着经验增长，原本像“限制”的位置，也可能逐渐变成一个人最有原则、最可靠、最有权威感的领域。\n\n因此 Saturn 更适合被理解为：\n\n**需要通过时间、责任与现实检验成熟起来的主题。**",
    "Saturn is associated with limits, responsibility, discipline, consequences, and maturity.\n\nSaturn's Gate is often not the easiest part. It makes a theme difficult to treat carelessly: if it is not faced seriously, reality often demands learning it again through resistance, costs, or recurring lessons.\n\nAs experience grows, a position that once felt limiting may gradually become one of the person's most principled, reliable, and authoritative areas.\n\nSaturn is therefore better understood as:\n\n**A theme that needs time, responsibility, and real-world testing to mature.**",
    "Saturn（土星）與限制、責任、紀律、後果和成熟有關。\n\n土星所在的 Gate（閘門）常常不是最輕鬆的部分。它會讓某個主題變得不能隨便敷衍：如果沒有認真面對，現實往往會以阻力、代價或重複課題的方式要求你重新學習。\n\n隨着經驗增長，原本像“限制”的位置，也可能逐漸變成一個人最有原則、最可靠、最有權威感的領域。\n\n因此 Saturn 更適合被理解爲：\n\n**需要通過時間、責任與現實檢驗成熟起來的主題。**"
  ],
  "uranus": [
    "Uranus（天王星）与突变、独特性、打破旧模式和意外改变有关。\n\n天王星所在的 Gate（闸门）常会表现出“不按常规来”的一面：某些经验、表达或变化会突破原有秩序，使这个主题呈现出明显的个人独特性。\n\n由于天王星移动较慢，它也带有时代与世代色彩；同一时期出生的人可能共享相近的 Uranus Gate，但 Line（爻线）、其他星体连接和整张图的结构，会决定它在个人生命中的具体表现。",
    "Uranus is associated with mutation, uniqueness, breaking old patterns, and unexpected change.\n\nUranus's Gate often shows an unconventional side: certain experiences, expressions, or changes break through the existing order, giving this theme a distinctly individual uniqueness.\n\nBecause Uranus moves relatively slowly, it also carries the qualities of an era and generation. People born in the same period may share similar Uranus Gates, but the Line, connections with other planets, and the structure of the whole chart determine its specific expression in an individual's life.",
    "Uranus（天王星）與突變、獨特性、打破舊模式和意外改變有關。\n\n天王星所在的 Gate（閘門）常會表現出“不按常規來”的一面：某些經驗、表達或變化會突破原有秩序，使這個主題呈現出明顯的個人獨特性。\n\n由於天王星移動較慢，它也帶有時代與世代色彩；同一時期出生的人可能共享相近的 Uranus Gate，但 Line（爻線）、其他星體連接和整張圖的結構，會決定它在個人生命中的具體表現。"
  ],
  "neptune": [
    "Neptune（海王星）与遮蔽、神秘、理想化、想象和难以直接看清的经验有关。\n\n海王星所在的 Gate（闸门）往往不是一个能够靠头脑迅速“解释清楚”的位置。这里容易出现模糊、投射、迷惑或理想化，也可能成为艺术、象征、灵性与非理性体验特别浓厚的领域。\n\n对 Neptune 最重要的态度不是急着下结论，而是：\n\n**承认有些东西暂时看不清，让时间把真实内容慢慢显露出来。**",
    "Neptune is associated with veiling, mystery, idealization, imagination, and experiences that are difficult to see directly.\n\nNeptune's Gate is often not a position the mind can quickly explain. Vagueness, projection, confusion, or idealization can arise here, and it may also become an area rich in art, symbolism, spirituality, and non-rational experience.\n\nThe most important attitude toward Neptune is to avoid rushing to conclusions and instead:\n\n**Acknowledge that some things cannot yet be seen clearly, and let time slowly reveal what is real.**",
    "Neptune（海王星）與遮蔽、神祕、理想化、想象和難以直接看清的經驗有關。\n\n海王星所在的 Gate（閘門）往往不是一個能夠靠頭腦迅速“解釋清楚”的位置。這裏容易出現模糊、投射、迷惑或理想化，也可能成爲藝術、象徵、靈性與非理性體驗特別濃厚的領域。\n\n對 Neptune 最重要的態度不是急着下結論，而是：\n\n**承認有些東西暫時看不清，讓時間把真實內容慢慢顯露出來。**"
  ],
  "pluto": [
    "Pluto（冥王星）与深层真相、转化、瓦解旧结构和重新建立有关。\n\n冥王星所在的 Gate（闸门）往往会把一个主题带到很深的位置：表面的解释可能不够，生命会不断把人带回这个主题，直到隐藏的内容被看见、旧模式被打破，并形成真正的转化。\n\nPluto 移动非常缓慢，因此具有明显的 Generational Theme（世代主题）。同一时期出生的人可能共享相同或相近的 Pluto Gate。\n\n但这并不意味着所有同龄人都会以同样方式经历它。是否接成完整 Channel（通道）、落在哪一爻，以及整张出生图的结构，都会决定这个世代背景怎样成为个人生命的一部分。",
    "Pluto is associated with deep truth, transformation, the dissolution of old structures, and rebuilding.\n\nPluto's Gate often takes a theme to a very deep level. Surface explanations may not be enough; life repeatedly brings a person back to this theme until hidden content is seen, old patterns are broken, and genuine transformation takes place.\n\nPluto moves very slowly and therefore has a pronounced Generational Theme. People born in the same period may share identical or similar Pluto Gates.\n\nThis does not mean that everyone of the same age experiences it in the same way. Whether it connects into a complete Channel, which Line it occupies, and the structure of the whole birth chart all determine how this generational background becomes part of an individual's life.",
    "Pluto（冥王星）與深層真相、轉化、瓦解舊結構和重新建立有關。\n\n冥王星所在的 Gate（閘門）往往會把一個主題帶到很深的位置：表面的解釋可能不夠，生命會不斷把人帶回這個主題，直到隱藏的內容被看見、舊模式被打破，並形成真正的轉化。\n\nPluto 移動非常緩慢，因此具有明顯的 Generational Theme（世代主題）。同一時期出生的人可能共享相同或相近的 Pluto Gate。\n\n但這並不意味着所有同齡人都會以同樣方式經歷它。是否接成完整 Channel（通道）、落在哪一爻，以及整張出生圖的結構，都會決定這個世代背景怎樣成爲個人生命的一部分。"
  ]
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
  "Transit（行运）是太阳、月亮、交点和行星持续运行，在某一个具体时刻形成的临时激活。\n\n把这些天体位置映射到 BodyGraph（人体图）后，可以看到当时哪些 Gate（闸门）被临时激活；当行运与出生图叠加时，也可能暂时补全 Channel（通道），并让原本 Undefined / Open 的 Center（中心）在一段时间里形成临时定义。\n\n因此 Transit 更像一份不断变化的“能量天气”。\n\n它可以帮助观察：\n\n- 当前集体环境更容易出现什么主题；\n- 为什么某段时间突然出现平时不熟悉的情绪、想法、动力或压力；\n- 哪些体验来自临时激活，而不是出生图里持续稳定的结构；\n- 某些 Gate / Channel / Center 什么时候被暂时点亮。\n\nTransit 可以帮助觉察 Conditioning（制约），也让人体验自己本来没有固定定义的能量。\n\n但流日不会改写出生图，也不能取代 Strategy（策略）与 Inner Authority（内在权威）。\n\n可以观察天气，但“要不要做一个重大决定”，仍然回到自己的 Strategy 与 Authority。",
  "Transits are temporary activations formed at a specific moment by the continual movement of the Sun, Moon, nodes, and planets.\n\nMapping these celestial positions onto the BodyGraph shows which Gates are temporarily activated at that moment. When overlaid with a birth chart, transits may also temporarily complete Channels and give an Undefined / Open Center temporary definition for a period of time.\n\nTransit is therefore like a continually changing form of energy weather.\n\nIt can help you observe:\n\n- Which themes are more likely to appear in the current collective environment;\n- Why unfamiliar emotions, thoughts, drives, or pressures suddenly arise during a certain period;\n- Which experiences come from temporary activation rather than the consistently stable structure of the birth chart;\n- When particular Gates / Channels / Centers are temporarily lit up.\n\nTransits can help you become aware of Conditioning and experience energy in which you have no fixed definition.\n\nBut transits do not rewrite the birth chart and cannot replace Strategy and Inner Authority.\n\nYou can observe the weather, but whether to make a major decision still comes back to your own Strategy and Authority.",
  "Transit（行運）是太陽、月亮、交點和行星持續運行，在某一個具體時刻形成的臨時啟動。\n\n把這些天體位置映射到 BodyGraph（人體圖）後，可以看到當時哪些 Gate（閘門）被臨時啟動；當行運與出生圖疊加時，也可能暫時補全 Channel（通道），並讓原本 Undefined / Open 的 Center（中心）在一段時間裏形成臨時定義。\n\n因此 Transit 更像一份不斷變化的“能量天氣”。\n\n它可以幫助觀察：\n\n- 當前集體環境更容易出現什麼主題；\n- 爲什麼某段時間突然出現平時不熟悉的情緒、想法、動力或壓力；\n- 哪些體驗來自臨時啟動，而不是出生圖裏持續穩定的結構；\n- 某些 Gate / Channel / Center 什麼時候被暫時點亮。\n\nTransit 可以幫助覺察 Conditioning（制約），也讓人體驗自己本來沒有固定定義的能量。\n\n但流日不會改寫出生圖，也不能取代 Strategy（策略）與 Inner Authority（內在權威）。\n\n可以觀察天氣，但“要不要做一個重大決定”，仍然回到自己的 Strategy 與 Authority。"
]
  }
};

const localeIndex = locale => locale?.startsWith('zh-Hant') ? 2 : locale?.startsWith('zh') ? 0 : 1;

export function planetReference(planet, locale = 'en') {
  return summaries[planet]?.[localeIndex(locale)] || '';
}

export function planetDetailReference(planet, locale = 'en') {
  return details[planet]?.[localeIndex(locale)] || '';
}

// Shared escaped paragraph/list rendering for planet and activation concept Detail.
export function renderActivationReference(text) {
  const inline = value => esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return text.split(/\n\n+/).filter(Boolean).map(part =>
    part.split('\n').every(line => line.startsWith('- '))
      ? `<ul>${part.split('\n').map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`
      : `<p>${inline(part).replaceAll('\n', '<br>')}</p>`).join('');
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
