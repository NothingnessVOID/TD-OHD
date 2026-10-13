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
 'Wa UI configure':['添加或调整成员','新增或調整成員','Manage people on this page']
};
for(const [i,locale] of ['zh-CN','zh-Hant','en'].entries())registerMessages(locale,Object.fromEntries(Object.entries(messages).map(([key,value])=>[key,value[i]])));
