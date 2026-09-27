import { registerMessages } from './i18n.js';

// New workspace text lives here; existing locale resources remain authoritative
// for the original app. Every key has one owner and English is the source key.
registerMessages('zh-CN', {
  'Birth data is missing.': '缺少出生资料。',
  'Enter a valid birth date.': '请输入有效的出生日期。',
  'Enter a birth time or mark it unknown.': '请输入出生时间，或勾选“不知道出生时间”。',
  'Enter a valid birth time.': '请输入有效的出生时间。',
  'Confirm the birth minute before discarding seconds.': '出生时间含有秒数，请确认要使用的分钟后再继续。',
  'Enter a valid birth UTC offset.': '请输入有效的出生时 UTC 时差。',
  'Enter valid birth coordinates.': '请输入有效的出生地坐标。',
  'Enter a valid IANA time zone.': '请输入有效的 IANA 时区标识。',
  'This shared link contains invalid birth data. Correct the link or enter the details below.': '分享链接的出生资料无效。请修正链接，或在下方重新输入。',
  'A saved chart contains invalid birth data. Re-enter its birth details before calculating.': '已保存的图包含无效出生资料。请重新输入出生资料后再计算。'
  ,'A selected team member is unavailable.': '所选团队成员的资料已不可用。'
  ,'Complete every entered team member.': '请补全每位已输入成员的资料。'
  ,'Choose no more than nine team members.': '团队最多选择 9 人。'
  ,'Team analysis could not be calculated.': '团队分析无法计算。'
  ,'Group dynamics from combined birth charts': '出生图叠合的团队动态'
  ,'This is a chart overlay and role summary, not a specialist Penta or Wa bodygraph.': '此处提供个人图叠合与角色摘要，尚非专业的 Penta 或 Wa 图。'
  ,'Share chart': '分享图表'
  ,'This link contains the following birth details:': '此链接包含以下出生资料：'
  ,'Anonymous link: omit name and place': '匿名链接：省略姓名与地点'
  ,'The date, time and UTC offset remain in the link so the chart can be recalculated.': '为重新计算图表，链接仍会保留日期、时间与 UTC 时差。'
  ,'birthDate': '出生日期', 'birthTime': '出生时间', 'timeUnknown': '时间未知',
  'timezone': 'UTC 时差', 'name': '姓名', 'place': '地点', 'coordinates': '坐标', 'iana': '时区'
  ,'At 15 minutes before and after the entered time, the seven checked chart factors match. This does not verify other details or times between those points.': '在输入时间的前后各 15 分钟，已检查的七项图表因素一致。其他细节及这两个时间点之间的变化未经过验证。'
  ,'One or both times 15 minutes from the entered birth time change these checked factors: {detail}. Other chart details and times between the checked points were not tested.': '输入时间前后 15 分钟的一个或两个时间点，以下已检查因素发生变化：{detail}。其他图表细节及这两个时间点之间的变化未经过验证。'
});
registerMessages('zh-Hant', {
  'Birth data is missing.': '缺少出生資料。',
  'Enter a valid birth date.': '請輸入有效的出生日期。',
  'Enter a birth time or mark it unknown.': '請輸入出生時間，或勾選「不知道出生時間」。',
  'Enter a valid birth time.': '請輸入有效的出生時間。',
  'Confirm the birth minute before discarding seconds.': '出生時間含有秒數，請確認要使用的分鐘後再繼續。',
  'Enter a valid birth UTC offset.': '請輸入有效的出生時 UTC 時差。',
  'Enter valid birth coordinates.': '請輸入有效的出生地座標。',
  'Enter a valid IANA time zone.': '請輸入有效的 IANA 時區識別碼。',
  'This shared link contains invalid birth data. Correct the link or enter the details below.': '分享連結的出生資料無效。請修正連結，或在下方重新輸入。',
  'A saved chart contains invalid birth data. Re-enter its birth details before calculating.': '已儲存的圖包含無效出生資料。請重新輸入出生資料後再計算。'
  ,'A selected team member is unavailable.': '所選團隊成員的資料已不可用。'
  ,'Complete every entered team member.': '請補全每位已輸入成員的資料。'
  ,'Choose no more than nine team members.': '團隊最多選擇 9 人。'
  ,'Team analysis could not be calculated.': '團隊分析無法計算。'
  ,'Group dynamics from combined birth charts': '出生圖疊合的團隊動態'
  ,'This is a chart overlay and role summary, not a specialist Penta or Wa bodygraph.': '此處提供個人圖疊合與角色摘要，尚非專業的 Penta 或 Wa 圖。'
  ,'Share chart': '分享圖表'
  ,'This link contains the following birth details:': '此連結包含以下出生資料：'
  ,'Anonymous link: omit name and place': '匿名連結：省略姓名與地點'
  ,'The date, time and UTC offset remain in the link so the chart can be recalculated.': '為重新計算圖表，連結仍會保留日期、時間與 UTC 時差。'
  ,'birthDate': '出生日期', 'birthTime': '出生時間', 'timeUnknown': '時間未知',
  'timezone': 'UTC 時差', 'name': '姓名', 'place': '地點', 'coordinates': '座標', 'iana': '時區'
  ,'At 15 minutes before and after the entered time, the seven checked chart factors match. This does not verify other details or times between those points.': '在輸入時間的前後各 15 分鐘，已檢查的七項圖表因素一致。其他細節及這兩個時間點之間的變化未經驗證。'
  ,'One or both times 15 minutes from the entered birth time change these checked factors: {detail}. Other chart details and times between the checked points were not tested.': '輸入時間前後 15 分鐘的一個或兩個時間點，以下已檢查因素發生變化：{detail}。其他圖表細節及這兩個時間點之間的變化未經驗證。'
});

