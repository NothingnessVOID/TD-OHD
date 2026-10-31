import * as engine from '../lib/human-design/display-data.js';
import { typeFacts } from '../lib/human-design/identities.js';
const typeIdByName = { Generator:'generator', 'Manifesting Generator':'manifestingGenerator',Manifestor:'manifestor',Projector:'projector',Reflector:'reflector' };
import contexts from './ui-contexts.json' with { type: 'json' };
const TYPES = Object.fromEntries(Object.values(engine.TYPES).map(type => [type.name, type]));
const CHANNELS = Object.fromEntries(engine.CHANNELS.map(channel => [channel.gates.join('-'), channel.name]));
const PLANETS = { sun:'Sun', earth:'Earth', moon:'Moon', northNode:'North Node', southNode:'South Node', mercury:'Mercury', venus:'Venus', mars:'Mars', jupiter:'Jupiter', saturn:'Saturn', uranus:'Uranus', neptune:'Neptune', pluto:'Pluto' };
const TYPE_PLAIN = {
  Generator: "You have sustainable life-force energy. Life works best when you respond to what shows up rather than chasing what isn't there yet.",
  'Manifesting Generator': 'You have powerful, fast-moving energy for many things at once. Respond first, then move and adjust as needed.',
  Manifestor: "You're here to initiate. You don't need to wait for anyone — but informing people before you act keeps the path clear.",
  Projector: "You're here to guide others and see systems clearly. Your gifts land when they're recognized and invited, not pushed.",
  Reflector: 'You mirror the health of your community. Take a full lunar cycle before big decisions and choose your environments carefully.'
};
const CIRCUITS = { individual: 'Individual Circuit', collective: 'Collective Circuit', tribal: 'Tribal Circuit', integration: 'Integration Channels', knowing: 'Knowing Circuit', centering: 'Centering Circuit', logic: 'Logic Circuit', sensing: 'Sensing Circuit', ego: 'Ego Circuit', defense: 'Defense Circuit' };
// DreamRave names: the same gate means something different while asleep.
const DREAM_GATES = { 62:'Love', 20:'Sight', 57:'Attunement', 8:'Darkness', 1:'Joy', 12:'Mutation', 27:'Yearning', 50:'Sex', 5:'Time', 15:'Chaos', 19:'Environments', 53:'Flight', 42:'Dying', 38:'Aggression', 28:'Fear' };
const DREAM_LINES = { 1:'Secrets', 2:'Possession', 3:'Turmoil', 4:'Obsession', 5:'Fantasy', 6:'Vision' };
const DREAM_REALMS = { light:'Light Field', earth:'Earth Plane', demon:'Demon Realm' };
const DREAM_TYPES = { reflector:'Reflector', generator:'Generator', projector:'Projector', manifestor:'Manifestor', manifestingGenerator:'Manifesting Generator' };

/*
 * DreamRave readings.
 *
 * Every paragraph below is a faithful English translation of the teaching
 * material the project owner supplied (`人类图13星体与梦境图`, recorded in
 * THIRD_PARTY_NOTICES.md), including its own vocabulary for pain, sleepwalking,
 * sleep paralysis and conditioning residue: the wording is the teaching, not a
 * draft to be softened. The three `{{PERSON_…}}` name placeholders in the source
 * are dropped rather than filled with an invented name. Terminology follows the
 * rest of this file: Design / Personality, Transit, Sacral, Spleen, Root, Throat,
 * G centre, Ajna, Solar Plexus. Planet keys are the engine's stable ids.
 *
 * Content lives in the locale vocabulary layer, not in lib/knowledge/: that layer
 * hides anything without editorial review evidence, and this material has none.
 * See docs/development/SLEEP-CHART-PENDING.md §1.3. Fields the document does not
 * answer stay `null` and are never rendered; there are no 15 × 6 per-gate-per-line
 * texts, because the line themes are universal.
 */
