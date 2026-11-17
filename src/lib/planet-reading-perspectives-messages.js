// Planet detail UI labels for the two reading categories.
// Product prose lives in planet-reference.js (Human Design) and planet-business-content.json;
// these are interface strings only. The second category is named OC16 by user decision; its
// copy still comes from the BG5 textbook planet section, not from official OC16 source text.
import { registerMessages } from './i18n.js';

// All three catalogs are explicit: the source keys are internal names, not English copy.
registerMessages('zh-CN', {
  'Planet reading human design': '人类图',
  'Planet reading business': 'OC16',
  'Planet reading business pending': 'OC16 解读待整理'
});
registerMessages('zh-Hant', {
  'Planet reading human design': '人類圖',
  'Planet reading business': 'OC16',
  'Planet reading business pending': 'OC16 解讀待整理'
});
registerMessages('en', {
  'Planet reading human design': 'Human Design',
  'Planet reading business': 'OC16',
  'Planet reading business pending': 'OC16 reading pending'
});
