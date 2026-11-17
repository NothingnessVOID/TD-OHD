# HANDOFF · feature/member-business-analysis

日期：2026-11-15

## 目标与授权

用户要求毛毛规划“成员的职业类型、商业优势、适合的工作环境及排查步骤”接入网站的方法，并追加“出完方案直接做出来给我看看”。因此本轮交付可操作的分支预览，先完成方案和实现，不停留于静态资料展示。

用户决定现有组织页暂时保持，等待以后确认再改。本轮不调整其六大支柱、旧部门高亮、左九条／右三十二条及缺失闸门折叠。不更新9961、不合并main、不创建PR、不部署正式站点。

## 工作区与基线

- 新模块独立工作区：`TD-OHD/worktrees/member-business-analysis`。
- 分支：`feature/member-business-analysis`。
- 依赖基线：`402b9e68`，即当前已安装9961的组织页面迭代后的交接提交。
- 创建前核对原功能分支工作区干净；fetch得到最新远端main `66c21315`，为该基线祖先。
- 保留原`organization-channels-issue57`工作区及分支，避免混入新模块改动。
- 预留独立loopback预览端口5282（已确认当时空闲）。9961为用户日常版、5281为既有组织页分支预览，均不替换。
- 已用Node24完成npm ci及.NET10引擎构建。

## 协作分工与规则

- 毛毛设计子会话：`sess_0mwh4pr95_3b44a8feb2f5b442b26c`，负责推荐入口、信息层级、使用流程和规则解释边界。仅写外部规划产物，项目代码由新write实施代理落地。
- 主代理负责接口、数据归属和方案裁决，核实关键源码并审核最终实现。
- 个人分析读取选中成员本人的完整出生图，不能把组织汇总激活、当前小组scope或多人成图推断成个人职业类型。
- 复用现有图计算、统一拓扑、教材整合正文、i18n/Skin与详情容器；不复制通用知识正文、不改计算引擎或人物／组织存储契约。
- 工作环境采用符合条件及解释依据，可多种并存，不生成教材没有给出的数值评分或一票排除规则。无明确定义的“多／少／极强”不能擅设阈值。
- 用户不接受“官方版／通俗版／原典定义／资料对照”并排展示；产品正文是一套整合后的说明，来源追溯留维护元数据。
- 初期范围不扩展星体、人生角色、商业象限、生命周期；2026-11-15 用户另行授权星体详情增加商业分类，实施记录见文末。其他候选仍未实施。
- 开发使用隔离上下文与明确虚构示范；不读真实人物数据库或浏览器资料、不自动注入生产数据。

## 来源

用户提供的人类图BG5教材及两场课程已经独立归档于知识库。只读原件与Markdown阅读版，不修改课程资料或`.obsidian`。已有毛毛整合的32条通道正文在基线`src/lib/wa/org-reading-content.*.js`中；其余个人整合网络四条需以同一教材明确条目补齐，避免只展示32条造成个人商业优势遗漏。

## 已采用的一期设计

毛毛方案保存在工作室资料库`TD-OHD/成员商业分析模块设计规划-毛毛-20261115.md`，末尾第13节为主代理裁决。采用组织页内现有详情抽屉：范围栏新增“成员商业分析”入口→全部已分配成员列表→个人帧；现有详情内成员旁增加明确小按钮，成员圆点聚焦语义不变。抽屉读个人图，上一位／下一位替换当前帧、不堆叠历史。

四块为职业类型、信息处理、工作环境与五步依据、商业优势。复用既有32通道正文，加同一教材的4个整合网络条目；三语正文已准备于工作室资料库`TD-OHD/成员商业分析正文-20261115-locales.json`，接入项目内运行，不使用外部绝对路径。

- 所有个人完整通道从校验过的26次个人激活推导，不读chart.channels或组织汇总作为假默认。类型／定义未知时资料不足，不默认generator或single；reflector+none=0合法。
- 四整合网络严格为10-20、10-57、20-34、34-57，10-34为个体通道，不属于这四条。主代理在审查初稿时纠正此项并修回归预期，17项纯规则检查最终通过。
- 工作环境多种并列，不给唯一适合／不适合。整合网络独立执行空间不覆盖其他条件。至少1条完整Penta仅为连接依据，不作为适配分数线；无完整仅展示实际闸门数，不设“少”阈值。
- 21-45／37-40仅对应一般性的公共规则与资源边界协作关注，不以单条推断拉帮结派、排斥或私人领地倾向。
- 成员列表包含全部已分配prepared成员，不按组织scope裁剪；个人范围在页头写清楚。跳组织通道详情的入口明确称“查看组织中的通道”，其组织scope激活不能冒称个人结果。
- `dev/member-business-demo.html`拟提供隔离虚构示范，不自动写入生产人物库，普通组织入口仍可用于用户自行选人。