const DREAM_TYPE_READING = {
  reflector: {
    mechanical: 'Not one of the fifteen dream gates completes a channel, so the sleep design has no definition at all.',
    condition: null,
    contrast: null,
    operating: 'Whether you are an energetic Generator or a Manifestor with a closed aura by day, without any of those six dream channels you degrade into a Dream Reflector once asleep. Your aura becomes completely open at night, an absolute sponge, wholly at the mercy of the planetary transits and of the bed partner\u2019s aura.',
    phenomenon: 'Your dreams are almost entirely downloaded from the outside environment. You absorb the deepest conditioning residue at night, which is why sleeping in your own aura is a matter of life and death for this type.'
  },
  generator: {
    mechanical: 'The Sacral centre is defined in the dream matrix.',
    condition: 'Only someone who already carries at least one of 15-5 (Rhythm), 50-27 (Preservation) or 53-42 (Maturation) in the waking chart becomes a Dream Generator.',
    contrast: 'A Generator by day, a Projector by night: unlimited energy in the daytime, but the Sacral shuts down completely at night. Force yourself to stay up, or fall asleep with unspent Sacral energy, and you wake with a deep bitterness and a body running on empty.',
    operating: 'They keep a fixed life-force engine at night. Their dream themes stay close to the underlying animal survival instincts: reproduction, seeking resources, handling physical pressure. In sleep they are not dreaming so much as burning off or metabolising the pure physical energy left over from the day. If the day did not spend the Sacral energy, the night\u2019s dreams are unusually heavy and exhausting.',
    phenomenon: null
  },
  projector: {
    mechanical: 'A channel is defined in the dream matrix, but the Sacral is open and no motor centre is connected to the Throat.',
    condition: 'The person carries at least one of 20-57 (Brain Wave), 1-8 (Inspiration) or 28-38 (Struggle).',
    operating: 'In the dream they lack a continuous Sacral engine but hold a fixed cognitive or intuitive radar. Their dreams are not about reproduction or survival cycles but about focusing on, or fighting, the information of the night. Someone with 20-57 keeps a very high environmental alertness in the dream; someone with 1-8 receives a non-logical inspiration in the unconscious dark. They still need to be invited or guided by the night forces before they can move inside a dream scene.',
    phenomenon: null
  },
  manifestor: {
    mechanical: 'A motor centre (the Root) connects to the Throat and the Sacral is open. The only mechanical path: 28-38 (Root to Spleen) plus 20-57 (Spleen to Throat).',
    condition: null,
    contrast: 'By day: if you are a Reflector in the daytime you are used to watching from the edge, going along with the environment, never initiating. By night you become a Manifestor: unconsciously, the animal pressure underneath (the Root\u2019s fear and struggle) finds a direct outlet to the Throat and to manifestation!',
    operating: 'This is the sleep type with the largest physical movement. When the underlying fear (gate 28) and aggression (gate 38) rush straight through the Spleen into the Throat, the body tries to act or to speak in the dream in order to discharge the pressure. These people most often show strong physical movement in sleep: sleepwalking, violent turning, kicking and punching, loud sleep-talking, even screaming themselves awake from an extreme nightmare. Their mammalian vehicle is trying to launch a physical counter-attack inside the dream.',
    phenomenon: null
  },
  manifestingGenerator: {
    mechanical: 'A motor (Sacral or Root) connects to the Throat and the Sacral is defined. Mechanical path: 15-5 (Sacral to G) plus 1-8 (G to Throat).',
    condition: null,
    contrast: 'By day: if you are a Reflector in the daytime you are used to watching from the edge, going along with the environment, never initiating. By night you become a Manifesting Generator: unconsciously, the animal pressure underneath (the Root\u2019s fear and struggle) finds a direct outlet to the Throat and to manifestation!',
    operating: 'This is the sleep type with the largest physical movement. When the underlying fear (gate 28) and aggression (gate 38) rush straight through the Spleen into the Throat, the body tries to act or to speak in the dream in order to discharge the pressure. These people most often show strong physical movement in sleep: sleepwalking, violent turning, kicking and punching, loud sleep-talking, even screaming themselves awake from an extreme nightmare. Their mammalian vehicle is trying to launch a physical counter-attack inside the dream.',
    phenomenon: null
  }
};

