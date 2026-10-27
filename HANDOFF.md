# TD-OHD 前端重设计 · 工作交接文档

> 写给接手的 agent。本文档覆盖：项目状态、分支结构、已完成工作、待办事项、
> 用户的硬性要求与设计偏好、外部扒取资产的位置、环境与工具注意事项。
> 交接时间：2026-10-26 凌晨。上一任执行者：butter（毛毛）。

> **2026-10-26 目录迁移说明**：本工作区已从
> `~/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34/`
> 迁移到 `~/Documents/Projects/TD-OHD/worktrees/sheet-column-v1/`，共享仓库在
> `~/Documents/Projects/TD-OHD/repository/`。下文路径已更新为新位置；迁移前的旧写法
> 只在历史记录里保留。旧路径仍可访问是因为留了指回新位置的兼容软链，不要当工作目录用。

---

## 一、项目与仓库状态

### 仓库位置（git worktree 布局）

主仓库源在 `~/Documents/Projects/TD-OHD/repository`，各分支工作区在
`~/Documents/Projects/TD-OHD/worktrees/`，通过 git worktree
挂了多个分支目录。**本项设计工作全部在这个 worktree 里：**

```
~/Documents/Projects/TD-OHD/worktrees/sheet-column-v1/
```

- 分支名：`design/sheet-column-v1`
- 远端：`https://github.com/NothingnessVOID/TD-OHD.git`（origin）
- 已合并到官方 main 最新（`12b9705`，PR #40，2026-10-25 合并，无冲突）

### 本分支提交历史（新→旧）

```
3b88c83 docs: 交接文档（迁移前的状态记录）
de3648c feat(skins): 三个重设计方向做成可切换皮肤（A朱砂/B铜瓷/C墨印）
7b1b082 feat(chart): 轮盘开关移到顶栏 + 2/3 轮盘布局 + 轮盘交互（点击闸门/行星/卦象）
faa729c feat(chart): 官方轮盘视图 — 人体图/轮盘切换，曼陀罗环 + 中心人体图克隆
7af0104 merge main (PR #40) into design/sheet-column-v1
1893ec5 fix(sheet-column): 修回路卡报错、B款变量箭头、十字数字放大、色律B档
4b366a3 design(chart): 卡片流 v2（横幅仪式感 + 档案主卡 + 权威图标 + 回路 + 十字 + 变量）
6d8cf60 design(chart): 单页列表 v1（已被用户否掉，保留在历史里）
```

### 工作区未提交内容（可丢弃的开发临时文件）

- `sheet-v1-probe.mjs` / `sheet-v1-shots.mjs`（改动：指向 5216 端口）
- `wheel-debug.html`、`public/assets/`（轮盘开发时的调试页和素材副本）
- `mandala-view-test.mjs`、`skin-directions-shots.mjs`（已提交的测试脚本，保留）

### 部署红线（重要！）

- **本机 9961 端口跑的是用户正在用的桌面版**
  （`~/Library/Application Support/OpenHumanDesign/app`，launchd 服务
  `com.unforced.open-human-design`）。**绝对不要向 9961 部署或推送任何东西。**
- 开发预览一律用 vite dev server：`npx vite --port 5216 --strictPort`，
  日志 `/tmp/vite-5216.log`。构建命令（需要时）：
  `PATH="$HOME/.dotnet:$PATH" DOTNET_ROOT="$HOME/.dotnet" npm run build:desktop`
- 回滚备份都在 `~/Documents/Projects/TD-OHD/archive/backups/rollback-before-*` 目录。

---

## 二、已完成的工作

### 1. 右栏信息列重设计（卡片流 v2，已提交）

文件：`src/views/chart.js`（`renderFoundationCards()`）、`src/styles/sheet-column.css`、
`src/lib/panel-graphics/authority-icons.js`（新增，权威图标 SVG）。

结构：顶部横幅保留仪式感（类型大字 + 策略），下面是卡片流：
档案主卡（4/6 大数字 + 人格/设计爻线梯）→ 权威卡（专属图标）+ 定义卡 →
主导回路卡（三枚彩色圆点：个体紫/集体蓝/部落红，数量+名称，主导加墨色描边）+
化身十字卡（2×2 十字格，数字 27px 衬线放大，RA/LA/JX 标注）→ 变量卡（一行四个短粗箭头）。

