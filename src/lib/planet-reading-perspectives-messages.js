// Planet detail UI labels for the two reading categories.
// Product prose lives in planet-reference.js (Human Design) and planet-business-content.json;
// these are interface strings only.
import { registerMessages } from './i18n.js';

// All three catalogs are explicit: the source keys are internal names, not English copy.
registerMessages('zh-CN', {
  'Planet reading human design': '人类图',
  'Planet reading business': '商业',
  'Planet reading business pending': '商业解读待整理'
});
registerMessages('zh-Hant', {
  'Planet reading human design': '人類圖',
  'Planet reading business': '商業',
  'Planet reading business pending': '商業解讀待整理'
});
registerMessages('en', {
  'Planet reading human design': 'Human Design',
  'Planet reading business': 'Business',
  'Planet reading business pending': 'Business reading pending'
});