const DREAM_GATE_READING = {
  62: 'In a dream it has nothing to do with human love; it is the exit of the Light Field. It carries our perception of light and order in sleep, and it is the passage through which higher-dimensional information and cosmic geometry are received.',
  20: 'The observer of the dream. It decides what you can see in the dream \u2014 not only images, but your state of simply witnessing events as they happen.',
  57: 'The acoustic and intuitive radar of the dream. It keeps you highly sensitive in sleep to frequency, sound, or some hidden vibration.',
  8: 'The void, the shadow and the unknown of the dream background. The deep, unreadable black curtain of some dreams is driven by this gate.',
  1: 'A pure life-force vitality detached from mental logic. In the dream it shows up as a lightness with no reason behind it, or as a mammalian pleasure rising from the bottom of the body.',
  12: 'The crossing point between the dream and the material world. It mutates dream scenes, and it is also the mechanical source of sleep-talking \u2014 at this gate the Throat centre tries to turn dream information into sound.',
  27: 'In the dream, a grasping that can never be satisfied: searching for something all night, rushing for a plane, or an extreme lack and craving for a substance, for food, for security.',
  50: 'Stripped of its social moral wrapping, reduced to the most basic mammalian reproductive instinct, tribal role and raw mating drive.',
  5: 'It governs the sense of time in a dream. Time becomes deeply distorted \u2014 sometimes a whole life passes, sometimes a single instant freezes.',
  15: 'It brings the illogical jumps between dream scenes. An office one second, a cliff edge the next: that extreme shift of pace and loss of order comes from here.',
  19: 'As the exit into the Demon Realm it governs our sense of space and our cross-dimensional experience in the dream. When a design carries gate 19 (as its Design Earth, for example), the mammalian matrix establishes an extremely sharp passage in sleep that perceives changes of dream space, the intrusion of formless presences, and the deep unconscious need for environmental safety.',
  28: 'The source of the nightmare. It is pure survival anxiety: the monster lurking in the dark and chasing you, the extreme fear of a death threat \u2014 all of it is gate 28 conditioning at work.',
  38: 'Fighting, struggling and confrontation in the dream. When you are caught in physical conflict, fighting back with everything you have, or feeling an enormous physical pressure, this gate\u2019s adrenaline is discharging.',
  42: 'Ending, the experience of dying, the completion of a cycle. In the dream it appears as the decay or death of something (or of yourself), or the forced cutting of an experience.',
  53: 'An extreme pressure-release mechanism. The classic falling dream, the weightless flying dream, or running for your life and unable to move your legs \u2014 all of them are typical manifestations of gate 53.'
};

/** The dream names of the six dream channels, keyed by the stable `<low>-<high>` id. */
const DREAM_CHANNEL_NAMES = {
  '1-8': 'Inspiration',
  '5-15': 'Rhythm',
  '20-57': 'The Brain Wave',
  '27-50': 'Preservation',
  '28-38': 'Struggle',
  '42-53': 'Maturation'
};

/**
 * The core distinction of the channel teaching, kept as two separate statements:
 * a channel carried from birth is a fixed dream landscape, a channel filled in by
 * the night sky or a bed partner is conditioning carrying a chemical residue.
 */
const DREAM_CHANNEL_DEFINITION = {
  fixed: 'If the person already has this channel defined in the waking chart, it is their underlying sleep normality and immune mechanism. Their dream narrative is fixed and so is the way they handle pressure; it should not be treated as conditioning that needs intervention.',
  conditioning: 'If the person has this channel undefined in the waking chart (or holds only half of it) but it is connected temporarily at night by the transits or by a partner\u2019s aura, that forms night conditioning. These foreign instinctive reactions, which do not belong to the person, turn into chemical residue on waking and drive highly non-self behaviour and wrong business or personal decisions during the day.'
};