## 验证与交付

本轮采用预览优先流程，完整回归待用户确认。

### 实现结果

- 新增`src/lib/member-business/`中的个人事实分析、环境依据、三语正文及UI消息；新renderer `src/views/wa-member-business.js`、scoped样式`src/styles/wa-member-business.css`。
- Wa宿主增加范围栏“成员商业分析”、members/member/business-channel详情帧、成员切换及缓存；`wa-detail-content.js`仅由Wa宿主显式注入成员商业分析按钮。
- 新`dev/member-business-demo.html`和JS提供三位虚构成员，真实WASM计算，全部peopleStore/repository为内存实现、storage为no-op，不注入生产库。示范默认简中，支持三语切换；仅dev可用，不进入正式构建。
- 延用共用Detail Dialog、焦点圈定/Escape、Wa返回栈与折叠／滚动恢复、成员标记、Penta与OC16目录、统一回路词汇，32条正文引用既有资料，另补四条整合通道。
- 个人定义源相悖、报告岛数相悖或与个人通道拓扑不符均unavailable；personId显式非法拒绝；环境输入残缺不得被当作空证据。反映者none与0个人完整通道合法。

### 检查与修复

- 43项个人analysis/environment/renderer定向测试全部通过；实施代理另查组织页相关23项通过。未跑全量测试或全Skin矩阵，旧历史审计失败不通过修改快照掩盖。
- 主代理用3组虚构生日调用真实WASM，个人完整通道与引擎返回逐项一致：顾问／二分、快速建造者／一分、经典建造者／一分，均无issue。不写人物库。
- 主代理复核并纠正初稿四整合名单及step5轴与全32目录的混用；独立Explorer复审补齐定义矛盾、身份和残缺输入边界；不弱化断言。
- 初次浏览器示范失败：`document.baseURI`位于`/dev/`导致加载`/dev/engine/_framework/dotnet.js`。保留首次失败记录，主代理在示范HTML设置`base href=/`及绝对module入口后修复，未改引擎加载契约。
- 最终浏览器检查通过：三成员切换类型／定义同步；四块内容、五步默认折叠；组织通道跳转/四整合通道同源阅读及返回；成员上下位不叠栈；scope切换后仍列全部三人；新入口的键盘打开、返回焦点恢复；1440桌面/390手机无横向溢出；简繁英；浅深两套Skin基础显示；pageerror0。
- 隔离示范浏览器检查结束时localStorage keys为空、IndexedDB数据库列表为空；真实用户人物／团队／组织资料未读取或修改。
- Node24/.NET10 `npm run build:pages`及`check:pages-bundle`通过。最后焦点标识修正后再次Vite static构建通过。保留既有字体CSS、动态混合导入和chunk-size提示，未扩范围处理。
- 本机证据：`evidence/member-business-analysis/`，不进Git。覆盖只证明本轮预览级检查，不证明全量回归或生产验收。

### 预览与边界

- 直接可操作示范：`http://127.0.0.1:5282/dev/member-business-demo.html`。
- 普通组织入口：`http://127.0.0.1:5282/?view=wa`。
- 仅loopback，strictPort，主代理启动Vite。9961及原5281组织预览没有更新；旧组织功能分支工作区最终核对仍干净。
- 一期不含个人页挂载、星体、角色、象限、生命周期、评分、自动分组、导出分享或原组织布局改造。
- 尚未验证：完整浏览器回归、全部Skin矩阵、真实人物与用户现有组织验收、性能长期测量。待用户看本模块方向后继续。

提交及远端同步结果见本轮最终交付，分支为`feature/member-business-analysis`，不创建PR、不合main、不更新9961。

## 第二轮：右栏中间成员卡片与公共UI复用

用户认可一期个人内容，要求入口从范围栏移到右栏中间，直接展示成员卡片，点个人才进入详情；同时再次强调必须阅读工程手册、套用全站公共UI与当前页面已有卡片交互。

