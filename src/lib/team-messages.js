import { registerMessages } from './i18n.js';
const messages = {
  en: { 'Team direct selection': 'Select 3–5 people to analyze', 'Team advanced': 'Advanced team management', 'Team estimated time': 'Estimated · 12:00', 'Team gates': 'Twelve gates', 'Team contributions': 'Member contributions' },
  'zh-CN': { 'Team direct selection': '选择 3–5 人直接分析', 'Team advanced': '高级团队管理', 'Team estimated time': '估算 · 12:00', 'Team gates': '十二闸门', 'Team contributions': '成员贡献' },
  'zh-Hant': { 'Team direct selection': '選擇 3–5 人直接分析', 'Team advanced': '進階團隊管理', 'Team estimated time': '估算 · 12:00', 'Team gates': '十二閘門', 'Team contributions': '成員貢獻' }
};
const flow = {
 en: { 'Team manage':'Manage teams', 'Team add person':'+ Add person', 'Team search people':'Search name, date or ID', 'Team create person':'New person', 'Team temporary':'Temporary Penta', 'Team choose more':'Choose 3–5 people. Analysis updates automatically.', 'Team five limit':'Five people maximum. Create a new Penta to add more.', 'Team move person':'Move {name} from {group} to this Penta?', 'Team structure preview':'Structure preview · choose at least three people' },
 'zh-CN': { 'Team manage':'管理团队', 'Team add person':'+ 添加人物', 'Team search people':'搜索姓名、日期或编号', 'Team create person':'新建人物', 'Team temporary':'临时 Penta', 'Team choose more':'选择 3–5 人，自动更新分析。', 'Team five limit':'每组最多 5 人，请新建小组继续添加。', 'Team move person':'将 {name} 从 {group} 移到当前小组？', 'Team structure preview':'结构示意 · 至少选择三人' },
 'zh-Hant': { 'Team manage':'管理團隊', 'Team add person':'+ 添加人物', 'Team search people':'搜尋姓名、日期或編號', 'Team create person':'建立人物', 'Team temporary':'臨時 Penta', 'Team choose more':'選擇 3–5 人，自動更新分析。', 'Team five limit':'每組最多 5 人，請建立小組繼續添加。', 'Team move person':'將 {name} 從 {group} 移到目前小組？', 'Team structure preview':'結構示意 · 至少選擇三人' }
};
for (const [locale, values] of Object.entries(messages)) registerMessages(locale, { ...values, ...flow[locale] });
