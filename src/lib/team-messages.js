import { registerMessages } from './i18n.js';
const messages = {
  en: { 'Team direct selection': 'Select 3–5 people to analyze', 'Team advanced': 'Advanced team management', 'Team estimated time': 'Estimated · 12:00', 'Team gates': 'Twelve gates', 'Team contributions': 'Member contributions' },
  'zh-CN': { 'Team direct selection': '选择 3–5 人直接分析', 'Team advanced': '高级团队管理', 'Team estimated time': '估算 · 12:00', 'Team gates': '十二闸门', 'Team contributions': '成员贡献' },
  'zh-Hant': { 'Team direct selection': '選擇 3–5 人直接分析', 'Team advanced': '進階團隊管理', 'Team estimated time': '估算 · 12:00', 'Team gates': '十二閘門', 'Team contributions': '成員貢獻' }
};
for (const [locale, values] of Object.entries(messages)) registerMessages(locale, values);