宽屏两列、窄屏一列堆叠。点卡片能打开原有的知识详情弹窗（`wireKnowledgeTargets`）。

### 2. 色律 B 档（已提交）

**数据编码色全皮肤锁定，铜色只留在界面层。**

- `src/styles/sheet-column.css` 顶部定义了全局语义 token：
  - `--act-personality: #2B2B2B`（人格墨）/ `--act-design: #D04948`（设计红）
  - `[data-theme="dark"]` 下只提明度：`#E8E4DE` / `#E0706E`
- 回路四色是行业标准值，**所有皮肤一致，永远不动**：
  个体 `#7A2F99`、部落 `#A82E24`、集体 `#1C6695`、整合 `#18773F`
- 变量箭头、十字格、行星符号都走这套语义色

### 3. 官方轮盘完整复刻 + 接入网站（已提交）

**数据链**：官方 API（已调通）→ 官方 bundle 提取的几何/符号/CSS → 渲染器 → SVG。

- 浏览器端渲染器：`src/lib/panel-graphics/mandala.js`（`renderMandalaRings(chart)`）
- 静态数据模块：`src/lib/panel-graphics/mandala-data.js`（50KB，官方硬编码数据）
- 图表页顶栏有「人体图 / 轮盘」切换按钮（`.graph-view-toggle`，在
  `index.html` 的 `.header-actions` 里，只在图表视图显示）
- 轮盘模式：`.chart-layout.mandala-mode` 左 2/3 右 1/3；中心嵌入网站自己的
  人体图 SVG 克隆（已带激活色）
- 交互：闸门楔形/卦象点击 → `showGateDetail`；行星符号点击（带透明热区 r=26）→
  `showPlanetDetail`；悬停高亮。闸门数字本身 `pointer-events:none`（官方行为，
  点击穿透到楔形）
- 测试：`node mandala-view-test.mjs`（需要 5216 在跑），验证过全部通过：
  顶栏开关 ✓、2/3 布局（920:460）✓、行星/楔形/卦象点击出详情 ✓、无控制台报错 ✓

**官方复刻的关键几何常量**（存在 mandala-data.js 里，来自官方 bundle 模块 At）：
- 画布 2000×2000，中心 (1000,1000)
- 闸门号环 r=780；卦环锚点 (975,970) r=900（这个偏移是官方故意的，配合卦象
  矩形组向右下展开实现视觉居中，**不要再加自己的补偿**）
- 行星环 r=[622,574,530,490,454,422]（同闸门多行星按经度排序进不同环）
- 每格 5.625°，公式 `angle = 5.625 × index − 2.8`（index 0 = 46 号闸门在正东，
  index 48 = 10 号闸门在正顶，顺时针，和官方截图一致）
- 黄道楔形 `rotate(60 − 30i)`，符号 `rotate(193.5 − 30i)` 位于 x=970 y=290
- 黄道宫归属：巨蟹3:0、双子2:6、金牛1:11、白羊0:16、双鱼11:22、水瓶10:27、
  摩羯9:32、射手8:38、天蝎7:43、天秤6:48、处女5:54、狮子4:59；
  **27 号闸门 zodiac 为 null，归双鱼(11)**（官方 seamGateIds 特例）
- 行星激活色：activation 0 = 设计 = 红，activation 1 = 人格 = 黑
- 行星 id 顺序 0-12：太阳、地球、月亮、北交、南交、水星、金星、火星、木星、
  土星、天王、海王、冥王（和我们引擎 BODY_ORDER 完全一致）

### 4. 三个皮肤重设计方向（已提交，等用户选定）

注册在 `src/lib/skin-registry.js`（现在共 17 个皮肤），CSS 在
`src/styles/skins/direction-{a,b,c}.css`，已 @import 进 `src/styles.css`：

- **direction-a-light / direction-a-dark 朱砂宣纸**：主色朱砂红 #B85C38（偏黄，
  不是大红），鎏金 #C9A15C 只做仪式层（徽章），墨色扛层次
