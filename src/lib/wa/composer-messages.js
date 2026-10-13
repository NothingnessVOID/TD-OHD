import { registerMessages } from '../i18n.js';

// Namespaced to keep the main Wa page's copy independently owned.
const messages = {
  'Wa composer title': ['编辑组织成员', '編輯組織成員', 'Edit organization members'],
  'Wa composer organization': ['组织名称', '組織名稱', 'Organization name'],
  'Wa composer group name': ['小组名称', '小組名稱', 'Group name'],
  'Wa composer select': ['选择', '選擇', 'Select'],
  'Wa composer import': ['从已保存 Penta 导入', '從已儲存 Penta 匯入', 'Import saved Penta'],
  'Wa composer apply': ['应用到草稿', '套用至草稿', 'Apply to draft'],
  'Wa composer cancel': ['取消', '取消', 'Cancel'],
  'Wa composer close': ['关闭', '關閉', 'Close'],
  'Wa composer confirm': ['确认选择', '確認選擇', 'Confirm selection'],
  'Wa composer empty': ['尚未选择', '尚未選擇', 'No people selected'],
  'Wa composer alpha hint': ['可不选 Alpha，最多 1 人。', '可不選 Alpha，最多 1 人。', 'Alpha is optional; select up to one person.'],
  'Wa composer group hint': ['每组最多 5 人；0、1、2 人也可保留为草稿。', '每組最多 5 人；0、1、2 人也可保留為草稿。', 'Up to five people per group; drafts may contain zero, one or two.'],
  'Wa composer draft hint': ['选择与导入只修改此处草稿，取消会保留原配置。移除成员不会删除其出生资料。', '選擇與匯入只修改此處草稿，取消會保留原配置。移除成員不會刪除其出生資料。', 'Selections and imports stay in this draft until applied. Cancel keeps the original configuration. Removing a member keeps their birth record.'],
  'Wa composer origin': ['当前来源：{origin}。已保存团队按网站来源隔离，不会自动跨站同步。', '目前來源：{origin}。已儲存團隊依網站來源隔離，不會自動跨站同步。', 'Current origin: {origin}. Saved teams are origin-specific and do not automatically sync between sites.'],
  'Wa composer search': ['搜索姓名、日期或人物 ID', '搜尋姓名、日期或人物 ID', 'Search name, date or person ID'],
  'Wa composer count': ['已选 {count} / {max}', '已選 {count} / {max}', 'Selected {count} / {max}'],
  'Wa composer remove': ['取消选择 {name}', '取消選擇 {name}', 'Deselect {name}'],
  'Wa composer edit': ['编辑人物', '編輯人物', 'Edit person'],
  'Wa composer create': ['新建人物', '新增人物', 'Create person'],
  'Wa composer person hint': ['人物编辑器会保存人物资料；返回后继续此处选择，不会保存整个 Wa。', '人物編輯器會儲存人物資料；返回後繼續此處選擇，不會儲存整個 Wa。', 'The person editor saves the person record. Return here to continue selecting; it does not save the Wa.'],
  'Wa composer no results': ['没有匹配的人物。', '沒有符合的人物。', 'No matching people.'],
  'Wa composer missing': ['人物引用暂不可用', '人物引用暫不可用', 'Person reference unavailable'],
  'Wa composer assigned': ['已在 {target}', '已在 {target}', 'Assigned to {target}'],
  'Wa composer conflict': ['{name} 已在 {targets}。请先在原位置取消选择，再添加到目标位置。', '{name} 已在 {targets}。請先在原位置取消選擇，再新增至目標位置。', '{name} is assigned to {targets}. Deselect them there before adding them to this target.'],
  'Wa composer limit': ['每组最多 5 人；Alpha 最多 1 人。', '每組最多 5 人；Alpha 最多 1 人。', 'A group allows up to five people; Alpha allows one.'],
  'Wa composer duplicate': ['导入包含重复人物，未修改草稿。', '匯入包含重複人物，未修改草稿。', 'The import contains duplicate people. The draft was not changed.'],
  'Wa composer changed': ['原配置已变化，请关闭后重新打开编辑器。此处草稿未提交。', '原配置已變更，請關閉後重新開啟編輯器。此處草稿尚未提交。', 'The original configuration changed. Close and reopen the editor. This draft was not committed.'],
  'Wa composer failed': ['操作未完成，草稿已保留。', '操作尚未完成，草稿已保留。', 'The operation did not complete. Your draft is retained.'],
  'Wa composer no teams': ['当前来源没有已保存的小组。请取消返回，在 Team / Penta 页面保存小组后再来导入。', '目前來源沒有已儲存的小組。請取消返回，在 Team / Penta 頁面儲存小組後再來匯入。', 'No saved groups at this origin. Cancel and return to Team / Penta to save a group, then import it here.'],
  'Wa composer import hint': ['导入一次性复制人物引用，替换目标组选择。保留本组名称，不复制出生资料，也不建立团队同步。', '匯入一次性複製人物引用，取代目標組選擇。保留本組名稱，不複製出生資料，也不建立團隊同步。', 'Import replaces this group’s selection with a one-time copy of person references. It keeps the target name and does not copy birth data or link team updates.'],
  'Wa composer import count': ['{count} 人', '{count} 人', '{count} people'],
  'Wa composer unnamed team': ['未命名团队', '未命名團隊', 'Untitled team'],
  'Wa composer unnamed group': ['未命名小组', '未命名小組', 'Untitled group'],
  'Wa composer cleanup title': ['确认人工引用变更', '確認人工引用變更', 'Review annotation changes'],
  'Wa composer cleanup hint': ['以下人工引用将从新草稿中移除。完整原配置与每次变更前的快照会随提交交付给页面保留历史。取消则保持当前配置。', '以下人工引用將從新草稿中移除。完整原配置與每次變更前的快照會隨提交交付給頁面保留歷史。取消則保持目前配置。', 'The listed references will be removed from the new draft. The full original configuration and snapshots before each change accompany the commit for history retention. Cancel keeps the current configuration.'],
  'Wa composer cleanup confirm': ['保留历史并继续', '保留歷史並繼續', 'Retain history and continue'],
  'Wa composer edge': ['人工联系', '人工聯繫', 'Manual link'],
  'Wa composer ally': ['关键盟友', '關鍵盟友', 'Key ally'],
  'Wa composer metadata': ['人工注释', '人工註記', 'Manual annotation'],
  'Wa composer area': ['小组业务记录', '小組業務紀錄', 'Group business record']
};
for (const [index, locale] of ['zh-CN', 'zh-Hant', 'en'].entries()) {
  registerMessages(locale, Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[index]])));
}