- 毛毛给出轻量设计，主代理采用：右栏顺序为组织概览→成员商业分析→六部门全通道。外层沿用panel、wa-panel-heading、wa-subheading；中性标题说明全部已分配人数，职业类型人数按固定五类列非零项及资料不足，无评分或组织类型结论。
- 主体按Alpha、draft.pentas原顺序分组，组内marker编号排序；每人显示原成员标记、长名省略与title全名、估时≈、职业类型和信息处理短名。无定义tile用单独三语短名，个人详情保留完整说明。所有已分配成员默认展开，scope切换不裁列表，prev/next与视觉顺序一致。
- 没有已分配成员时不渲染卡片；busy或准备失败保留卡片壳与人数，只显示公共loading／清楚的不可用状态；ready时个别分析缺资料仍列姓名与资料不足。
- 移除范围栏按钮、members列表帧、旧列表renderer/CSS/未使用key；保留详情内明确business按钮及个人分析frame。tile优先响应点击，图表圆点原聚焦含义不变；关闭个人详情回原tile焦点。
- tile直接使用`wa-pillar wa-mb-tile`和`wa-pillar-text`，原边框、圆角、padding、背景、hover、阴影、位移、键盘聚焦与reduced-motion由wa.css提供；专属CSS仅保留信息网格、截断和箭头布局。上下文小按钮改用btn-secondary，不再自建边框背景hover样式。
- 主代理重新阅读ENGINEERING_STANDARDS与组件清单，发现dev示范原来未像main.js那样在feature样式之后载入ui-system.css，导致返回／关闭虽用公共renderDetailNavigation但显示为浏览器默认按钮。本轮显式按同序引入现有ui-system.css，没有复制规则，也没有import完整main触发资料初始化。dev辅助按钮／语言选择器也套btn-secondary／form-group。
- dev示范不再自动弹成员列表；顶部辅助按钮仅滚动到右栏卡片。base href=/、三位虚构人物、真实WASM与内存store/no-opstorage不变，未写人物／组织库。

### 本轮核验

- 主代理浏览器：右栏三张panel顺序正确；没有旧顶栏入口或初始模态；点tile及其marker打开正确人；关闭焦点返回；next按可见顺序；scope变更成员不减少；1440/1100/390无横向溢出；简繁英、深色基本显示正常、pageerror0。
- 公共UI实测：tile与同页pillar在is-hover下box-shadow和border-color计算值一致；close按钮宽高等于公共--ui-icon-size、border-radius50%；嵌套页back按钮使用公共999px圆角。
- 16名隔离合成成员浏览器夹具：Alpha排首、三Penta顺序正确；估时与资料不足各一位、长名title完整、loading/error不输出半成品tiles、390宽无溢出。测试上下文localStorage和IndexedDB最终均为空。
- 实施代理renderer21项及相关67项定向检查通过；主代理补公共按钮复用后renderer＋Wa detail36/36通过，build:pages通过。旧Wa审计4项失败保持原样，不改审计快照或断言；全量回归／全Skin矩阵未执行。
- 一次构建与UI并行引起Vite热重载，截图报告节点已脱离；在构建结束后顺序重跑完整本轮UI检查通过，未修改断言隐藏失败。
- 证据仍在本机evidence/member-business-analysis/，不进Git。9961与旧organization-channels分支均未更新。

## 左栏偏移与正常页面入口修复

用户指出左图顶部空档，浏览器已复现无header的dev入口仍使用56+16=72px吸顶偏移，造成right overview在top28时left停在72。代码提交`ec4dd4f4`按真实header测量高度，缺失/displaynone/height0用0，加16间距；CSS首帧及SVG max-height fallback同步16。不删sticky、不改布局或成员卡片。有header保留实际height+16，1050以下仍static。浏览器验证初始两栏对齐、无header滚动对齐/吸顶16、注入真实header后正确避让、隐藏header后恢复16、390静态及右栏三卡顺序通过。

用户随后明确只看5282正常网站组织页面，不再以dev演示页作为交付入口。后续统一入口`http://127.0.0.1:5282/?view=wa`。

## 用户授权5282引用9961本机人物库

用户要求把9961已有的本机人物直接引用到测试页面。已在2026-11-15完成：

