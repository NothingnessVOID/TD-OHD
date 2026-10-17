/**
 * Organization-page role readings for OC16 department / channel / gate popups.
 * Separate from content-data.json (BG5-sourced Wa catalog, frozen by unit tests).
 * Do not put natal chart prose or the four-foundation (1/7/13/33) summary here.
 */
import { getLocale, registerMessages, t } from '../i18n.js';
import { OC16_DEPARTMENTS } from './oc16-catalog.js';

const locales = ['zh-CN', 'zh-Hant', 'en'];

/** Department positioning phrases shown as the channel summary. */
const departmentRoles = {
  management: ['权力和资源的分配者', '權力和資源的分配者', 'Allocator of authority and resources'],
  competition: ['冲锋陷阵的开拓者', '衝鋒陷陣的開拓者', 'Pioneer that charges into the field'],
  direction: ['企业的能量引擎', '企業的能量引擎', 'Energy engine of the enterprise'],
  interaction: ['人际关系的粘合剂', '人際關係的黏合劑', 'Bond that holds relationships together'],
  logic: ['企业底线与后勤保障', '企業底線與後勤保障', 'Baseline values and logistics support'],
  innovation: ['打破僵局的研发中心', '打破僵局的研發中心', 'Research center that breaks deadlocks']
};

/** Org-role nicknames for the twelve department gates (not vocabulary gateName). */
const gateRoles = {
  45: ['统治者', '統治者', 'Ruler'],
  21: ['控制者', '控制者', 'Controller'],
  51: ['冲击', '衝擊', 'Shock'],
  25: ['天真 / 无私', '天真 / 無私', 'Innocence / selflessness'],
  14: ['大蓄', '大畜', 'Great provision'],
  2: ['坤 / 方向', '坤 / 方向', 'Receptive / direction'],
  59: ['亲密', '親密', 'Intimacy'],
  6: ['冲突 / 调和', '衝突 / 調和', 'Friction / reconciliation'],
  50: ['价值观', '價值觀', 'Values'],
  27: ['滋养', '滋養', 'Nourishment'],
  60: ['限制', '限制', 'Limitation'],
  3: ['秩序 / 突变', '秩序 / 突變', 'Ordering / mutation'],
  44: ['识人', '識人', 'Recognizing people'],
  26: ['经营', '經營', 'Stewardship']
};