- **direction-b-light / direction-b-dark 鎏铜青瓷**：保留现有铜色 #B86F2C 身份，
  加青瓷绿 #4F9384 做第二声部（成功/信息态、transit 家族、投射者类型色）
- **direction-c-light / direction-c-dark 墨韵朱印**：最克制，主操作色是墨
  #23201C（暗色是骨白 #EDE9E0），朱印红 #B5483A 只出现在焦点环、选中环、
  类型徽章、策略行

三个方向都遵守色律 B 档（--hd-personality/--hd-design 锁定值一致）。
截图脚本：`node skin-directions-shots.mjs`（直接设 data-skin 属性截六张图）。

### 5. 官方文案资产扒取（已存档，未接入网站）

位置：`~/Documents/Projects/TD-OHD/research/hd-design-research/`

- `gate-texts.json` — 64 闸门：name / titleKeynote / keynote / desc（英文长文）
- `cross-descs.json` — 192 轮回交叉：name / gates / desc（验证过：Demo 盘
  cross=177 = "Right Angle Cross of The Sphinx (2/1 | 13/7)" ✓）
- `cross-names.json` — 192 交叉 id→名称速查
- `cross-orientations.json` — 三种角度（Left/Right/Juxtaposition）官方说明
- `channel-texts.json` — 36 通道：name / keynote / desc（额外收获）
- 提取脚本：`extract-gates.js`、`extract-texts.js`（输入 mbg-app.js）

### 6. 轮盘尺寸适配 + 右栏信息卡重排（2026-10-27，待用户验收）

**轮盘一屏适配**（`src/styles/sheet-column.css`）：轮盘 SVG 改为
`width: min(100%, calc(100dvh - var(--header-height) - 48px))` + `aspect-ratio:1`，
容器 flex 居中。预算公式等于 `.chart-column` 的 sticky top（header+24）加底部 24，
所以滚过顶部横幅后轮盘恰好完整贴在一屏内。

**左栏宽度跟随轮盘**（`src/styles.css`）：`mandala-mode` 的栅格从固定 `2fr/1fr`
改为
`minmax(0, min(calc(100% - 320px - var(--page-gap)), calc(100dvh - var(--header-height) - 48px))) minmax(320px, 1fr)`。
左栏只占轮盘实际需要的宽度（两侧只剩 4px 容器内边距），剩下的全给信息栏，
信息栏保底 320px。例：1600×800 下信息栏从 480px 变为 744px。

**手机端的视图开关**（`src/views/chart.js` `placeGraphViewToggle()` +
`src/styles/sheet-column.css`）：开关在 `--phone`（≤ 640px）时由 JS 移入
`#primary-nav` 导航面板（同一个元素，不复制标记），在面板里做成整宽行、
38px 高；选完自动关闭面板。回到桌面宽度时按记住的锚点插回 `.header-actions`
原位（仍是第一个）。**顺带修了旧 bug**：原来开关写死在 ≤900px 隐藏，而导航在
640px 才收进汉堡菜单，641–900px 区间里轮盘完全无法进入。

**右栏信息卡重排**（`src/views/chart.js` `renderFoundationCards()` +
`src/styles/sheet-column.css`），卡片顺序：人生角色（整行）→ 内在权威 | 定义 →
主要回路（整行）→ 化身十字 | 四箭头。

- 化身十字：固定 230px 的 `.pg-cross-mini--rail` 改为随卡片弹性收缩（之前在
  221px 宽的卡片里横向溢出 43px）；冗余的「JX · 闸门 …」注释行删除（角度信息
  已包含在十字名称里）；名称尾部的括号闸门数用 `.pc-cross-gates` 单独换行。
- 四箭头：从一行四个改为 2×2 方阵，**人格在左、设计在右**（与人生角色爻线梯、
  化身十字保持同一方位语言，用户 2026-10-27 明确确认按此正规方位）；上行
  动机/摄取，下行视角/环境。格子改用十字格同一套语言（同 54px 高、同侧色淡底
  + 5px 内嵌色条），箭头放大到 40×22 并在格子内垂直居中；标准记法（PRL DRR）
  从卡头移到格子下方，使两张卡结构对称、格子等高。