registerMessages('en', {
  'concept:activation': 'Activation', 'concept:type': 'Type', 'concept:strategy': 'Strategy',
  'concept:authority': 'Authority', 'concept:profile': 'Profile', 'concept:definition': 'Definition',
  'concept:transit': 'Transit', 'concept:penta': 'Team synthesis',
  'kind:all': 'All', 'kind:center': 'Centers', 'kind:channel': 'Channels', 'kind:gate': 'Gates',
  'kind:line': 'Lines', 'kind:circuit-group': 'Circuit groups', 'kind:circuit': 'Circuits',
  'kind:network': 'Integration network', 'kind:concept': 'Concepts'
});
registerMessages('zh-CN', {
  'Knowledge Library': '资料库', 'Browse the full reference, including inactive entries.': '浏览完整资料，包含未激活的条目。',
  'Search by number, name or alias': '按编号、名称或别名搜索', 'Search the library': '搜索资料库',
  '{count} entries': '{count} 条资料', 'Explore the knowledge library': '探索资料库',
  'Show more': '显示更多',
  'Choose a center, channel, gate, line or circuit. No birth chart is required.': '选择能量中心、通道、闸门、爻线或回路，无需先输入出生资料。',
  'No matching entry.': '没有找到匹配条目。', 'All six lines': '六条爻线',
  'Center': '能量中心',
  'Open in Knowledge Library': '在资料库中查看',
  'Connected channels': '相连的通道', 'Source and terminology': '出处与术语',
  'Source code': '源码',
  'Upstream synthesized reading': '上游综合解读', 'not an original Ra Uru Hu text': '并非 Ra Uru Hu 原典',
  'No reading in the current source.': '当前资料来源没有这条解读。',
  'A complete channel joins both gates; this entry is available whether or not it is active in a chart.': '通道由两端闸门共同组成。即使图中没有激活，也可阅读本条资料。',
  'Circuit group': '回路组', 'Circuit': '回路', 'Integration network': '整合路径',
  'Circuitry groups channels by their structural paths and themes.': '回路依通道的结构路径与主题分组。',
  'concept:activation': '激活', 'concept:type': '能量类型', 'concept:strategy': '策略',
  'concept:authority': '内在权威', 'concept:profile': '人生角色', 'concept:definition': '定义',
  'concept:transit': '行运', 'concept:penta': '团队叠图',
  'kind:all': '全部', 'kind:center': '能量中心', 'kind:channel': '通道', 'kind:gate': '闸门',
  'kind:line': '爻线', 'kind:circuit-group': '回路组', 'kind:circuit': '回路', 'kind:network': '整合路径', 'kind:concept': '基础概念',
  'A gate activated by a planet in a birth chart or transit.': '行星在本命图或行运中落入某个闸门，该闸门便被激活。',
  'A chart category derived from the pattern of defined centers and channels.': '根据已定义能量中心与通道的结构归纳出的图表类型。',
  'The approach to decisions associated with a type.': '与能量类型相联系的行动和决策方式。',
  'The decision process associated with defined centers.': '与已定义能量中心有关的决策过程。',
  'The pairing of personality and design Sun/Earth line numbers.': '人格与设计太阳／地球爻线编号的组合。',
  'The connected regions formed by completed channels.': '完整通道连接能量中心后形成的连通区域。',
  'A celestial body crossing a gate, line or finer division at a specific time.': '天体在特定时刻经过闸门、爻线或更细分区的过程。',
  'The upstream team view combines individual charts; it does not calculate the specialist Penta bodygraph.': '当前团队页面把个人图的数据叠合分析，尚未计算专业 Penta 图。'
});
registerMessages('zh-Hant', {
  'Knowledge Library': '資料庫', 'Browse the full reference, including inactive entries.': '瀏覽完整資料，包含未啟動的條目。',
  'Search by number, name or alias': '按編號、名稱或別名搜尋', 'Search the library': '搜尋資料庫',
  '{count} entries': '{count} 筆資料', 'Explore the knowledge library': '探索資料庫',
  'Show more': '顯示更多',
  'Choose a center, channel, gate, line or circuit. No birth chart is required.': '選擇能量中心、通道、閘門、爻線或迴路，無須先輸入出生資料。',
  'No matching entry.': '找不到符合的條目。', 'All six lines': '六條爻線',
  'Center': '能量中心',
  'Open in Knowledge Library': '在資料庫中查看',
  'Connected channels': '相連的通道', 'Source and terminology': '出處與術語',
  'Source code': '原始碼',
  'Upstream synthesized reading': '上游綜合解讀', 'not an original Ra Uru Hu text': '並非 Ra Uru Hu 原典',
  'No reading in the current source.': '目前資料來源沒有這條解讀。',
  'A complete channel joins both gates; this entry is available whether or not it is active in a chart.': '通道由兩端閘門共同組成。即使圖中沒有啟動，也可閱讀本條資料。',
  'Circuit group': '迴路組', 'Circuit': '迴路', 'Integration network': '整合路徑',
  'Circuitry groups channels by their structural paths and themes.': '迴路依通道的結構路徑與主題分組。',
  'concept:activation': '啟動', 'concept:type': '能量類型', 'concept:strategy': '策略',
  'concept:authority': '內在權威', 'concept:profile': '人生角色', 'concept:definition': '定義',
  'concept:transit': '行運', 'concept:penta': '團隊疊圖',
  'kind:all': '全部', 'kind:center': '能量中心', 'kind:channel': '通道', 'kind:gate': '閘門',
  'kind:line': '爻線', 'kind:circuit-group': '迴路組', 'kind:circuit': '迴路', 'kind:network': '整合路徑', 'kind:concept': '基礎概念',
  'A gate activated by a planet in a birth chart or transit.': '行星在本命圖或行運中落入某個閘門，該閘門便被啟動。',
  'A chart category derived from the pattern of defined centers and channels.': '根據已定義能量中心與通道的結構歸納出的圖表類型。',
  'The approach to decisions associated with a type.': '與能量類型相連的行動和決策方式。',
  'The decision process associated with defined centers.': '與已定義能量中心有關的決策過程。',
  'The pairing of personality and design Sun/Earth line numbers.': '人格與設計太陽／地球爻線編號的組合。',
  'The connected regions formed by completed channels.': '完整通道連接能量中心後形成的連通區域。',
  'A celestial body crossing a gate, line or finer division at a specific time.': '天體在特定時刻經過閘門、爻線或更細分區的過程。',
  'The upstream team view combines individual charts; it does not calculate the specialist Penta bodygraph.': '目前團隊頁面把個人圖的資料疊合分析，尚未計算專業 Penta 圖。'
});