/** The six dream channels: night function, the fixed case, the conditioned case, the residue. */
const DREAM_CHANNEL_READING = {
  '1-8': {
    dream: 'By day it is an individual self-expression. In the dream it is the channel that looks for light inside darkness and the void. Dreams tend to be strongly surreal, sometimes with no plot at all \u2014 only a pure black background interwoven with a sudden mental delight.',
    fixed: null,
    conditioning: null,
    residue: 'Unrooted zeal or a deep melancholy. You wake either with a groundless \u201cfalse inspiration\u201d (which sends you off to execute a plan that cannot work) or sunk in an isolationist melancholy of not being understood by the world.'
  },
  '5-15': {
    dream: 'By day it is going with the flow of life. In the dream it is the chief distorter of linear time and space. While this channel runs, the sense of time collapses: a whole life may pass in the dream, or the scenes jump wildly and illogically (a meeting one second, the deep sea the next).',
    fixed: 'Your sleep itself keeps a peculiar rhythm that does not run on linear logic.',
    conditioning: null,
    residue: 'Loss of order and impatience. You wake with your body clock completely scrambled. There never seems to be enough time, the whole day is a scramble to catch up, and your BG5 decision rhythm derails entirely.'
  },
  '20-57': {
    dream: 'By day this is an extremely sharp intuitive channel. In the dream it becomes a pure mammalian alert system. When it connects in the dream, the person is highly sensitive to the physical environment of the night \u2014 small sounds, changes in air pressure. The dream rarely has a clear plot; it is filled with a state of watching and listening on high alert.',
    fixed: null,
    conditioning: null,
    residue: 'Unexplained paranoia and nervousness. You wake with an underlying anxiety that something is wrong even though nothing happened, and you over-defend yourself in business or personal exchanges during the day.'
  },
  '27-50': {
    dream: 'By day it is the family\u2019s guarding and nurturing. In the dream the social morality is stripped away and it degrades into a purely animal law: mating, tribal hierarchy, and a fierce hunger for the resources of survival. Dreams often hold a frantic search for something, the protection of the young, or raw sexual impulse.',
    fixed: 'In sleep you naturally give off a mammalian field of guarding and nurturing.',
    conditioning: null,
    residue: 'A strong sense of lack and dependency. You wake suddenly panicking about material security (fearing the company\u2019s cash flow will snap), or you develop an irrational emotional clinging and grabbing at other people.'
  },
  '28-38': {
    dream: 'By day it fights for the meaning of life. In the dream it is a pure survival battlefield. This is why so many people fight someone in a dream, struggle desperately, or are hunted by a terrifying monster. The body in bed may show tense muscles and involuntary twitching.',
    fixed: 'In the dream you do release the day\u2019s pressure through high-intensity physical movement or confrontation. For your body this is a healthy mechanism: you do not wake feeling conditioned, you wake having completed a routine discharge of energy.',
    conditioning: 'You did not have this channel, but a bed partner\u2019s energy or the transits connected it. You are forced to fight all night a war that is not yours, and the extreme exhaustion, belligerence and irritability on waking are the non-self chemical residue.',
    residue: 'Extreme exhaustion and a combative mood. The night\u2019s fight has drained the adrenaline system. You turn highly aggressive and combustible by day, and you easily stir up unnecessary conflict in team management or with clients.'
  },
  '42-53': {
    dream: 'By day it is the completion of an experience cycle. In the dream it is a channel of intense physical pressure running straight from the Root centre to the Sacral. Its most typical expressions are the classic falling dream, running and never reaching the end, or the finality of something (even yourself) dying in the dream.',
    fixed: null,
    conditioning: 'You did not have it, but it connected during the dream. You are forced to carry a cycle pressure and a sense of death and ending that are not yours, and you start the next day heavy, wanting to cut something off.',
    residue: 'Heaviness and stagnation. You wake with a deep powerlessness (depression), feeling trapped in a relationship or a business project, and the pressure left over from the night can make you impulsively want to resign or cut off a collaboration that was perfectly fine.'
  }
};

/** The three portals: what each collects at night and what it bleeds into by morning. */
const DREAM_PORTAL_READING = {
  62: {
    target: 'Ajna centre (gate 17)',
    night: 'At night it collects a large amount of Light Field information about order, structure and visual imagery.',
    morning: 'The moment the night information pours into the Ajna, the mind is forced to turn it into opinions. You wake with an extremely stubborn prejudice about something that has not happened yet, or with your head full of compulsive detail logic (grinding away at a meaningless layout in a slide deck, for instance). That non-self opinion is not something you perceived; it is the night\u2019s rubbish that portal 62 shoved into your Ajna centre in the morning.'
  },
  12: {
    target: 'Solar Plexus centre (gate 22)',
    night: 'At night it processes the most worldly material tugging, the chaotic rhythm, and mutation and suppression at the level of the body.',
    morning: '12-22 is a highly destructive individual emotional channel. When the night\u2019s sense of earthly gravity bleeds through gate 12 into gate 22, the most direct result on waking is morning grumpiness and an irrational dislike of all social contact. You feel a deep melancholy and do not want to speak to anyone. Face a client or a partner in that state and you come across as utterly cold, even aggressive \u2014 and you wreck a whole day of relationships before the morning is over.'
  },
  19: {
    target: 'Solar Plexus centre (gate 49)',
    night: 'At night it is immersed in the Demon Realm, absorbing the most basic survival fear, spatial anxiety and animal lack from the environment.',
    morning: 'This is the most violent and the most painful of all the bleeds. When the underlying survival fear bleeds through gate 19 into gate 49, it turns into explosive tribal anger and emotional blackmail. You wake feeling utterly unsafe and desperately in need of attention and reassurance (clinging). If a partner or a team member does not immediately meet your emotional or material need, gate 49 erupts: \u201cIf you will not take care of me, I refuse you and I cut the relationship.\u201d The illogical shouting match many couples have at dawn, the business partner who suddenly wants to dissolve the company \u2014 both come from the Demon Realm bleed of portal 19 taking over the Solar Plexus.'
  }
};