- 构建当前代码desktop模式（Node24/.NET10，build:desktop通过），停止本会话原Vite5282进程，改在同一5282运行当前worktree的`local/server.mjs`，绑定127.0.0.1；9961服务、安装和配置均未改。
- 本机独立预览配置：`TD-OHD/tools/member-business-preview-local.json`，权限600，`dataDir`引用9961实际本地数据目录，`distDir`指向本worktree/dist、port5282；密码策略及其他后端选项沿用原配置。未改CORS/Host校验、未代理重写Origin或关闭权限边界。该配置不入Git、不stage。
- 操作前使用SQLite online backup保存到本机`archive/backups/before-shared-preview-5282-<timestamp>/`并检查完整性ok。备份含实际人物资料，绝不进Git或交付上传。
- API状态计数验证：9961与5282均count17、passwordRequired=false/authenticated=true，服务返回dataPath相同（仅比较布尔、不输出人物内容）。
- 隔离浏览器实际打开5282正常组织页面及Alpha成员选择器，选项数17，未选择/编辑人物，pageerror0。未复制或硬编码个人档案到源码，未注入演示人物。
- 人物现为两端共享的权威本机库，用户在任一页面新增/编辑/删除人物会反映到同一库；团队localStorage与Wa组织IndexedDB仍按浏览器origin分别保存，此次只授权接入人物，未读取/搬运原团队组织记录。
- 当前5282是桌面构建的正常站点，**不再是Vite热更新服务**。后续代码改动先build:desktop更新本worktree/dist即可供当前local服务读取，必要重启只限5282，不重启9961。不要误把旧Vite终端任务当仍在服务。
- 当前预览进程由主代理启动，`OHD_CONFIG=.../tools/member-business-preview-local.json npx --yes --package=node@24 -- node local/server.mjs`。准备脚本在本机tools/prepare-member-business-local-preview.py，不进Git。

## 六大支柱OC16角色名与单通道详情修复

用户明确指出六大支柱不应显示64卦名，要求恢复原OC16闸门角色；点击六大支柱／核心通道应与其他通道一样只显示该通道，不要展开同部门其他通道。

- 组织显示名接口`orgGateName()`改为原OC16 role优先，其次整合Penta role，再统一gateName；原12个部门闸门及既有人事角色使用既有三语消息，不新造词汇、不改全站普通人类图词汇或计算ID。2方向／14大蓄不再被Penta协调／容量覆盖；组织详情角色徽标也使用同一显示名。
- 六支柱仍显示部门标题、原样式／三列／激活状态，subtitle改用orgGateName，点击直接`data-wa-pair=primaryChannelId`，保留分组标识与焦点key。管理是21-45，用户口误24-45未作为新通道。
- 删除mergedDeptCore，所有32通道共用pairSheet；renderDepartment兼容入口也委托其显式primary的同一pairSheet。保留当前scope两端激活、自身完整成员、单通道正文与相关闸门，不再输出部门support通道列表或部门汇总指标。相关部门跳转明确为primary pair，避免重新绕回整部门展开。
- 主代理亲读名称优先级、pairSheet及相关跳转；实施代理定向31/31、member-business相关52/52通过。既有Wa审计4失败及旧部门合并e2e假设未弱化或批量改写，全量回归未运行。
- 主代理desktop构建到artifacts/local-preview-next，通过后保留原fonts/hashed assets，备份SQLite并切换5282当前静态目录；没有重启或替换9961程序、配置和数据库。
- 5282正常组织页面浏览器逐张检查六支柱：21-45控制者／统治者；25-51天真／冲击；2-14方向／大蓄；27-50滋养／价值观；6-59调和／亲密；3-60秩序／限制。每个详情2端点、1通道正文、0其他通道行；普通26-44关联主通道跳转也为单通道。390宽无横向溢出，pageerror0，未打印个人记录。
- 实际served资源index-CBIToAN7.js／index-DVhCtBT4.css与构建hash一致，人物计数前后17。预览提升脚本本机tools/promote-member-business-preview.py，备份位于archive/backups/5282-before-ui-update-<timestamp>/，含真实DB备份，不上传或stage。
- 仍仅交付5282正常组织页，不用dev演示入口；本轮不更新main、不创建PR、不部署正式站点。
- 提交前发现额外未跟踪的`dist 2/`，核对包含更新前index-CrBf8dRj.js等静态构建（创建时间早于本轮）。保留原位、不删除、不入Git；后续不要把它当源码改动或上传。

## 当前内容补齐任务：40闸门商业解读

用户已确认组织页详情混有不同语境，授权毛毛上网参考并补写剩余40个闸门，并要求把详情栏目改为“商业解读”（主代理在其给出的商业解读／OC16解读两种选项中采用前者）。

