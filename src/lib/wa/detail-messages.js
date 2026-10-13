import { registerMessages } from '../i18n.js';

const messages = {
  'Wa detail activations': ['展开激活明细', '展開啟動明細', 'Show activation details'],
  'Wa detail relationships': ['参与成员的连接情况', '參與成員的連接情況', 'How people connect the channel'],
  'Wa detail combinations': ['两端的成员组合', '兩端的成員組合', 'People activating the two gates'],
  'Wa detail none': ['无', '無', 'None'],
  'Wa detail channel reading': ['通道解读', '通道解讀', 'Channel reading'],
  'Wa detail gate reading': ['闸门知识', '閘門知識', 'Gate knowledge'],
  'Wa detail related': ['对应通道与部门', '對應通道與部門', 'Related channel and department'],
  'Wa detail unavailable': ['资料暂不可用', '資料暫不可用', 'Reading unavailable'],
  'Wa detail unknown source': ['来源未知', '來源未知', 'Unknown source']
};
for (const [locale, index] of [['en', 2], ['zh-CN', 0], ['zh-Hant', 1]]) {
  registerMessages(locale, Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[index]])));
}
