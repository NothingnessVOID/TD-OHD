# TD-OHD 前端重设计 · 工作交接文档

> 写给接手的 agent。本文档覆盖：项目状态、分支结构、已完成工作、待办事项、
> 用户的硬性要求与设计偏好、外部扒取资产的位置、环境与工具注意事项。
> 交接时间：2026-10-26 凌晨。上一任执行者：butter（毛毛）。

---

## 一、项目与仓库状态

### 仓库位置（git worktree 布局）

主仓库源在 `~/Desktop/OH-WorkSpace/td-ohd-local-update/source`，通过 git worktree
挂了多个分支目录。**本项设计工作全部在这个 worktree 里：**

```
~/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34/
```

- 分支名：`design/sheet-column-v1`
- 远端：`https://github.com/NothingnessVOID/TD-OHD.git`（origin）
- 已合并到官方 main 最新（`12b9705`，PR #40，2026-10-25 合并，无冲突）

### 本分支提交历史（新→旧）

```
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
- 回滚备份都在 `td-ohd-local-update/rollback-before-*` 目录。

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

位置：`~/Desktop/OH-WorkSpace/资料/hd-design-research/`

- `gate-texts.json` — 64 闸门：name / titleKeynote / keynote / desc（英文长文）
- `cross-descs.json` — 192 轮回交叉：name / gates / desc（验证过：Demo 盘
  cross=177 = "Right Angle Cross of The Sphinx (2/1 | 13/7)" ✓）
- `cross-names.json` — 192 交叉 id→名称速查
- `cross-orientations.json` — 三种角度（Left/Right/Juxtaposition）官方说明
- `channel-texts.json` — 36 通道：name / keynote / desc（额外收获）
- 提取脚本：`extract-gates.js`、`extract-texts.js`（输入 mbg-app.js）

---

## 三、待办事项（按优先级）

### P0 · 轮盘尺寸适配（用户最新反馈，2026-10-26 凌晨提出）

用户原话：「圆形的轮盘这个窗口不能太大，之前说 2/3 可能太大了，它还是要
适配窗口大小。」

现状问题：轮盘 SVG 是 `width:100%; height:auto`，2/3 栏宽 920px 时轮盘就有
920px 高，超出视口。修法方向：给 `#chart-view .mandala-container svg.md-root`
加视口高度约束（类似 `max-height: calc(100dvh - var(--header-height) - 48px)` +
`width:auto; max-width:100%`，SVG 会按 1:1 比例自动收缩居中），或参考人体图的
`graphFitBudget`/`armNatalFit` 机制做正式适配。2/3 的栏宽比例可以保留或收敛，
以「轮盘完整落在一屏内」为准。

### P0 · 无头浏览器截图故障（环境问题，未解决）

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

### P1 · 三个皮肤方向等用户选定

用户说「三个都做一下我看一下」→ 已做成真皮肤。等用户在外观面板（或截图）里
看过之后选一个，然后把选中的方向写回 `default.css`（替换现在的琥珀晨光/暮色），
其余两个方向皮肤可以保留或删除，问用户。

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

- 变量箭头 = B 款短粗箭头（CSS 绘制，一行四个）
- 回路 = 带描边色点，主导回路描墨环，并列时都保留环
- 化身十字 = 数字放大 + 罗盘式呈现，不要四格象限平铺
- 定义计数条方案已通过
- 皮肤默认亮暗整套重做已授权

---

## 五、外部扒取资产总目录

### `~/Desktop/OH-WorkSpace/资料/hd-design-research/`（永久存档）

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
3. playwright-core 只在项目目录里能 require（`cd branches/chart-dashboard-issue34`）
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

1. 修无头截图（重启 Chrome/机器，或换 playwright 自带 chromium）
2. 做 P0 轮盘尺寸适配（max-height 约束），截图自查后发给用户
3. 催用户看三个皮肤方向（外观面板里现在有：朱砂宣纸、朱砂宣纸·夜、
   鎏铜青瓷、鎏铜青瓷·夜、墨韵朱印、墨韵朱印·夜），选定后写回 default.css
4. 用户验收后再考虑：轮盘交互深化、文案接入、是否合并回 main

有问题查 `~/Desktop/OH-WorkSpace/资料/hd-design-research/调研报告.md`（完整逆向记录）。