const gateBodies = {
  45: [
    '董事长 / CEO。拥有最终的话语权，负责对外宣布决定，代表权威。',
    '董事長 / CEO。擁有最終的話語權，負責對外宣布決定，代表權威。',
    'Chair / CEO. Holds the final say, announces decisions outward, and represents authority.'
  ],
  21: [
    '营运长 / 执行官。负责实际控制资金、物资，把事情落地，盯紧流程。',
    '營運長 / 執行官。負責實際控制資金、物資，把事情落地，盯緊流程。',
    'COO / operator. Controls funds and materials in practice, drives delivery, and watches process.'
  ],
  51: [
    '负责发起行动，带领公司在危机中寻找机会，敢于做行业第一。',
    '負責發起行動，帶領公司在危機中尋找機會，敢於做行業第一。',
    'Initiates action, leads the company to find opportunity in crisis, and dares to go first.'
  ],
  25: [
    '带来跨越障碍的凝聚力与广阔的爱，在竞争中保持企业的精神高度。',
    '帶來跨越障礙的凝聚力與廣闊的愛，在競爭中保持企業的精神高度。',
    'Brings cohesion and a wide care that cross obstacles, keeping spirit high through competition.'
  ],
  14: [
    '公司的「金库」与动力源，提供源源不绝的物质基础和运作资金。',
    '公司的「金庫」與動力源，提供源源不絕的物質基礎和運作資金。',
    'The company treasury and power source—steady material base and operating funds.'
  ],
  2: [
    '握着方向盘的司机。负责把 14 号闸门的庞大资源，精准地投入到正确的路线上。',
    '握著方向盤的司機。負責把 14 號閘門的龐大資源，精準地投入到正確的路線上。',
    'The driver at the wheel. Steers Gate 14’s large resources onto the right route.'
  ],
  59: [
    '打破部门与部门、公司与客户之间的隔阂，促进合作（繁殖 / 扩大规模）。',
    '打破部門與部門、公司與客戶之間的隔閡，促進合作（繁殖 / 擴大規模）。',
    'Breaks barriers between departments and with customers, enabling cooperation and growth.'
  ],
  6: [
    '情绪与冲突管理。处理团队内部的摩擦，设定边界，决定跟谁合作、拒绝谁。',
    '情緒與衝突管理。處理團隊內部的摩擦，設定邊界，決定跟誰合作、拒絕誰。',
    'Manages emotion and conflict—handles friction, sets boundaries, and chooses who to work with.'
  ],
  50: [
    '公司的法律法规、规章制度、道德底线与核心价值观。',
    '公司的法律法規、規章制度、道德底線與核心價值觀。',
    'Laws, policies, ethical baseline, and core values of the company.'
  ],
  27: [
    '员工福利、后勤照顾、薪酬保障。确保团队成员得到良好的照顾而愿意卖力。',
    '員工福利、後勤照顧、薪酬保障。確保團隊成員得到良好的照顧而願意賣力。',
    'Benefits, care logistics, and pay security—so people are looked after and willing to contribute.'
  ],
  60: [
    '接受现实的限制条件（资金有限、技术瓶颈），在旧体制中积蓄能量。',
    '接受現實的限制條件（資金有限、技術瓶頸），在舊體制中積蓄能量。',
    'Accepts real limits (budget, tech bottlenecks) and gathers power inside the current system.'
  ],
  3: [
    '在混沌中建立新秩序。带来突破性的技术创新、产品迭代或商业模式重组。',
    '在混沌中建立新秩序。帶來突破性的技術創新、產品迭代或商業模式重組。',
    'Builds new order from chaos—breakthroughs in tech, product iteration, or business model.'
  ],
  44: [
    '识别合适的人与机会，把对的人才带进组织讨论。',
    '識別合適的人與機會，把對的人才帶進組織討論。',
    'Recognizes the right people and openings, and brings fit talent into the conversation.'
  ],
  26: [
    '经营经验、资源与说服力，把已有价值说清楚并落到用人安排上。',
    '經營經驗、資源與說服力，把已有價值說清楚並落到用人安排上。',
    'Stewards experience, resources, and persuasion—makes existing value clear in staffing choices.'
  ]
};

const channelIntros = {
  '45-21': [
    '管理部门的核心通道。两端闸门分别代表对外权威与对内落地，共同完成权力和资源的分配。',
    '管理部門的核心通道。兩端閘門分別代表對外權威與對內落地，共同完成權力和資源的分配。',
    'Core management channel. The two gates hold outward authority and inward delivery together.'
  ],
  '51-25': [
    '竞争部门的核心通道。一端发起冲击，一端守住精神高度，让开拓与凝聚同在。',
    '競爭部門的核心通道。一端發起衝擊，一端守住精神高度，讓開拓與凝聚同在。',
    'Core competition channel. One end initiates shock; the other keeps spirit and cohesion.'
  ],
  '2-14': [
    '方向部门的核心通道。一端提供动力与物质基础，一端把资源开上正确路线。',
    '方向部門的核心通道。一端提供動力與物質基礎，一端把資源開上正確路線。',
    'Core direction channel. One end supplies power and means; the other steers them onto the path.'
  ],
  '59-6': [
    '互动部门的核心通道。一端打开隔阂促进合作，一端管理摩擦与边界。',
    '互動部門的核心通道。一端打開隔閡促進合作，一端管理摩擦與邊界。',
    'Core interaction channel. One end opens barriers for cooperation; the other manages friction and bounds.'
  ],
  '27-50': [
    '保存部门的核心通道。一端守住价值与制度底线，一端滋养团队持续出力。',
    '保存部門的核心通道。一端守住價值與制度底線，一端滋養團隊持續出力。',
    'Core preservation channel. One end holds values and rules; the other nourishes the team.'
  ],
  '3-60': [
    '创新部门的核心通道。一端接受限制并积蓄，一端在混沌中建立新秩序。',
    '創新部門的核心通道。一端接受限制並積蓄，一端在混沌中建立新秩序。',
    'Core innovation channel. One end accepts limits and gathers force; the other orders the new.'
  ],
  '26-44': [
    '人事通道。帮助组织识别合适的人，并把经验与资源经营到用人安排里。',
    '人事通道。幫助組織識別合適的人，並把經驗與資源經營到用人安排裡。',
    'Personnel channel. Helps recognize fit people and stewards experience into staffing choices.'
  ]
};

