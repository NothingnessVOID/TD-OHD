import * as zh from './vocabulary.js';
export default {
  code: 'zh-CN', label: '简体中文', matches: language => /^zh(?:-(?:CN|SG|Hans(?:-[a-z]+)?))?$/i.test(language),
  messages: {},
  timeline: { locale: 'zh-CN', messages: {} },
  vocabulary: { typeName: zh.zhType, strategy: zh.zhStrategy, notSelf: zh.zhNotSelf, signature: zh.zhSignature,
    authorityName: zh.zhAuthority, profileName: zh.zhProfile, definitionName: zh.zhDefinition,
    centerName: zh.zhCenter, gateName: zh.zhGate, channelName: zh.zhChannel,
    circuitName: zh.zhCircuit, planetName: zh.zhPlanet, lineName: zh.zhLine,
    variable: zh.zhVariable, cognition: zh.zhCognition,
    typeDescription: name => zh.TYPE_PLAIN_ZH[name] || '', hexagramName: n => zh.HEXAGRAM_ZH[n] || `第 ${n} 卦`, graphCenter: zh.zhCenter },
  content: null,
  format: {
    sensitivity: value => ({ Type: '类型', Authority: '权威', Profile: '人生角色', Definition: '定义', 'Incarnation Cross': '化身十字', Variable: '四箭头', Moon: '月亮闸门' })[value] || value,
    list: items => items.join('、'),
    separated: (items, kind) => items.join(kind === 'channels' ? '；' : '、'),
    parentheses: value => '（' + value + '）',
    gateTooltip: (name, hexagram) => name + '（' + hexagram + '）',
    channelTooltip: (name, gates) => name + '（' + gates + '）',
    channelDetail: (name, gates) => name + '（' + gates + '）',
    circuitSummary: (name, countLabel) => name + '（' + countLabel + '）',
    lineTag: (line, name) => ' · 第 ' + line + ' 爻（' + name + '）',
    centerAria: (name, status, label) => name + '，' + label,
    channelCenters: (keys, names) => names.join(' ↔ '),
    inlineDate: date => '（' + date + '）',
    originalTerm: name => name,
    separator: kind => kind === 'cognition' ? '·' : ' · ',
    birth: (date, time) => {
      const [y,m,d] = date.split('-').map(Number);
      let out = y + '年' + m + '月' + d + '日';
      if (time) { const [h,min] = time.split(':').map(Number); out += ' · ' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0'); }
      return out;
    }
  }
};