/**
 * The six night forces, one shared set for all fifteen dream gates. `waking` is the
 * waking profile\u2019s own theme, which the view pairs with the profile name it
 * already renders; `dream` is the night-force mechanism and `residue` what it
 * leaves behind.
 */
const DREAM_LINE_READING = {
  1: {
    waking: 'founding the base, fear of the unknown',
    dream: 'The night force of line 1 is stealth. When conditioning enters through line 1 it does so silently. In the dream you may see yourself hiding something, discovering a secret, or watching from a dark place.',
    residue: 'The conditioning works like a Trojan program. You may remember nothing of the dream on waking, yet the conditioning has already been planted in secret, and over the following days you feel an unexplained underlying doubt or fear about something.'
  },
  2: {
    waking: 'natural talent, being projected onto',
    dream: 'In the dream chart line 2 means a complete loss of autonomy. Possession here is not a paranormal event: the machinery of the dream has taken you over. You do things in the dream you could never do awake, and your reactions and character are nothing like your own.',
    residue: 'You wake feeling profoundly strange, as though somebody else\u2019s life was lived inside your body overnight. The residue seriously disturbs your self-identity during the day and pulls your decisions off their true course.'
  },
  3: {
    waking: 'trial and error, mutation, adaptation',
    dream: 'In the dream, line 3 is an extremely unstable physical and psychological energy. It brings collision, chase, breakage and violent scene changes.',
    residue: 'This is the line that most easily shows up physically. Someone with a line-3 dream tends to toss and turn in bed, kick the covers off, even sleepwalk or wake with a start. On waking you feel extremely tired and depleted even after a long sleep, as though you fought a whole night\u2019s war in the dream.'
  },
  4: {
    waking: 'networking, externalising',
    dream: 'The night force of line 4 is extremely grabbing. In the dream it nails your attention to one particular person, one sentence or one scene, producing a highly repetitive dream pattern.',
    residue: 'On waking the force becomes obsession. You may spend the whole day compulsively thinking about the person from the dream, or be unable to let go of one thought. In the non-self state, obsession planted at night easily becomes impulsive, wrong business or personal decisions during the day.'
  },
  5: {
    waking: 'universalising, solving crises, receiving projection',
    dream: 'Line 5 is the most seductive dream-weaver of all. It produces enormous, beautiful or highly dramatic fantasies. In the dream you may experience the ultimate romance, success, or becoming some kind of saviour.',
    residue: 'The residue of line 5 is the most dangerous, because it makes you fall in love with a non-self illusion. Facing the gap with reality on waking, the residue pushes you to chase a pie in the sky that was never yours and never real, wrecking the pragmatic foundation you built through strategy and authority.'
  },
  6: {
    waking: 'objective, detached, transitional',
    dream: 'In the dream, line 6 creates a strong sense of separation. You may have a lucid dream (knowing that you are dreaming), or look down on yourself in the dream from a third-person, god\u2019s-eye view. It also brings grand, forward-looking images that do not belong to your personal dimension.',
    residue: 'The conditioning of line 6 leaves a person feeling on waking that their soul is not inside their body and that they are cut off from the real world. That detachment makes you seem cold and absent-minded during the day, unable to put your energy into the material and business work right in front of you.'
  }
};

/**
 * The thirteen planets in a dream, keyed by the engine\u2019s stable planet ids \u2014
 * never by display text (AGENTS.md \u00a74). `role` is the document\u2019s own subtitle
 * for the planet, `mechanics` is how it operates, `dream` how it shows up and
 * `residue` what it leaves behind. The document treats the two lunar nodes as one
 * topic and the three outer planets as one topic, so those share paragraphs.
 */