- 主要回路：从「与十字并排的窄卡」改为整行卡（75px → 122px）：首行标签与主导
  回路文字同基线，中间复用 `segbar()` 通道占比条，底部三枚回路圆点改为三等分
  栅格（原来靠右浮动，与文字中心差 11px 而显得偏上）。
- 定义：补上 `definitionIslands()` 分区图（复用既有组件），不再只有文字。
- 方位字号统一：`.pg-cross-rail-label`（原 9px）与 `.pc-var-col-head`（原 10.5px）
  合并为同一条规则，统一 11px；太阳/地球行标签同步放大。
- 卡片是否两两并排改用容器查询 `@container infocol (max-width: 460px)`，不再用
  视口宽度断点（栏宽现在取决于窗口高度，视口断点会误判）。
- 删除死样式：`.pc-donut*`、`.pc-legend*`、`.pc-circuit-copy`、`.pc-var-arrows`
  （均无标记引用）。

**测试脚本**（均为未纳入版控的开发临时文件，需要 5216 在跑）：
`node wheel-fit-test.mjs`（六种视口的轮盘尺寸/空档/溢出）、
`node column-acceptance.mjs`（右栏卡片的 16 项断言 + 手机竖排 + 窄栏）、
`node card-interaction-test.mjs`（卡片点击弹窗 + 标签切换）、
`node mobile-toggle-test.mjs`（开关归属、641–900px 区间、缩放往返）、
`node layout-diag.mjs`（几何量测）。

注意：测试档案（1991-11-12 08:42 上海）只有 1 条通道，所以回路占比条只画 1 段、
回路计数是 0/0/1；用户自己的档案通道多，会画出多段。这是 `segbar()` 跳过零计数
分组的正常行为，不是 bug。

### 7. 定义卡图形（方案 B）+ 爻线梯（2026-10-27，待用户验收）

**定义卡图形**：用户在四个方案里选了 B「群岛」。每个定义岛一个带框小簇，
框内是该岛的真实中心形状（`centerGlyph`），框下一条强调色细条，下面标中心数。
实现在 `definition-islands.js` 新增的 `definitionIslandCards()`；旧的
`definitionIslands()`（圆点版）仍被 fact rail 用着，没删。

- 定义卡改成与权威卡同构：标签 → 46px 图形槽 → 主文字 → 小字；两卡四行的
  y 值实测完全一致（685.3 / 712.1 / 770.1 / 797.9）。
- 形状尺寸自适应：已定义中心总数 ≤5 用 17px、6–7 用 15px、≥8 用 13px；
  窄栏（infocol ≤379px）固定 20px。实测三分人 8 中心：桌面窄卡 156×38、
  手机 212×45，都落在 46px 槽内且不超卡片宽度。
- 方案页保留在 `definition-design.html`（dev server 开 /definition-design.html），
  A/B/C/D 四个方案各画了一分到四分人；`node design-shot.mjs` 截图。

**爻线梯**：`lineLadder()` 新增 `yao` 参数，六爻按真实卦象画（阳爻整条、
阴爻断开），纵向自下而上（初爻在底、上爻在顶），激活爻用侧色（人格墨 /
设计红，遵守色律 B）。人生角色卡的两条梯分别取人格太阳、设计太阳所在闸门
的卦象；闸门列表里的横向爻梯也带卦象。

- 新模块 `src/lib/panel-graphics/hexagram-lines.js`：闸门号＝文王卦序号，内置
  64 卦六爻表（自下而上）。**不要改用 mandala-data 的 `HEXAGRAMS` 矩形几何
  推爻**：那是两层无条件叠加的绘制层，含重复与杂线（乾卦多一条阴爻、坤卦
  多一条整阳），解析有歧义。模块里另导出 `hexagramLinesFromGeometry()`，只用于
  测试交叉验证。
- 验证：`node hexagram-lines-test.mjs` — 64 卦六爻齐全、2 个已知卦逐一对照
  （乾坤讼师泰否坎离震艮巽兑既济未济）、阳爻数量分布符合 C(6,k)、与官方
  几何可比对的 381 条爻零冲突（64/64 闸门强验证）。