- 源码审查的正文分布：12个Penta整合闸门、12个旧组织闸门、40个回退普通GATE_DESCRIPTIONS。待补列表为4、9、10、11、12、16、17、18、19、20、22、23、24、28、30、32、34、35、36、37、38、39、40、41、42、43、47、48、49、52、53、54、55、56、57、58、61、62、63、64。
- 毛毛撰稿子会话：sess_0mwgcyck0_34b8ed146b3bb91b8683；允许公开检索与自写商业场景应用，禁止杜撰官方OC16原典或固定职位，来源／场景整理依据留维护记录，产品不呈现多版本对照。
- 栏目简中／繁中／英文确定为商业解读／商業解讀／Business reading，沿用原消息key与注册接口。已完成源码两行更新，45项相关定向检查通过；尚未发布到5282，待40条和三语齐备后一并构建。
- 主代理独立查到BG5官方工具包说明 https://bg5businessinstitute.com/digital-products/133/bg5-career-design-full-analysis-toolkit ，列有“Updated OC16 Spreadsheet including the OC16 Role of each Trait”，但页面未公开逐条role正文。此页只证明存在该资料表，不能据此把本次公开一般闸门含义+商业应用整理冒称为该官方表原词；没有购买、绕付费或修改认证。
- 接入计划：既有32通道及12闸门三语正文保留，新40通过独立内容表并入同一个readOrgGateBody接口，旧OC16角色名称优先不变；三语齐备后移除普通人类图正文的静默回退，缺资料应明确待整理。计算、存储和激活数据不改。
- 毛毛已完成40条中文正文及来源说明（工作室资料库`TD-OHD/组织页40闸门商业解读-毛毛-20261115.json`及同名MD），每条基础含义＋商业协作用法两段，正文约125–165字；记录49来源，其中46公开URL、3本地资料。一般闸门含义与作者商业情境整理在维护元数据中分开，未取得官方OC16 Role逐条表，也不冒称其原词。
- 主代理完整通读40条，逐条核对中心位置／通道ID／部门归属与共享catalog一致，sourceRefs全能解析；独立fetch抽查4/9公开来源及官方工具包框架说明。繁中英文由独立内容实例适配，三语各40条、数字引用一致，简中逐字等于毛毛稿，英文无CJK；项目模块再次逐字段比对最新外部三语文件一致。
- 新增`org-reading-content.gates40.{zh-CN,zh-Hant,en}.js`，在既有org-reading-content.js唯一合并点接入，readOrgGateBody签名不变；原32通道与12Penta闸门模块未改，旧OC16 gateRoles优先不变。来源／editorialBasis等元数据不进入DOM，维护追溯写入`docs/development/ORG_GATE_BUSINESS_CONTENT.md`，不提交原始抓取响应。
- 组织闸门renderer移除GATE_DESCRIPTIONS普通资料静默回退；目录内商业资料真的缺失时只显示商业解读待整理，非目录闸门仍为空。当前每语52条整合商业正文＋12条旧组织正文＝64，0普通回退、0待整理。标题统一商业解读／商業解讀／Business reading。
- 实施代理定向63/63通过；补好.NET PATH后的本地化等检查84/84通过。主代理独立程序检查三语64全部有商业正文、新40与交付稿逐字段相等、原21控制者／45统治者／2方向／14大蓄仍在；未全量回归或改历史审计断言。
- Node24/.NET10 desktop构建到artifacts/local-preview-next通过，经本机promote脚本更新5282静态目录并保留旧hash资源与字体；served JS `index-orlEfqCK.js`／CSS `index-DVhCtBT4.css`与构建hash一致，人物计数前后17，数据库未替换，9961安装未改。
- 主代理5282正常组织页浏览器抽查新门9/34/49/52/64：标题商业解读、两段正文、无通用fallback或来源对照标签；管理21-45通道标题同样商业解读且仍无support整部门展开；390无横向溢出，pageerror0，未输出人物记录。
- 9961程序仍不更新；5282继续使用已授权共享本机人物库。当前全量回归、全Skin矩阵和官方逐角色原典核验未做，不将公开参考＋商业情境写作升格为官方定义。
- 静态提升后另见未跟踪`dist 3/`，核对其入口引用上轮index-CBIToAN7.js，为更新前静态构建；与既有dist 2/一并保留，不删除、不入Git，不视为源码或人物资料。

## 暂用文案记录与可移交审核包

用户指出新写40条可能不够好，要求记录暂用状态、区分来源、附教材原件并整理成可交给其他Agent执行的完整包；后续可能替换。当前以审核交接为优先，不再继续改动网站。