const OUTER_PLANET_MECHANICS = 'Because they move so slowly they do not bring fast-switching plots; for years they lay down background radiation over humanity\u2019s dream base.';
const NODE_MECHANICS = 'The lunar nodes are not bodies but the crossing points of the Moon\u2019s orbit and the Earth\u2019s orbit. A transiting node stays in one gate for months, and when it enters a dream gate it sets the backdrop and the stage set of everybody\u2019s dreams for that whole period.';
const NODE_DREAM = 'The nodes do not produce plot (that is the Sun and the planets); they produce atmosphere. If the North Node enters gate 19, the Demon Realm portal, then for months humanity\u2019s sensitivity at night to physical space, dark energy and unknown environments is collectively amplified, as though the whole planet\u2019s dreaming had moved into a shamanic cave full of primal pressure. If the node falls in gate 62, the Light Field portal, the dream backdrop becomes highly structured, full of geometry or seemingly orderly detail.';
const NODE_RESIDUE = 'What the nodes leave is not a day or two of bad temper but a shift in the base tone of the collective unconscious for a whole period. As a leader or a consultant, reading the nodes\u2019 dream transits is how you see what collective environment your team and your clients are being conditioned by underneath.';

const DREAM_PLANET_READING = {
  sun: {
    role: 'the ultimate axis and theme of the night',
    mechanics: 'Day or night, the transit Sun always holds 70% of the neutrino information stream. It is the strongest instruction the Program issues, and it stands for core life force.',
    dream: 'The transit Sun sets the overall dream theme of the whole planet for that night. When it enters one of the fifteen dream gates it works like a searchlight, driving that gate\u2019s mammalian instinct into everybody\u2019s unconscious base. Another planet (Mercury, Venus) in a dream gate may be an interlude in the dream, but the Sun in a dream gate is the core plot. When the transit Sun reaches gate 42 (dying, ending), the tone of everybody\u2019s dreams in that period carries the weight of \u201cthis is reaching its end, the cycle has to close\u201d.',
    residue: 'The residue the Sun leaves is the most dominating of all. On waking, your basic vitality for the whole day is pulled along by the theme the Sun planted overnight.'
  },
  earth: {
    role: 'the physical gravity field of the dream',
    mechanics: 'On the mandala the transit Earth always sits exactly 180 degrees from the transit Sun. The Sun is the theme released, the Earth is that theme landed in matter. DreamRave is an extremely physical matrix, utterly tied to the body, and a transiting Earth in a dream stands for strong physical gravity and bodily solidity.',
    dream: 'If the transit Earth enters a dream gate it anchors the feeling of the dream to the senses of the body. You feel real pain, real hunger, extreme fatigue, or extremely clear touch in the dream (the suffocation of falling into water, the pressure of being held down). Only one pair in these fifteen gates is an exact opposition in the 64-gate mandala: gate 27 (yearning, of the Earth Plane) and gate 28 (fear, of the Demon Realm). That means a few days a year when the transit Sun is in 27 the transit Earth must be in 28, and the other way round. On those days the dream chart takes the maximum bombardment from Sun and Earth at once: sleeping then, everybody\u2019s unconscious is torn between an extreme material grasping at lack (27) and pure survival fear of death (28), producing the worst collective nightmares and morning anxiety.',
    residue: null
  },
  northNode: {
    role: 'the collective stage of the unconscious: where this life is heading (the second half)',
    mechanics: NODE_MECHANICS,
    dream: NODE_DREAM,
    residue: NODE_RESIDUE
  },
  southNode: {
    role: 'the collective stage of the unconscious: where this life comes from (the first half)',
    mechanics: NODE_MECHANICS,
    dream: NODE_DREAM,
    residue: NODE_RESIDUE
  },
  moon: {
    role: 'the spotlight and detail anchor of the dream',
    mechanics: 'The Moon is the fastest body and the most active gear of the night program. It drives the focus of the dream.',
    dream: 'When the transit Moon enters a dream gate it enlarges one close-up with extreme clarity: a shape, a particular smell, or a tiny object with an intense physical solidity.',
    residue: 'On waking you often cannot recall the plot, but you cannot let go of that one detail, and during the day you find yourself obsessing over some utterly trivial point in a business or personal decision.'
  },
  mercury: {
    role: 'the messenger whose translation always fails',
    mechanics: 'Mercury stands for communication and the transfer of information. In a dream it tries to force the five-centre mammalian data into human language.',
    dream: 'A transiting Mercury is the core physical cause of sleep-talking, especially when it enters gate 12 (the Mutation portal, which connects to the Throat centre). The body tries to deliver the dream through the vocal system, but with no mental logic involved what comes out is meaningless murmuring or broken words.',
    residue: 'You wake with a dry throat, or with an intense sense of grievance that you failed to say something clearly.'
  },
  venus: {
    role: 'the mammalian law with morality stripped away',
    mechanics: 'By day Venus is about human values and love. In the dream social morality is entirely stripped away and Venus degrades into pure animal attraction, the reproductive instinct and the establishing of the tribe.',
    dream: 'When Venus interacts with gate 50 (sex) or gate 27 (yearning) in particular, it produces extremely raw sexual dreams, or dreams about protecting the young and about tribal rank (who submits to whom). There is nothing romantic in it, only physical mating and the maintenance of the group.',
    residue: 'This conditioning makes you judge colleagues and clients during the day by an animal sense of tribal rank, producing irrational closeness or rejection.'
  },
  mars: {
    role: 'the engine of the nightmare and the night fight',
    mechanics: 'Mars is immature, violent mutational energy. In a dream it is the fuse that fires the adrenaline system directly.',
    dream: 'When a transiting Mars enters a Demon Realm gate (28, 38, 42, 53) or forms a channel with one, it becomes a classic nightmare machine. It brings chase, biting, falling, violent confrontation. The body in bed may twitch, sweat, even sleepwalk.',
    residue: 'You wake as though you really fought a fight: utterly spent and spoiling for a row. By day you are highly aggressive and pick a fight over nothing in a business negotiation.'
  },
  jupiter: {
    role: 'the distortion and weight of the rules: expansion',
    mechanics: null,
    dream: 'In a dream it magnifies one dimension of experience without limit. Jupiter in the Demon Realm magnifies fear to cosmic scale; Jupiter in the Light Field can give you a false rapture with no boundaries.',
    residue: null
  },
  saturn: {
    role: 'the distortion and weight of the rules: restriction',
    mechanics: null,
    dream: 'In a dream it brings an intense sense of gravity and constraint. The classic sleep paralysis, or being trapped in a maze or an abyss and unable to move, is usually the physical manifestation of a transiting Saturn pressing hard on a channel such as 15-5 or 53-42. You wake with a deep sense of oppression and powerlessness.',
    residue: null
  },
  uranus: {
    role: 'the deep generational gene conditioning',
    mechanics: OUTER_PLANET_MECHANICS,
    dream: 'It sends a sudden electric shock through the nervous system, so sleep is extremely broken and you wake again and again.',
    residue: null
  },
  neptune: {
    role: 'the deep generational gene conditioning',
    mechanics: OUTER_PLANET_MECHANICS,
    dream: 'It produces the thickest mental fog: in the dream you lose all sense of direction, and you may even experience cross-dimensional information leaking in.',
    residue: null
  },
  pluto: {
    role: 'the deep generational gene conditioning',
    mechanics: OUTER_PLANET_MECHANICS,
    dream: 'It brings a night fear that has to do with life and death, decay, and deep genetic reorganisation.',
    residue: null
  }
};

