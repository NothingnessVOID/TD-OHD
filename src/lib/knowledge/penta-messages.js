import { registerMessages } from '../i18n.js';
const messages = {
  en: { 'Penta structure and activations':'Structure and activations', 'Penta verified structure':'Verified structural sources', 'Penta sources and review':'Sources and review', 'Penta specific interpretation missing':'Specific interpretation has not been verified.', 'Penta evidence status':'Evidence status', 'Penta evidence scope':'Scope', 'Penta overview':'Penta overview', 'Penta Power Column':'Power Column', 'Penta family and business':'Family and business' },
  'zh-CN': { 'Penta structure and activations':'结构与激活数据', 'Penta verified structure':'已核实结构资料', 'Penta sources and review':'来源及审核说明', 'Penta specific interpretation missing':'专属解读尚未核实。', 'Penta evidence status':'证据状态', 'Penta evidence scope':'证据范围', 'Penta overview':'Penta 总览', 'Penta Power Column':'能量主轴', 'Penta family and business':'家庭与事业' },
  'zh-Hant': { 'Penta structure and activations':'結構與激活資料', 'Penta verified structure':'已核實結構資料', 'Penta sources and review':'來源及審核說明', 'Penta specific interpretation missing':'專屬解讀尚未核實。', 'Penta evidence status':'證據狀態', 'Penta evidence scope':'證據範圍', 'Penta overview':'Penta 總覽', 'Penta Power Column':'能量主軸', 'Penta family and business':'家庭與事業' }
};
for (const [locale, values] of Object.entries(messages)) registerMessages(locale, values);