- 完整包位于工作室资料库`TD-OHD/组织商业文案审核交接包-20261115/`，含同名zip约7.8MB、65文件。主代理自检脚本核验两份教材docx原件逐字节一致、图片无缺失、无敏感路径或数据库文件。
- 包结构：00任务书（最简指令）、01来源总表、02教材整合文案（32通道×三语）、03旧组织角色文案（12门实际渲染×三语＋14门字典）、04新写40闸门暂用待审（40条×三语＋作者原稿＋来源依据）、05教材来源（两docx＋Markdown＋配图）、06上下文与替换接口（时间线、不变ID、机器可读三语全文、审核表骨架、替换模板、14个源文件快照）、07后续可扩展建议、manifest。
- 来源区分要点：32通道intro/application整合自BG5教材个人36优势节；11条额外organizationRole来自OC16/Penta混合语境；12Penta闸门明确3–5人语境非OC16原典；原12组织闸门中10个可追到共创文档角色段（轻整理）、26/44直接出处待核；新40条全部标记provisional＋user_not_approved，46条公开参考URL记录在维护文档；官方BG5BI OC16 Role表存在但仅认证学员可购，未取得也不冒称其原词。
- 包内任务书明确要求接收Agent先逐条审核（保留／需修订／缺来源／场景混用），默认只交中文替换稿，翻译与接入另行授权；不编造官方命名、不用普通HD段落冒充商业解读、不改网站。
- 用户叫停开发期间不实施候选。07文件记录五个后续候选：①公众角色（资料结构清楚，优先）、②中心职场观察（需先明确三种中心状态的适用边界）、③星体商业驱动力（十三星体逐项已有，不自动生成星体×64闸门组合断言）、④决策策略（当前仅一段总述，八种权威展开需另补资料）、⑤商业生命周期（暂缓个性化，无现成回归求时接口，凯龙链路未确认）。这些均为建议，不是实施授权。
- 5282未因本任务再改，继续显示当前40条暂用正文。9961程序仍不更新。全量回归、全Skin矩阵、官方逐角色原典核验均未执行。
- 最终包已按来源口径修正并重生成：README／任务书／来源总表统一为“新写40条尚未获得用户定稿确认，其他类别待本次来源审核，不预设已确认或已否定”；12 Penta门来源改为“十二闸门表＋先下层再上层能量流动段”，格式化能量归组织九轴；logic在共创文档为保存部门50-27、BG5六部门表为Logic 27-50，两文档写法不同但站点ID不变；E类末级明确为普通闸门名称gateName而非hexagramName；证据性质枚举增加“内部教材／课程资料”与“作者商业场景推写”；审核表流程改为先复制骨架到90_审核产物再填。
- 最终自检：65文件／8,857,408字节；zip 7,829,889字节；解压后逐文件SHA-256与大小全部匹配；两份docx与知识库原件字节一致；本地图片链接全部可解析；manifest自身两条不参与哈希。审核包交接最终提交为`9f2f48e5`，已核对 GitHub 同名功能分支一致；当时工作区仅余已知dist 2/、dist 3/旧静态构建副本。

## 新增授权：星体详情人类图／商业分类（2026-11-15）

用户在审核包交付后明确授权星体商业说明接入，要求参照出生图闸门弹窗的现有分类切换，一个分类保留原星体含义，另一个分类展示教材商业含义，允许整理重复前缀与展示语气。此前“暂不继续网站开发”的限制仅针对上一阶段，不能据此阻断本次明确授权。基线为`9f2f48e5`，继续当前功能分支，不合并 main 或部署。

