import { registerMessages } from '../i18n.js';

const messages = {
  'Wa detail activations': ['展开激活明细', '展開啟動明細', 'Show activation details'],
  'Wa detail relationships': ['结构关系', '結構關係', 'Structural relationships'],
  'Wa detail combinations': ['跨成员组合', '跨成員組合', 'Cross-member combinations'],
  'Wa detail none': ['无', '無', 'None'],
  'Wa detail channel reading': ['通道解读', '通道解讀', 'Channel reading'],
  'Wa detail gate reading': ['闸门知识', '閘門知識', 'Gate knowledge'],
  'Wa detail related': ['对应通道与部门', '對應通道與部門', 'Related pair and department'],
  'Wa detail unavailable': ['资料暂不可用', '資料暫不可用', 'Reading unavailable'],
  'Wa detail unknown source': ['来源未知', '來源未知', 'Unknown source']
};
for (const [locale, index] of [['en', 2], ['zh-CN', 0], ['zh-Hant', 1]]) {
  registerMessages(locale, Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[index]])));
}