**测试脚本**：已纳入版控的回归套件有 `column-acceptance.mjs`（右栏 24 项断言：
对齐、行规格、回路卡、无溢出）、`yao-ladder-test.mjs`（爻线梯 + 群岛图形）、
`island-fit-test.mjs`（三岛在窄卡与手机的适配）、`hexagram-lines-test.mjs`（纯 node，
64 卦数据验证）、`wheel-fit-test.mjs`（轮盘六视口尺寸）、`mobile-toggle-test.mjs`
（手机开关归属与缩放往返）、`card-interaction-test.mjs`（卡片点击与标签切换）。
都需要 5216 在跑（`hexagram-lines-test.mjs` 除外）。本地还有一批不入版控的
临时工具：`find-circuit-profile.mjs` / `find-rich-profile.mjs`（找参考档案）、
`design-shot.mjs`、`final-shots.mjs`、`layout-diag.mjs`（几何量测与确定性检查）、
`wheel-fit-probe.mjs`，以及方案页 `definition-design.html`（dev server 下
/definition-design.html 可直接打开，与 `wheel-debug.html` 同类，不入库）。

**参考档案（虚构、可复现）**：
- 三回路齐全：1990-01-15 00:44 上海 → 4/6、一分人定义、1 岛 4 中心 3 通道、
  个体1/集体1/部落1、右角化身十字之玛雅 4（61/62 | 32/42）。
- 三岛八中心：fixtures 里的「测试09·叶宁」1997-07-19 07:05 悉尼 →
  三分人定义、3 岛 8 中心 5 通道。

**教训**：跑测量脚本时不要同时改文件。vite HMR 会让页面中途重载，导致
「出生数据 ↔ 图表结果」对不上（这次就误记了一个参考档案，后来用
`layout-diag.mjs` 连跑三次确认引擎是确定性的才找到原因）。

---

## 三、待办事项（按优先级）

### ~~P0 · 轮盘尺寸适配~~ → 已完成（2026-10-27）

已按「轮盘完整落在一屏内」实现，并顺带解决了左栏空档与右栏被挤窄的问题。
细节见「二、已完成的工作 · 6」。

### ~~P0 · 无头浏览器截图故障~~ → 已自行恢复（2026-10-26 晚）

2026-10-26 晚间重测时截图已恢复正常（输出 26 万–78 万字节的有效 PNG，不再是
恒定 3225 字节的白图），未做任何特殊处理，推测是 Chrome 进程/机器重启后光栅化
层恢复。**若再次出现纯白 PNG**，按下面原始记录处理。

<details><summary>原始故障记录（保留备查）</summary>

**从 2026-10-26 凌晨开始，本机 headless Chrome（playwright-core + channel:chrome）
截图全部输出纯白 PNG**（连 `data:text/html` 红底测试页都是白的，3225 字节恒定）。
DOM 检查一切正常（elementFromPoint、computed style 都对），是 Chrome 光栅化层
坏了。起因疑似之前一次 fullPage 截图触发
`FATAL:SkBitmap.cc:252 tryAllocPixels [w:5241 h:278924]` 崩溃后 Chrome 状态异常。
已试过无效：`--disable-gpu`、`--disable-software-rasterizer`、`--use-gl=swiftshader`。

**接手后先试**：重启机器 / 关掉所有 Chrome 进程再试；或换
`chromium.launch({ headless:true })`（用 playwright 自带 chromium 而非系统
Chrome）；或 CDP screencast。**在截图恢复之前，验证 UI 改动要靠 DOM 断言
（evaluate + getComputedStyle + elementFromPoint），发图给用户前先自查。**

用户明确要求过：**每次截完图必须自己看一遍内容再发**，不许盲发。

注意：本会话出现过 read 工具读取新生成的 PNG 时，返回的图像描述是会话里更早
那张附件的旧描述（连续多次同样内容）。遇到这种情况不要当作已目视确认，改用
DOM 几何断言把关，并向用户说明未能亲自目视。

</details>

### P1 · 三个皮肤方向等用户选定