/** The page-frame sentence for the two halves of a sleeping design. */
const DREAM_SIDE_MEANING = { design: 'the direction the dream evolves', personality: 'the consciousness inside the dream' };

/** The page-frame sentence for the two sources of a dream\u2019s shape. */
const DREAM_CONDITIONING = {
  natal: 'the fixed dream state of your own design',
  external: 'transits or a partner are the \u201cweather\u201d of conditioning that steers where the dream goes'
};

const english = {
  typeName: name => name || '—',
  strategy: name => typeFacts[typeIdByName[name]]?.strategy || '—',
  notSelf: name => typeFacts[typeIdByName[name]]?.notSelf || '—',
  signature: name => typeFacts[typeIdByName[name]]?.signature || '—',
  authorityName: name => name || '—',
  profileName: numbers => engine.PROFILES[numbers]?.name || '',
  definitionName: value => value || '—',
  centerName: key => engine.CENTERS[key]?.name || key || '—',
  gateName: n => engine.GATES[n]?.name || `Gate ${n}`,
  hexagramName: n => engine.HEXAGRAM_DESCRIPTIONS[n]?.name || `Hexagram ${n}`,
  channelName: gates => CHANNELS[Array.isArray(gates) ? gates.join('-') : gates] || String(gates),
  circuitName: value => CIRCUITS[String(value).replace(/\s+Circuit$/i, '').toLowerCase()] || value || '—',
  circuitGroupName: value => `${CIRCUITS[value]} Group`,
  planetName: value => PLANETS[value] || value,
  lineName: value => engine.LINE_NAMES[value] || value,
  variable: slot => [slot?.name || '—', slot?.description || ''],
  cognition: name => name || '—',
  typeDescription: name => TYPE_PLAIN[name] || '',
  dreamGateName: gate => DREAM_GATES[gate] || `Gate ${gate}`,
  dreamLineTheme: line => DREAM_LINES[line] || `Line ${line}`,
  dreamRealmName: realm => DREAM_REALMS[realm] || realm || '—',
  dreamTypeName: id => DREAM_TYPES[id] || id || '—',
  /* Reading accessors: `null` means the source does not answer, and the view
     renders nothing rather than an invented paragraph. */
  dreamTypeReading: id => DREAM_TYPE_READING[id] || null,
  dreamGateReading: gate => DREAM_GATE_READING[gate] || null,
  dreamChannelName: key => DREAM_CHANNEL_NAMES[key] || null,
  dreamChannelReading: key => DREAM_CHANNEL_READING[key] || null,
  dreamChannelDefinition: kind => DREAM_CHANNEL_DEFINITION[kind] || null,
  dreamPortalReading: gate => DREAM_PORTAL_READING[gate] || null,
  dreamLineReading: line => DREAM_LINE_READING[line] || null,
  dreamPlanetReading: planet => DREAM_PLANET_READING[planet] || null,
  dreamSideMeaning: side => DREAM_SIDE_MEANING[side] || null,
  dreamConditioning: kind => DREAM_CONDITIONING[kind] || null
};