- 抽取`reading-lenses.js`作为按钮 HTML 的共用基础；闸门仍保持原四项顺序、属性别名、active／aria-pressed及`.gate-lens-switch`结构。星体只显示人类图／商业两个原生按钮，沿用`.lens-switch`、Skin Token和40px触控高度。
- 新增`planet-business-content.{js,json}`、`planet-reading-perspectives.js`和界面消息。13个稳定星体ID×简中／繁中／英文均有theme与body；南交点仍是过往环境，北交点仍是未来环境。商业主题与正文取自BG5教材319–333行，外部冻结稿在工作室资料库`TD-OHD/教材十三星体商业解读-20261115-locales.json`，项目运行时逐字段与其locales相同。
- 原`planet-reference.js`逐字未改，原HD摘要、正文和getter保留。教材原句与编辑依据记录在`docs/development/PLANET_BUSINESS_CONTENT.md`，不进入产品DOM。没有新增星体×闸门组合解读、权重、风险评分或盈利保证；没有改旧40门文案及审核状态，也未覆盖已交付的旧审核包。
- chart弹窗与reference资料库共用同一renderer/controller；出生图、行运、时间线自然复用chart宿主。星体分类存在当前详情帧的`planetLens`，独立于闸门的`currentLens`；切换仅替换正文和按钮状态，不重建activation DOM、不push历史。星体→闸门→返回保留商业，关闭重开默认人类图；语言和context刷新携带当前帧。资料库另存当前星体的阅读分类。
- 主代理复核共享renderer、事件委托、两宿主及历史流转；删除只断言源代码写法的新增测试，保留实际输出与数据契约。Node24执行`node --test tests/planet-perspectives.test.js tests/shared-object-details.test.js tests/reference-catalog.test.js`，14/14通过。
- 实施代理前序较宽定向批次曾63/64通过；唯一`issue-details-scope`历史source-path pin在基线也复现失败，未改审计快照或弱化断言。该批次是历史诊断记录，当前验收依据为上述14项、必要构建及下列新功能浏览器验证，未声称全量通过。
- Node24／.NET10完成desktop构建至`artifacts/local-preview-next`。发现5282原服务已停止，核对端口无人监听后用原OHD_CONFIG恢复同一local/server.mjs，再运行promote脚本提升构建。当前served JS为`index-BKURDz4J.js`、CSS为`index-YznQmN-V.css`，资源hash核对通过；人物数量更新前后均17，DB未替换，9961安装未改。保留旧hash资源供已打开页面使用。
- 在正常5282网站运行`/tmp/planet-business-normal-site-check.mjs`：1224桌面人格／设计太阳、行运和时间线太阳、资料库、三语、明暗主题、390手机通过。验证商业切换前后激活闸门、颜色／音调／基调DOM及内容不变，Planet→Gate→Back保留商业，Escape后重开HD，闸门四分类不受影响，焦点留在切换按钮。手机无横向溢出，sheet不超视口；当前短正文无需实际滚动，只检查了既有overflow-y:auto。
- 测试用独立browser context、虚构未保存分享图；导航前拦截人物status／sync为空库，sync operations均空，未读取真实人物或向后端写入fixture。截图位于项目外`evidence/planet-business/`，主代理亲自查看简中桌面、手机、暗色截图。首轮脚本自身library选择器错误的证据另标`harness-bug-*`，修正选择器后完整定向流程通过，非功能缺陷。
- 全Skin矩阵、长文本／极端窗口、完整浏览器回归及综合测试仍待用户确认本次方向后执行。未引入公开端口转发、未改防火墙或平台设置，未创建PR、合并main或更新正式站点。

## 增量：出生图星体详情合并双激活 + 栏目改名 OC16（2026-11-15）

用户在同一功能分支提出两项明确要求：点出生图 Design 或 Personality 任一星体，打开同一个星体详情，同时列出该星体两侧真实激活并各自可跳闸门，不再分成两种星体弹窗；星体分类第二按钮三语统一显示「OC16」，原有人类图文字与商业正文不改。