用户说「三个都做一下我看一下」→ 已做成真皮肤。等用户在外观面板（或截图）里
看过之后选一个，然后把选中的方向写回 `default.css`（替换现在的琥珀晨光/暮色），
其余两个方向皮肤可以保留或删除，问用户。

### P1 · 用户 2026-10-27 反馈记录（暂缓项，非最终决定）

以下是用户当面提出、但明确说「先记录下来、暂不推进」的事项。用户强调这只是
他目前的看法，之后可能变，**不要当成写死的需求，也不要未经确认就开工**。

1. **轮盘中心的人体图（暂缓，但里面有一个真 bug）**
   - 太小，放在轮盘里不方便观看（主要是尺寸问题）。
   - **渲染 bug**：用户指出有几个中心（他提到髂骨中心、直觉中心）的外框没画
     出来。这一条与尺寸无关，值得单独查（中心克隆自网站自己的人体图 SVG，
     怀疑是未定义中心的描边/填充在缩小后丢失，或克隆时漏了某个类名）。
   - 官方的紧凑圆弧版人体图（figure-m）：用户认可官方那个更好看也显得更大，
     但认为现在推进它耗费心力，暂缓。（旧记录里「不要主动做」的要求仍然有效，
     除非用户再提。）
2. **右栏下方细节区（中心/通道/行星等 tab）尚未验收**：之前已重做过，但用户
   说「有些效果不太好」，还没逐项看。本轮只做了右栏上方的主要信息卡。
3. **字号整体偏小**：用户提到但说「可能原本就是这么小，这个先不管」。
4. **并行开发线：睡眠图模块**（另一个分支）。用户预计它会先完成并先合入
   main。本分支（`design/sheet-column-v1`）只改了图表页的版面与样式，用户认为
   不涉及其他模块；合入前仍需 `git fetch` 核对远端，不要假设无冲突。


### P2 · 轮盘交互深化（对齐官方）

官方 myBodyGraph 的轮盘还有：悬停闸门时联动高亮（其余变暗的 high-contrast
模式）、悬停行星显示 tooltip、黄道宫悬停。目前只做了点击出详情 + 简单悬停
提亮。可以按用户后续反馈决定是否深化。

### P3 · 文案资产接入

64 闸门 / 192 交叉 / 36 通道的英文官方文案已扒好（见上文），未来做解读页面
时接入。注意：现有项目自己有一套中文解读内容
（`src/lib/human-design/english-readings.js` 等），接入时和现有内容体系怎么
合并需要问用户。

### P3 · 中心人体图的「圆弧版」

官方曼陀罗中心的人体图是紧凑圆弧版（figure-m），我们目前用的是网站自己的人体图
克隆（功能等价、颜色正确，但形状是标准版不是圆弧版）。用户看官方截图后指出过
这个差异，但后来说「不必去扒这个圆弧形了，别管这个事情」。**除非用户再提，
不要主动做。**

---

## 四、用户要求与设计偏好（务必遵守）

### 硬性约束

1. **不碰 9961**（用户在用的桌面版），预览只走 5216
2. **界面中文优先**，术语沿用项目已有 i18n（如化身十字走 `crossName()`）；
   默认语言 zh-CN；文案 key 加在 `src/locales/zh-CN/ui-*.json`（zh-Hant 同步）
3. **发图前自己先看截图内容**，不许盲发（之前两次乱码消息 + 一次没看截图
   就宣布成功，用户都不满意）
4. 左侧人体图逻辑不动、顶部导航暂不动（轮盘开关放顶栏是用户点名要的位置）
5. 用户不懂代码：**回复讲人话，少术语**，用到术语先解释；结论先行

### 设计偏好（用户长期稳定的审美）

- APP 式精致布局、卡片贴合内容、宽屏两列窄屏一列
- 中式意象：山水、印章、星盘；**朱红要偏黄，讨厌大红**
- 小尺寸图形必须极简、一眼能认；反对繁复堆砌
- UI 部件上不要水墨笔触、不要把内容框死的圆形印章框、不要生图式插画进 UI
- 右栏顶部保留仪式感（类型/策略横幅）
- 数据可视化：色律 B 档（数据色锁定，界面色随皮肤）

