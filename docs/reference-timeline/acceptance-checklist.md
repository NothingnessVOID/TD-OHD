# TD-OHD V1 验收逐项记录

资料包原始 `02_ACCEPTANCE_CHECKLIST.md` 保持在 ZIP 中；本表逐项记录本分支当前证据。`未执行` 表示该项要求尚无足够覆盖，不以邻近测试推断通过。全部人物样本为合成数据；手机为 Chrome 视口模拟。

分支基线 `14ae78a8a3c086138812f7c9879acbd68c54cf86`，工作区 `feature/reference-timeline-v1`。验收命令与截图详见各阶段报告。

| 项目 | 状态 | 清单要求 | 证据或待核 |
|---|---|---|---|
| A01 | 通过 | 确认新分支从固定基线建立，记录完整SHA；原 `main` 与实验分支均未修改。 | stage-0.md；git log / git status；baseline 截图 |
| A02 | 通过 | 本地未提交/未跟踪文件得到保护；没有强制重置、清理、强推、生产迁移。 | stage-0.md；git log / git status；baseline 截图 |
| A03 | 通过 | 原版至少在一个可用环境运行，保存原弹窗、行运、时间轴和手机布局基线。 | stage-0.md；git log / git status；baseline 截图 |
| A04 | 通过 | 实验分支按功能摘取；观察、关注、A/B、跟随固定等不是单纯隐藏菜单后仍整套装入。 | stage-0.md；git log / git status；baseline 截图 |
| A05 | 通过 | 原有人物保存、账户/本地功能不因去掉观察模块而丢失。 | stage-0.md；git log / git status；baseline 截图 |
| A06 | 通过 | 每阶段有独立可解释提交、验证结果与回退指引；未部署生产。 | stage-0.md；git log / git status；baseline 截图 |
| B01 | 通过 | 使用同一条目测试：弹窗与资料库核心名称、文字、关系、六爻内容一致，动态状态允许不同。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B02 | 通过 | 默认风格与原版弹窗一致，没有批量换成新解释或教程。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B03 | 通过 | 原版已存在的多体系资料切换不丢失；当前选择在刷新/返回时行为一致。 | tests/reference-e2e.mjs：弹窗 HD/易经/Gene Keys 切换与内部返回，资料库路由返回保持当前选择；刷新恢复默认 HD |
| B04 | 通过 | 无出生盘可打开资料库；9中心、36通道、64闸门可查，不依赖当前激活。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B05 | 通过 | 未完整通道可以由关联入口和资料库打开。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B06 | 通过 | 零完整通道的测试图，仍能看到本命激活和相关悬挂端点。 | tests/reference-e2e.mjs（合成 1981-03-22 零通道出生图，桌面与手机视口） |
| B07 | 通过 | 多通道端点显示完整关联；10/20/34/57等位置没有漏关联或重复破坏拓扑。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B08 | 通过 | 六爻在闸门内可查看；搜索 `14.2` 正确进入第二爻，没有384条顶层列表。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B09 | 通过 | 点击人格/设计的具体行星保留“人物、侧、行星、爻线”，不只传闸门号。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B10 | 通过 | 普通详情点击与弹窗内部跳转不跳资料库；关闭回到原来的图与滚动位置。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B11 | 通过 | 资料库关联导航、返回、搜索结果滚动与焦点不无故丢失。 | src/views/reference.js 保留结果滚动和条目焦点；tests/reference-e2e.mjs 在桌面与手机检查返回焦点，桌面检查滚动 |
| B12 | 通过 | `3-60`、`60-3`、不同横线形式及中英文名称按规则命中同一条目。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B13 | 通过 | 无效闸门、爻线、通道地址不会落到其它内容；检查 `14.0`、`14.7`、`14.foo`、`14.1.extra`。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B14 | 通过 | 回路导航简化，不出现单独顶层“network”；UI重组没有误改计算结构。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B15 | 通过 | 没有新增学习进度、课程、来源抽屉、全局字典膨胀；既有许可证信息保留。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| B16 | 通过 | 内容缺失与语言回退可理解，不输出 `undefined`、空标题或模型补写的假资料。 | stage-1.md；tests/reference-catalog.test.js；tests/reference-e2e.mjs |
| C01 | 通过 | 使用实际锁定依赖和同一秒级补丁，生成器与客户端计算签名一致。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C02 | 通过 | 2026试验报告包含事件数、JSON/gzip/brotli字节数、生成时间、环境、内存测量方法。 | stage-2.md（2026 实测字节、事件、耗时、结束 RSS） |
| C03 | 通过 | 2026试验有随机时刻、边界、逆行等对照；差异未被隐藏。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C04 | 通过 | 一年验证通过后生成2021–2036全部16年；manifest列出的每个文件都存在、可解析、哈希正确。 | public/transit-data/manifest.json；scripts/verify-transit-events.mjs --all |
| C05 | 通过 | 每年范围是UTC年界，包含13个初始激活点；无人物、姓名、地点、账户标识。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C06 | 通过 | 同一输入与生成签名可以复现相同核心数据；在UTC、上海及纽约等生成机时区运行结果一致；构建时间戳不破坏必要的可复现性。 | stage-2.md（上海、纽约、UTC 等值哈希） |
| C07 | 通过 | 每个事件有正确的前后状态，严格排序，去掉重复记录且不吞掉不同事件。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C08 | 通过 | 闸门未变但爻线变化的事件被记录；事件导航索引只含闸门变化。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C09 | 通过 | 年初/年末/闰年/跨年连续状态一致；1月1日快照不会制造伪变化。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C10 | 通过 | 相同时间戳多个点变化原子应用，没有零时长中间区间。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C11 | 通过 | 太阳/地球与南北交点等成对状态保持引擎约定，不因文件分割失配。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C12 | 通过 | 一颗行星离开闸门而另一颗仍在，闸门保持激活；爻线也验证相同情形。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C13 | 通过 | 本命贡献仍在时，行运离开不能熄灭本命闸门、通道或中心。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C14 | 通过 | 逆行、驻留、往返边界有明确测试；没有以大步长掩盖漏检。 | scripts/verify-transit-events.mjs --all 显式加入黄经变向驻留窗口、统计 A→B→A 事件并逐事件前后对照；2026 年 18 个驻留窗口、18 次往返，20,554 时刻差异 0。生成步长 1 分钟、边界细化 1000 毫秒；分钟内极端往返仍作为已知精度限制保留 |
| C15 | 通过 | 检测容差、扫描步长与天文精度分开记录，没有“绝对精确到1秒”的虚假承诺。 | stage-2.md（扫描步长、容差及局限） |
| C16 | 通过 | 事件表没有伪造连续黄经/深层数据；需要连续字段时走正确的按需计算。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C17 | 通过 | UI普通构建不重复生成16年；数据版本变化才触发相关重建。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C18 | 通过 | 静态部署与本地构建都能加载事件文件；路径不依赖某台开发机。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C19 | 通过 | manifest刷新策略与年度资源缓存策略正确；没有新版清单引用旧/缺失文件。 | stage-2.md；stage-3.md；tests/annual-events.test.js；scripts/verify-transit-events.mjs --all |
| C20 | 通过 | 生成失败保持旧可用产物，不能发布半份年度文件。 | scripts/generate-transit-events.mjs（年度临时文件 rename，末尾原子更新 manifest） |
| D01 | 通过 | 首次查看2026年7天，仅请求需要的年度文件，不下载其余15年。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D02 | 通过 | 7天→28天→7天，年度数据已在缓存时无重复天文扫描；用调用计数证明。 | tests/annual-events.test.js（请求计数）；tests/reference-v1-acceptance-e2e.mjs（桌面/手机各 1 次年度文件请求） |
| D03 | 通过 | 扩展到同年一年，复用年度数据；跨年只补另一年。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D04 | 通过 | 换人物复用公共天体事件，重新派生个人组合，不污染旧人物缓存。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D05 | 通过 | 改语言、主题、详情打开关闭不重算星历；改变计算模式/行星范围不会误用旧派生结果。 | tests/timeline-language-contract.test.js 证实语言仅重绘；tests/reference-v1-acceptance-e2e.mjs 两次主题切换后仍只请求一次年度文件；src/views/chart.js 弹窗只重绘详情，src/features/transit-timeline/client.js 派生缓存键含完整请求 |
| D06 | 通过 | 同一年度同时被多个模块请求，只进行一次有效加载/解析任务。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D07 | 通过 | 过多年份按容量或最近使用策略淘汰；反复切换年份没有无界内存增长。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D08 | 通过 | 缺文件、哈希错误、网络失败和签名失配均有处理，不显示伪空天空。 | tests/annual-events.test.js；tests/annual-fallback-e2e.mjs |
| D09 | 通过 | 范围外仅补算实际请求部分，可取消，不自动后台算整年。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D10 | 通过 | 不完整/取消结果不冒充完整缓存；旧异步响应不能覆盖新请求。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D11 | 通过 | 用户出生盘首次算后复用；重命名不重算，改日期时间/规则正确失效。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D12 | 通过 | 出生盘缓存序列化前后结构和输出一致，未知时间元数据与明确时间不混淆。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D13 | 通过 | 个人缓存损坏或被浏览器清理时可重算，不丢用户原始人物资料。 | stage-3.md；tests/annual-events.test.js；tests/chart-cache.test.js；scripts/benchmark-timeline-browser.mjs |
| D14 | 通过 | 7/28天热切换、导航、年度解析和一年派生有桌面与手机数据，报告实机/模拟区别。 | stage-3.md；scripts/benchmark-timeline-browser.mjs（桌面与模拟手机） |
| D15 | 通过 | 手机打开后没有默认连续一年天文任务；Worker计算可取消，不用“后台”掩盖CPU消耗。 | tests/reference-v1-acceptance-e2e.mjs 手机模拟视口初始 7 天仅取一年文件；tests/timeline-e2e.mjs 快速切换取最终范围；stage-3.md 报告 CPU 限速数据。低端物理手机未测 |
| E01 | 通过 | 原版手机双区域比例、上下滚动、横向平移、缩放、刻度和桌面布局不退化。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E02 | 通过 | 爻线紧挨父闸门展开，关闭恢复；没有全部闸门之后另铺全部爻线。 | tests/reference-v1-acceptance-e2e.mjs；stage-4 截图 |
| E03 | 通过 | 整个查询范围都无区间的对象不默认占空轨道；没有“显示未激活”开关。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E04 | 通过 | 当前窗口暂时空白不导致拖动时整个行序抖动；筛未激活不依赖可见轨道存在。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E05 | 通过 | 同闸门多个行星、多个爻、本命和行运交叠都显示正确区间。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E06 | 通过 | 上一/下一按钮常驻可连续点击；手机浮动按钮不挡住主要数据，不必每次打开更多。 | tests/timeline-e2e.mjs；stage-4 手机截图 |
| E07 | 通过 | 左右键与按钮共用逻辑，只跳闸门变化，不跳单纯爻线变化。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E08 | 通过 | 输入、下拉、编辑文本、模态弹窗和其它页面中，左右键不操纵时间轴。 | src/features/transit-timeline/view.js 只在焦点为 `.tl-table` 自身时处理方向键；tests/reference-v1-acceptance-e2e.mjs 覆盖搜索输入和详情弹窗 |
| E09 | 通过 | 同时发生多个变化只停一次；文件边界与窗口边界不算事件。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E10 | 通过 | 点击后横向时间、纵向轨道都到位，主目标真实可见；身体图同步高亮。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E11 | 通过 | 高亮快亮、短时保持、淡出；没有新增事件文案区、强制资料跳转或自动弹窗。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E12 | 通过 | 高亮离开的闸门/消失边界也能识别；全部激活集合不变的来源事件不伪造新通道。 | tests/annual-events.test.js 用同一激活集合的行星换闸夹具，验证导航保留离开闸门且本命通道/闸门区间不伪变 |
| E13 | 通过 | 开启分类/搜索筛选时不会跳到不可见对象或悄悄清掉筛选。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E14 | 通过 | 导航不自动展开所有爻线；用户自行展开状态不被无故清除。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E15 | 通过 | 快速连续点击无乱序、动画积压、滚动振荡；最新目标优先。 | tests/reference-v1-acceptance-e2e.mjs 在普通与 reduced-motion 下各连点三次，核对时刻递增、旧回调不覆盖和目标轨道仍可见；src/features/transit-timeline/view.js 用代次抑制旧高亮 |
| E16 | 通过 | 减少动态效果模式不闪烁；键盘焦点和按钮标签仍可用。 | tests/reference-v1-acceptance-e2e.mjs 在 reduced-motion 下验证无动画与方向键；按钮有 aria-label；完整屏幕阅读器路径仍未执行 |
| E17 | 通过 | 行星选择、图、轨道、筛选、导航范围一致。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| E18 | 通过 | 当前范围没有更多事件，给简短提示，不无限搜索/计算。 | stage-4.md；tests/timeline-e2e.mjs；tests/timeline-mobile-touch-e2e.mjs |
| F01 | 通过 | 只有对象＋状态，没有激活来源细分与强弱评分。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F02 | 通过 | 正/反向闸门、爻线、通道、中心状态正确；桥接作为一种条件存在。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F03 | 通过 | 多选行内“任一”、条件行间默认“全部”，总开关“全部/任一”行为有清楚测试。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F04 | 通过 | 本命已激活对象全范围匹配有效，不被旧 `nonBirth` 逻辑过滤。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F05 | 通过 | 未激活状态在请求范围取补集，未知/未加载资料不算未激活。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F06 | 通过 | 目标可从完整目录选，即使时间轴没显示该轨道。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F07 | 通过 | 本命叠加/纯行运/单行星选择下，查询与画面一致。 | tests/timeline-conditions-e2e.mjs：同一本命闸门在叠加模式匹配全范围，切到纯行运单月亮后不继承本命全范围结果 |
| F08 | 通过 | 区间交集、并集、反向、相邻合并、空集合、全范围、单点边界正确。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| F09 | 通过 | 查询已有数据不再次跑星历；用户换条件旧结果不会覆盖新结果。 | src/features/transit-timeline/conditions.js 只处理现成区间，无星历导入；tests/timeline-conditions-e2e.mjs 证实编辑条件立即清空旧结果，重新查询显示当前错误 |
| F10 | 通过 | 点结果正确定位高亮，无强制弹窗或跳资料库。 | tests/timeline-conditions-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| F11 | 通过 | 没条件、无效目标、无数据、取消、无匹配有明确反馈，未编造结果。 | tests/conditions-bridge.test.js 覆盖无数据、无条件、非法目标、无匹配；tests/timeline-conditions-e2e.mjs 覆盖 UI 提示与清除旧结果。条件查询同步执行，无独立取消态；Worker 计算取消由 D15 验证 |
| F12 | 通过 | 带爻线条件不迫使用户打开384条轨道，也不改变闸门事件导航规则。 | stage-5.md；tests/conditions-bridge.test.js；tests/timeline-conditions-e2e.mjs |
| G01 | 通过 | 二分、三分、四分分别构造测试夹具。 | tests/conditions-bridge.test.js（二分、三分、四分夹具） |
| G02 | 通过 | 稳定识别本命岛；当前行运变化不重排原始身份。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G03 | 通过 | 三岛只连两岛，正确报告部分连接；三个全连正确报告全部连接。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G04 | 通过 | 路径经过原本未定义、后被定义的中间中心，也识别桥接。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G05 | 通过 | 无关的新行运岛产生时，不被误算成本命岛数量增加或桥接失败。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G06 | 通过 | 多条连接路径存在时，分组关系完整；代表性路径不被描述成全部路径。 | tests/conditions-bridge.test.js（平行路径同属固定本命岛分组）；界面仅报告分组关系，未声称列出全部路径 |
| G07 | 通过 | 一分/无定义/无人物入口仍可见，执行时提示原因，不新增反映者专用工具。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G08 | 通过 | 纯行运模式不暗中借用出生图桥接；要求正确模式时明确告知。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| G09 | 通过 | 区间合并不掩盖连接关系改变；查询不重新进行分钟级天文扫描。 | stage-5.md；tests/conditions-bridge.test.js；tests/reference-v1-acceptance-e2e.mjs |
| H01 | 通过 | 正式名称为“行运”；没有新“我的行运”文案。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H02 | 通过 | 日期时间、现在、简洁时区和结构信息可见；秒/纯行运低频设置收起。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H03 | 通过 | 没有A/B、长区间查询或“去时间轴”引导按钮；详情仍在原地弹窗。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H04 | 通过 | 没有凭列表第一项生成“最强主题”；没有依据空通道编人生判断。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H05 | 通过 | 夏令时重复/不存在时刻正确处理；改变显示时区不悄悄改变绝对瞬时。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H06 | 通过 | 地点输入跨界面语言测试：上海、Shanghai、東京、Tokyo等；相同城市解析一致。 | stage-6.md（上海/Shanghai、東京/Tokyo 实际浏览器及 curl 请求） |
| H07 | 通过 | 搜索无结果与网络故障可区别，输入法组合/两字符/快速换词不会展示过期候选。 | tests/place-search-e2e.mjs（组合输入、过期响应、两字符、无结果和网络故障） |
| H08 | 通过 | 主出生表单、关系图、团队地点行为一致；未知地点提供手动时差备用。 | tests/place-search-e2e.mjs 逐一检查主表单、关系图与团队候选及手动时差；tests/reference-e2e.mjs 用主表单手动时差建图 |
| H09 | 通过 | 不支持的搜索返回语言允许回退；没有强制语言检测/翻译系统。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H10 | 通过 | 无效日期、时间、时差、坐标、时区不会悄悄变12:00或UTC=0；季度小时偏移不丢失。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H11 | 通过 | 秒精度数据要么真实支持并保留，要么明确拒绝；不会静默丢秒或伪造秒级可信度。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H12 | 通过 | 默认新分享URL不含姓名、地点、坐标、账户/人物ID；日期时间时差复算正确。 | tests/share.test.js；tests/reference-v1-acceptance-e2e.mjs（实际复制并刷新） |
| H13 | 通过 | 分享流程没有实名/匿名切换，字段预览简洁且真实；不宣称加密或完全不可识别。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H14 | 通过 | 复制失败不引导用户复制带私人字段的旧地址栏。 | stage-6.md；tests/share.test.js；tests/place-search-e2e.mjs；tests/reference-v1-acceptance-e2e.mjs |
| H15 | 通过 | 已有本地人物时打开纯资料深链接，URL仍无出生信息。 | tests/reference-e2e.mjs 在隔离浏览器创建合成人物后打开 `#library/gate/14`，查询参数为空 |
| H16 | 通过 | 旧分享可兼容，新输出遵守最小字段；PNG在静态部署可用且不意外带个人标签。 | stage-6.md；stage-6/desktop-chart.png；stage-6/mobile-chart.png |
| I01 | 通过 | 原有散落CSS/JS/SVG色值收敛，浅/深色正常，不新增皮肤编辑器。 | src/styles.css 统一主要图表、行运与关系图语义色；src/bodygraph.js 与 src/views/connection.js 从变量取值；静态浅/深色截图与构建通过。引擎独立的容错色值仍保留 |
| I02 | 通过 | 同语义颜色在图、轨道、徽章、弹窗、图例一致；定位高亮可辨识。 | tests/reference-v1-acceptance-e2e.mjs 桌面/手机在浅深主题核对行运环、轨道、图例统一 `--transit-source`，行星文本用对比色变量；弹窗徽章共用 `--transit-source-text`，主题切换强制重绘 SVG |
| I03 | 通过 | 导出SVG/PNG正确解析主题变量，与屏幕一致，不出现黑块、透明丢失或默认色。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I04 | 通过 | 本轮不以“降饱和度”擅自改视觉；用户反馈原色偏淡只记录供后续设计。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I05 | 通过 | 引擎与锁文件未无意升级，秒补丁可复现；适配层没有变成新插件平台。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I06 | 通过 | 细分原始字段保留，但无个体Color/Tone/Base新入口和深层时间轴。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I07 | 通过 | 内部写明能力与精度限制，不出现全部层级“reliable”硬编码。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I08 | 通过 | 独立资料清点任务有原始文本、代码路径、版本和待核问题，不由模型填空伪装审校。 | docs/data-audit/README.md；docs/data-audit/inventory.json；docs/data-audit/issues.md；scripts/audit-reference-data.mjs |
| I09 | 通过 | 功能与文案修订分离；必要版权声明仍在，前端没有新增来源目录。 | stage-6.md；docs/data-audit/issues.md；tests/quarter-correction.test.js |
| I10 | 通过 | 所有测试报告区分已执行、未执行、模拟、实机及已知限制。 | stage-0.md 至 stage-6.md；本表 |

## 最后一条贯通路径

`ACCEPTANCE_CAPTURE=1 E2E_URL=http://127.0.0.1:5187 node tests/reference-v1-acceptance-e2e.mjs`：桌面 1440×1000 与手机模拟视口 390×844 均通过。同一合成二分图完成通道→闸门六爻→资料库同文→行运→时间轴 7/28/7→父闸门下爻线→左右键/按钮→多条件→桥接→复制最小分享→刷新恢复。每个视口只请求一次 2026 年度文件。截图：`stage-6/acceptance-1440.png`、`stage-6/acceptance-390.png`。

## 整体限制

- `npm test` 最终复跑 162 项，160 通过、2 失败；失败均为阶段 0 已存在的 Node MCP 在线地理编码 `fetch failed`。浏览器与 curl 的跨语言地理编码另有成功证据。
- 年度事件按一分钟扫描、1000 毫秒边界细化；全部 16 年约 2 万点/年的同引擎逐点及完整图状态对照差异均为 0，但不能证明分钟内往返绝不会漏检，也不能替代独立星历认证。
- 物理手机、屏幕阅读器、真实账户数据库与生产部署均未验收；正式安装与账户数据未修改。