- 顶部标签不再显示单侧：出生帧只写 `Planetary Activations`；真正 transit 星体仍是 `Transit · Planetary Activations`，且只保留该时刻一条临时激活，不合并本命双列。行运／时间线的出生叠加点沿用同一双激活详情。
- 新增纯渲染层 `src/lib/planet-activation-sections.js`：`planetActivationEntries({source, planet, activation, chart, transitGates})` 与 `renderPlanetActivationSections(entries)`。设计在前、人格在后，各侧只读 `chart.gates.design[planet]` / `.personality[planet]`，单侧缺失不补齐、不伪造；复用既有 `.planet-activation`／`.transit-detail-link.planet-detail-gate`／`.planet-detail-substructure` 版式，没有新 CSS、新 tab 或第二套弹窗。手机两段 section 自然纵向排列、沿用既有 sheet 滚动。
- 每个按钮 `data-planet-gate` + `data-planet-source="design"|"personality"|"transit"`，分别调用 `showGateDetail(gate,true,{side,planet,line})`；同一闸门（同 gate 同 line）在两侧出现时仍保留两条不同源记录，激活块不去重。`aria-label` 为「来源标签 · gateLine」，读屏可区分两条同名闸门；可见 section 标签仍只用现成 `Design`／`Personality`（transit 仍 `Current activation`）。
- `showPlanetDetail` 接口仍接 design／personality／transit，点击来源只作详情帧兼容身份（`source`）并新增 `activationScope:'birth'|'transit'`；可见激活条数只由 `source !== 'transit'` 决定，不看 `detailContext` 是否存在。Planet→任一 Gate→Back 恢复双入口与 `planetLens`；语言刷新与行运 context 刷新同理。图 pin 用既有的多闸门选择 `setPinned({kind:'gates', gates:[...去重]})`，不偏向任一来源；transit 仍单闸门 pin；关闭走 `resetDetail` 的 `setPinned(null)`。未改 `bodygraph.js`。
- 栏目命名：`src/lib/planet-reading-perspectives-messages.js` 三语第二按钮均为 `OC16`，待整理提示为「OC16 解读待整理／OC16 解讀待整理／OC16 reading pending」。内部 lens key 仍是 `business`，`planet-business-content` 正文、`planet-reference.js` 原 HD 文字、组织页商业解读与成员商业模块全部未改；`OC16` 仅为本次用户指定的栏目名称，正文来源仍是 BG5 教材星体商业节，不冒称官方 OC16 原典，产品未加来源或免责声明。
- 测试：新增 `tests/planet-activation-sections.test.js`（6 项：双来源顺序各自取值、同闸门两行、单侧缺失不补齐、transit 单条、未知入参、三语 section 标签），`tests/planet-perspectives.test.js` 标签期望改 OC16；`tests/planet-detail-e2e.mjs` 最小适配双来源（每个 section 3 项 substructure、逐来源点进闸门再 Back、transit 单段）。受双按钮影响的既有浏览器脚本只做选择器精确化：`appearance-skin-e2e`／`knowledge-polish-e2e` 指定 `data-planet-source="design"`，`issue22-23-details-e2e` 指定 `personality`（保持其原断言），`transit-window-reuse-e2e` 按 `data-planet-gate` 精确点对应段，`reference-e2e`／`reference-v1-acceptance-e2e` 按原图被点击记录的 gate 精确选取，避免默认首条设计激活偏离原测试目标。`knowledge-polish-e2e` 另有一处星体 `.detail-label` 断言原期待单侧词（设计／人格），现按新契约改为：顶层标签为该语种的行星激活，两侧 section 标签逐项等于该语种的设计／人格，断言强度未降。最终可复用选择器：`#gate-detail [data-planet-gate][data-planet-source="design|personality"]`；可见段 `[data-planet-activation][data-planet-source]`，段标签 `.planet-activation-label`。
- 实施实例前序定向验证（使用其默认 Node v26／默认 PATH，非最终环境）：`node --test tests/planet-activation-sections.test.js tests/planet-perspectives.test.js` 13/13 通过；`i18n`、`shared-object-details`、`reference-catalog`、`object-detail-heading`、`chart-contract-boundary` 合批 46 项中 44 通过，2 项失败均为 `spawn dotnet ENOENT`（该实例默认 PATH 未包含现有 .NET SDK，并非机器没有安装）。`knowledge-round2b`／`knowledge-round2e` 的历史字节 pin 在本轮之前就已在 HEAD 失配（已用 `git show` 对基线逐函数核对：round2b 仅 `showPlanetDetail` 失配，round2e 五个 chart 函数全部失配），本轮不改审计基线。另核对：`channel-status-scope`／`connection-scope-boundary`／`issue-details-scope`／`paired-card-final-scope`／`paired-card-header-scope`／`paired-card-layout-scope`／`paired-gate-visual-scope` 合批 47 项，在本轮改动后为 29 通过／18 失败；用临时 detached HEAD 工作树跑同一批也是 29 通过／18 失败，且 18 个失败用例名逐条相同，均为既有历史字节 pin，本增量未新增失败。未跑全量测试与浏览器回归。
- 主代理使用 Node24 复跑双激活、星体阅读、共享资料、资料目录及共享标题5个定向测试文件，23/23通过；使用现有.NET10 SDK完成desktop构建，提升到正常5282，served JS为`index-D6jk8N8X.js`、CSS为`index-YznQmN-V.css`。更新前后人物均17，DB未替换，9961未改。旧`dist 2/`、`dist 3/`及新发现`dist 4/`均为此前构建副本，`dist 4/index.html`指向上一轮`index-BKURDz4J.js`，保留不删、不入Git。
- 正常5282隔离浏览器定向验证已通过：从设计或人格太阳打开得到相同双激活内容；各gate/line/color/tone/base与原图各自来源列一致；两条入口分别进入正确来源闸门，Back保留双入口和OC16；OC16切换前后两个activation DOM不变；真实transit仍单条、本命叠加仍双条；资料库显示OC16。390手机实际滚动185px后人格入口完整可点，返回/关闭正常，无横向溢出；pageerrors=0。测试用明确虚构未保存分享图，status/sync提前拦截为空库，nonemptyoperations=0，未读写真实人物。证据位于项目外`evidence/planet-dual-activation/`，主代理查看桌面及手机截图。
- 2026-11-17继续收尾：工作区与已验源码状态一致，5282仍在线且人物数量17。修正reference两个浏览器脚本中的默认首按钮选择，改为定位原目标gate；语法检查与diff检查通过。该调整只涉及测试适配，未改变已构建的产品源码。完整浏览器回归和全部Skin矩阵仍未执行；本轮继续提交到现有功能分支，不合并main、不更新正式站点。
