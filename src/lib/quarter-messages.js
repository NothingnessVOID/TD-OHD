// Quarter UI labels only. Reading copy lives in quarter-content.js.
import { registerMessages } from './i18n.js';

const messages = {
  Quarter: ['象限', '象限', 'Quarter'],
  'Quarter lens hd': ['人类图', '人類圖', 'Human Design'],
  'Quarter lens business': ['OC16', 'OC16', 'OC16'],
  'Quarter lens love': ['爱情', '愛情', 'Love'],
  'Quarter purpose': ['主要目的主题', '主要目的主題', 'Primary purpose theme'],
  'Quarter gates': ['本象限的 16 个闸门', '本象限的 16 個閘門', 'The 16 gates of this quarter'],
  'Quarter personal basis': ['个人太阳闸门 {gate}.{line}', '個人太陽閘門 {gate}.{line}', 'Personal Sun gate {gate}.{line}'],
  'Quarter estimated': ['≈ 出生时间按估算', '≈ 出生時間按估算', '≈ estimated birth time'],
  'Quarter member theme title': ['终生主题象限', '終生主題象限', 'Life theme quarter'],
  'Quarter member insufficient': ['资料不足：本图没有可用的太阳闸门', '資料不足：本圖沒有可用的太陽閘門', 'Not enough data: this chart has no usable Sun gate'],
  'Quarter members entry': ['全组织成员象限', '全組織成員象限', 'All-member quarters'],
  'Quarter members title': ['全组织成员象限', '全組織成員象限', 'All-member quarters'],
  'Quarter members note': ['按成员个人象限分组', '按成員個人象限分組', "Grouped by each member's personal quarter"],
  'Quarter members empty': ['暂无成员', '暫無成員', 'No members yet'],
  'Quarter members insufficient group': ['资料不足', '資料不足', 'Not enough data'],
  'Reference quarters': ['象限', '象限', 'Quarters'],
  'Quarter member gate scope': ['只读该成员自己的个人激活', '只讀該成員自己的個人激活', "Reads only this member's own activations"],
  'Quarter public label': ['公共知识', '公共知識', 'General knowledge']
};

for (const [index, locale] of ['zh-CN', 'zh-Hant', 'en'].entries()) {
  registerMessages(locale, Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value[index]])));
}
