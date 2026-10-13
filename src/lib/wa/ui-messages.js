import { registerMessages } from '../i18n.js';
const messages={
 'Wa UI add member':['＋ 添加成员','＋ 新增成員','＋ Add members'],
 'Wa UI replace alpha':['更换负责人','更換負責人','Change Alpha'],
 'Wa UI choose alpha':['选择负责人','選擇負責人','Choose Alpha'],
 'Wa UI clear alpha':['清空负责人','清空負責人','Clear Alpha'],
 'Wa UI remove member':['从本组移除 {name}','從本組移除 {name}','Remove {name} from this group'],
 'Wa UI save organization':['保存组织','儲存組織','Save organization'],
 'Wa UI group name':['{group} 名称','{group} 名稱','{group} name'],
 'Wa UI empty group':['还没有成员','尚未加入成員','No members yet'],
 'Wa UI configure':['添加或调整成员','新增或調整成員','Manage people on this page'],
 'Wa UI participants count':['{count} 位成员参与','{count} 位成員參與','{count} participating people'],
 'Wa UI state absent':['暂无成员激活','暫無成員啟動','No active members'],
 'Wa UI state hanging':['暂未形成完整通道','尚未形成完整通道','Channel not yet complete'],
 'Wa UI state selfComplete':['单人形成','單人形成','Complete in one person'],
 'Wa UI state crossMemberOnly':['两端由不同成员激活','兩端由不同成員啟動','Different people activate the two gates'],
 'Wa UI state both':['单人形成 · 多位成员参与','單人形成 · 多位成員參與','Complete in one person · several people participate'],
 'Wa UI state unknown':['等待计算','等待計算','Awaiting calculation'],
 'Wa UI gate active':['有成员激活','有成員啟動','Members activate this gate'],
 'Wa UI gate inactive':['暂无成员激活','暫無成員啟動','No active members'],
 'Wa UI member legend':['成员编号','成員編號','Member numbers'],
 'Wa UI marker rule':['编号对应成员，颜色帮助查找。','編號對應成員，顏色幫助查找。','Numbers identify people; colors help you find them.']
};
for(const [i,locale] of ['zh-CN','zh-Hant','en'].entries())registerMessages(locale,Object.fromEntries(Object.entries(messages).map(([key,value])=>[key,value[i]])));