### 已确认过的具体设计决策（不要再翻案）

- 变量箭头 = B 款短粗箭头（CSS 绘制）。**2026-10-27 更新：排布从「一行四个」
  改为 2×2 方阵，人格在左、设计在右**（用户明确确认按这个正规方位）
- 方位语义全右栏统一：**人格左 / 设计右**（人生角色爻线梯、化身十字、四箭头一致）
- 回路 = 带描边色点，主导回路描墨环，并列时都保留环。2026-10-27 起主要回路
  是整行卡：标签与主导文字同基线 + `segbar()` 占比条 + 三等分圆点行
- 化身十字 = 数字放大 + 罗盘式呈现，不要四格象限平铺。2026-10-27 起：十字与
  四箭头共用同一套格子语言（54px 等高、侧色淡底 + 5px 内嵌色条、方位标签
  统一 11px）；十字名称的括号闸门数单独换行；不再重复输出「JX · 闸门 …」行
- 定义计数条方案已通过；2026-10-27 起定义卡补上 `definitionIslands()` 分区图
- 皮肤默认亮暗整套重做已授权
- **右栏上半部布局已通过（2026-10-27）**；下半部细节区（中心/通道等 tab）
  尚未定案，不要改
- 定义卡图形 = 方案 B「群岛」（2026-10-27 用户从 A/B/C/D 四案里选定）
- 爻线梯 = 真实卦象六爻，阳爻整条/阴爻断开，自下而上（初爻在底、上爻在顶）
  （2026-10-27 用户提出）

---

## 五、外部扒取资产总目录

### `~/Documents/Projects/TD-OHD/research/hd-design-research/`（永久存档）

```
调研报告.md            — 完整逆向分析记录（含补充资产章节）
mandala.svg            — 独立渲染器输出的完整轮盘（513KB，含嵌入人体图）
render-mandala.js      — 独立渲染器（node 脚本，输出 mandala.svg）
official-response.json — 官方 API 真实返回（Demo: London 1990-05-06 06:05）
wheel-data.json        — 64 闸门轮盘序 [gateId, zodiac, color]
gate-texts.json        — 64 闸门文案
cross-descs.json       — 192 交叉文案（含闸门组合）
cross-names.json       — 192 交叉名称速查
cross-orientations.json— 交叉角度类型说明
channel-texts.json     — 36 通道文案
extract-gates.js / extract-texts.js / gen-mandala-data.js — 提取脚本
assets/
  ge-template.svg      — ⚠️ 坏的提取文件（内含两个 SVG 拼接，勿用）
  maia-template.svg    — 干净的人体图模板（228KB，单一 SVG，widget 提取）
  maia-classic.css     — 官方经典样式全量（198KB）
  planet-glyph-01..13.svg — 13 枚行星符号
  gate-wheel-table.js  — 官方闸门轮盘数据表（原始提取）
mandala-final.png / mandala-v5.svg — 历史渲染版本
```

### `/tmp/hd-research/`（临时工作区，重启会丢，重要文件都已复制到上面）

```
mbg-app.js (1.6MB)     — myBodyGraph 前端 bundle（渲染逻辑、通道表、交叉表的源）
maia-app.js (1.2MB)    — Maia widget bundle（人体图模板、经典 CSS 的源）
hexagrams.json         — 64 卦矩形几何（官方硬编码）
svg-symbols.json       — 13 行星 + 12 黄道符号 SVG
channel-table.json     — 官方通道 id→闸门对映射（36 条）
response.json          — 官方 API 返回（同 official-response.json）
mandala.svg / render-mandala.js — 独立渲染器工作副本
extract-*.js / gen-mandala-data.js — 提取脚本
bodygraph-{defs,centers,channels,gates}.svg — ⚠️ 正则截取的碎片，不完整，勿用
```

### 官方 API 备忘（已调通）