const graphCenters = { head:'Head', ajna:'Ajna', throat:'Throat', g:'G', heart:'Ego', spleen:'Spleen', solar:'Solar Plexus', sacral:'Sacral', root:'Root' };
export default {
  code: 'en', label: 'English', matches: language => /^en(?:-|$)/i.test(language),
  messages: contexts.en,
  timeline: { locale: 'en-GB', messages: {} },
  vocabulary: { ...english, graphCenter: key => graphCenters[key] || key },
  content: { data: engine, text: value => value || '', cross: value => value?.fullName || value?.name || 'Unknown' },
  format: {
    sensitivity: value => value,
    list: items => items.length < 2 ? items[0] || '' : items.length === 2 ? items.join(' and ') : items.slice(0,-1).join(', ') + ' and ' + items.at(-1),
    separated: (items, kind) => items.join(kind === 'channels' ? '; ' : ', '),
    parentheses: value => '(' + value + ')',
    planetGateLine: (gate, hexagram, line) => `Gate ${gate} · Line ${line}`,
    gateTooltip: (name, hexagram) => name,
    channelTooltip: (name, gates) => name + ' (' + gates + ')',
    channelDetail: (name, gates) => 'Channel of ' + name + ' (' + gates + ')',
    circuitSummary: (name, countLabel) => name.replace(/^./, c => c.toUpperCase()) + ' (' + countLabel + ')',
    lineTag: (line, name) => ' — Line ' + line + ', the ' + name,
    centerAria: (name, status, label) => name + ' center, ' + status,
    channelCenters: (keys, names) => keys.join(' ↔ '),
    inlineDate: date => ' (' + date + ')',
    originalTerm: name => '',
    separator: kind => kind === 'cognition' ? '—' : ' — ',
    birth: (date, time) => {
      const [y,m,d] = date.split('-').map(Number);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      let out = months[m-1] + ' ' + d + ', ' + y;
      if (time) { const [h,min] = time.split(':').map(Number); out += ' · ' + (h % 12 || 12) + ':' + String(min).padStart(2,'0') + ' ' + (h >= 12 ? 'PM' : 'AM'); }
      return out;
    }
  }
};