const channelGateOrder = {
  '45-21': [45, 21],
  '51-25': [51, 25],
  '2-14': [14, 2],
  '59-6': [59, 6],
  '27-50': [50, 27],
  '3-60': [60, 3],
  '26-44': [44, 26]
};

const uiMessages = {
  'Wa org role label': ['部门定位', '部門定位', 'Department role'],
  'Wa org channel reading': ['组织通道解读', '組織通道解讀', 'Organization channel reading'],
  'Wa org gate reading': ['组织闸门解读', '組織閘門解讀', 'Organization gate reading'],
  'Wa org gate role': ['组织角色', '組織角色', 'Organization role']
};

for (const [i, locale] of locales.entries()) {
  const bag = Object.fromEntries(Object.entries(uiMessages).map(([k, v]) => [k, v[i]]));
  for (const [id, values] of Object.entries(departmentRoles)) {
    bag[`OC16 org role ${id}`] = values[i];
  }
  for (const [gate, values] of Object.entries(gateRoles)) {
    bag[`OC16 org gate role ${gate}`] = values[i];
  }
  for (const [gate, values] of Object.entries(gateBodies)) {
    bag[`OC16 org gate body ${gate}`] = values[i];
  }
  for (const [id, values] of Object.entries(channelIntros)) {
    bag[`OC16 org channel intro ${id}`] = values[i];
  }
  registerMessages(locale, bag);
}

const aliasToPackage = Object.freeze({
  '21-45': '45-21', '45-21': '45-21',
  '25-51': '51-25', '51-25': '51-25',
  '2-14': '2-14', '14-2': '2-14',
  '6-59': '59-6', '59-6': '59-6',
  '27-50': '27-50', '50-27': '27-50',
  '3-60': '3-60', '60-3': '3-60',
  '26-44': '26-44', '44-26': '26-44'
});

export function canonicalOrgChannelId(channelId) {
  if (typeof channelId !== 'string') return null;
  return aliasToPackage[channelId] || null;
}

export function orgDepartmentIdForChannel(channelId) {
  const pack = canonicalOrgChannelId(channelId);
  if (!pack) return null;
  if (pack === '26-44') return 'management';
  const department = OC16_DEPARTMENTS.find(row => row.pairs.some(pair => pair.channelId === channelId || canonicalOrgChannelId(pair.channelId) === pack));
  return department?.id ?? null;
}

export function readOrgChannelReading(channelId, locale = getLocale()) {
  const pack = canonicalOrgChannelId(channelId);
  if (!pack || !locales.includes(locale)) return null;
  const departmentId = orgDepartmentIdForChannel(pack === '26-44' ? '26-44' : channelId);
  const gates = channelGateOrder[pack];
  if (!gates) return null;
  return {
    channelId: pack,
    departmentId,
    roleKey: departmentId ? `OC16 org role ${departmentId}` : null,
    introKey: `OC16 org channel intro ${pack}`,
    gates
  };
}

export function readOrgGateReading(gate, locale = getLocale()) {
  const id = Number(gate);
  if (!Number.isInteger(id) || !gateRoles[id] || !locales.includes(locale)) return null;
  const department = OC16_DEPARTMENTS.find(row => row.pairs.some(pair => pair.gates.includes(id)));
  const pair = department?.pairs.find(row => row.gates.includes(id));
  return {
    gate: id,
    departmentId: department?.id ?? null,
    channelId: pair?.channelId ?? null,
    roleKey: `OC16 org gate role ${id}`,
    bodyKey: `OC16 org gate body ${id}`
  };
}

/** Plain strings for the current locale (already registered). */
export function orgChannelCopy(channelId, locale = getLocale()) {
  const reading = readOrgChannelReading(channelId, locale);
  if (!reading) return null;
  return {
    ...reading,
    role: reading.roleKey ? t(reading.roleKey) : '',
    intro: t(reading.introKey),
    gateLines: reading.gates.map(gate => ({
      gate,
      role: t(`OC16 org gate role ${gate}`),
      body: t(`OC16 org gate body ${gate}`)
    }))
  };
}

export function orgGateCopy(gate, locale = getLocale()) {
  const reading = readOrgGateReading(gate, locale);
  if (!reading) return null;
  return {
    ...reading,
    role: t(reading.roleKey),
    body: t(reading.bodyKey)
  };
}