```
POST https://app.maiamechanics.com/api-v2/api/web-calculator/server-side-generation
头：Content-Type: application/json
    calculator-token: <从 bundle grep apikey 提取，长 36>
    alter-token: <同上>
    Origin: https://jovianarchive.com
    Referer: https://jovianarchive.com/
体：{docType:"rave", data:{type:"rave", name, date:"DD/MM/YYYY", time:"HH:mm",
     city:<cities API 返回的对象>},
     tzData:{name, country, city, stateName, timezone, timeInUtc:false,
             time:<UTC ISO>}}
城市接口：GET https://charts.maiamechanics.com/api/cities/v3?search=London
返回结构：chart.planets[26]（id/gate/line/activation/chartId/longitude）、
chart.gates[16]{gate,mode}（mode 0=设计红 1=人格黑 2=混合）、
chart.channels[3]（官方通道 id，见 channel-table.json）、
chart.centers[9]（按中心 id 0-8：根/骶/脾/情绪/心/G/喉/眉心/头顶，2=有定义）、
chart.cross（0-191，对应 cross-descs.json）、profile/type/authority/variable 等
```

### 官方编号规则备忘（易踩坑）

- **官方通道 id ≠ 闸门号**：response 里 channels:[17,28,4] 要查 channel-table.json
  才知道是 18-58、13-33、24-61（我们项目 catalog.js 的 CHANNELS 数组索引也对得上）
- 人体图模板里通道元素 id = `c` + 两闸门升序拼接：c1858、c1333、c2461
- 中心 id：0根 1骶 2脾 3情绪 4心 5G 6喉 7眉心 8头顶；状态 0=EMPTY 1=UNDEFINED 2=DEFINED
- 卦环 hexagrams.json 里的 index 直接用（0 基），**不要减一**（减一就错位 5.625°）

---

## 六、环境与工具注意事项

1. **无头截图当前是坏的**（见 P0），修好前用 DOM 断言验证
2. vite dev server 5216 常驻（`nohup npx vite --port 5216 --strictPort`），
   HMR 正常；改 CSS/JS 后等一两秒再测
3. playwright-core 只在项目目录里能 require（`cd ~/Documents/Projects/TD-OHD/worktrees/sheet-column-v1`）
4. 测试种子档案：localStorage `natalengine_profiles`，脚本里有现成的
   （1991-11-12 08:42 上海，「设计预览」）
5. 项目皮肤系统：`data-skin` + `data-theme` 挂在 html 根元素，
   `src/lib/skin-registry.js` 注册（id/name/mode/preview/cssSource），
   CSS 文件在 `src/styles/skins/`，@import 汇总在 `src/styles.css` 顶部
6. 网站自己的引擎输出结构（`src/lib/chart-engine/sharp-contract.js`）：
   `chart.gates.{personality,design}[planet] = {gate,line,color,tone,base}`，
   `chart.positions.{personality,design}[planet].longitude`（轮盘转换器用的就是这些，
   见 `mandala.js` 的 `mandalaActivations()`）
7. 卡片交付走 show_card / stage_files；生成的媒体默认放
   `~/Desktop/OH-WorkSpace/资料/`（用户资料库）
8. 用户消息偶发乱码是会话层问题：**发现自己发出的中文变成碎片就重发一遍**

---

## 七、下一步建议动作（接手后按这个顺序）

1. 等用户在 5216 验收本轮改动（轮盘一屏适配 + 左栏无空档 + 右栏卡片重排 +
   手机开关），验收后提交并推送到 `design/sheet-column-v1`。
2. 催用户看三个皮肤方向（外观面板里现在有：朱砂宣纸、朱砂宣纸·夜、
   鎏铜青瓷、鎏铜青瓷·夜、墨韵朱印、墨韵朱印·夜），选定后写回 default.css。
3. 用户验收右栏上方后，再推进右栏下方细节区（中心/通道等 tab）的验收与修正。
4. 暂缓项见「三 · P1 · 用户 2026-10-27 反馈记录」，其中轮盘中心人体图的
   「部分中心外框未绘出」是真 bug，可以单独查。
5. 合并回 main 之前先确认睡眠图模块那条线的进度，并 `git fetch` 核对远端。

有问题查 `~/Documents/Projects/TD-OHD/research/hd-design-research/调研报告.md`（完整逆向记录）。
