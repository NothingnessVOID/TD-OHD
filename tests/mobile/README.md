# 睡眠图手机专项验收（touch）

针对集成版睡眠图（单人 + 双人合盘）的**手机验收**脚本。它不替代桌面套件，只回答桌面浏览器答不了的问题：360/390 CSS px 下手指够不够得着、滑动会不会误开卡片、详情卡会不会溢出屏幕、长按能不能预览、三语和明暗皮肤下页面是否还装得下。

## 运行

```bash
./node_modules/.bin/vite --host 127.0.0.1 --port 10015 --strictPort     # 一个终端
E2E_URL=http://127.0.0.1:10015 node tests/mobile/dream-mobile-acceptance.mjs
```

| 环境变量 | 作用 | 默认 |
| --- | --- | --- |
| `E2E_URL` | 被测服务地址 | `http://127.0.0.1:10015` |
| `MOBILE_SHOTS` | 截图目录（**不要**放进仓库） | `/tmp/mobile-acceptance-shots` |
| `CHROME_PATH` / `CHROME_CHANNEL` | 浏览器可执行文件 / 通道 | Playwright 自带 chromium |

退出码 0 才代表全部通过；末尾会打印 `{ base, devices, shots, checks, failures }` 的 JSON 摘要。stdout 重定向到文件即为原始运行日志。

## 输入真实性

- 点按：`page.touchscreen.tap()`（Playwright 真实触摸输入）。
- 滑动 / 长按：CDP `Input.dispatchTouchEvent`（`touchStart → touchMove… → touchEnd`），走浏览器自己的触摸管线。
- **不用** `dispatchEvent` 伪造 DOM 事件来模拟手指。
- 唯一非手势动作是 `scrollIntoView()`，只用于把目标滚进视口再点它；被检验的动作始终是真实手势。
- 设备：`Pixel 7` 描述 + `hasTouch/isMobile`，视口 360×800 与 390×844，`timezoneId: UTC`，`locale: zh-CN`（语言检查内部再切）。

## 覆盖

单人（每个设备各一遍）：

1. 页面无横向滚动（文档与 `#dream-view` 各自检查）。
2. 全部 15 个闸门都有命中圆，最小命中直径记录在日志；抽 3 个分散闸门真实点按，卡片必须是被点的那一个。
3. 闸门卡片：**行星块排在六爻之前**、没有清醒阅读外壳（`.gate-lens-switch` / `.reference-links`）、有梦境解读、卡片横向不越界。
4. 中心卡片可开可关；卡片里的闸门链接进入后，返回键回到中心。
5. 夜域通道行（`.dream-channel-open`）可点开通道卡，行高不小于 40px。
6. 两个类型 chip（清醒/梦境）各开各的卡（`data-type` 对应）。
7. 闸门 pin → 列表行 `.row-lit` 同步；关闭后清零。
8. 在图上手势滑动只滚页、不开卡；页面确实滚动了。
9. 长按 → 浮层出现在手指上方、位于图内、不越界；松手后浮层消失（松手等同点按，会开卡，脚本记录并关闭）。
10. 浮层里的闸门名必须是梦境名（见“已知状态”）。
11. 比较模式进入无横向溢出。
12. 合盘闸门卡报“谁携带”，不含清醒阅读外壳。
13. 两位人物的睡眠类型入口各带自己的 owner 与姓名标签。
14. 离开视图再回来：无卡片、无浮层、无残留高亮。
15. 三种语言（zh-CN / en / zh-Hant）无横向溢出、副标题不为空。
16. 深色与高对比皮肤无横向溢出，并记录文字/底色。
17. 全程无 pageerror / console error。

## 已知状态（基于集成版 `c76d005f`）

上一次运行：**31 项通过 / 3 项失败**，三项都已有定位，不是脚本问题：

1–2. `the preview speaks the sleep design's own gate name`（两台设备各一次）——
   浮层仍然用清醒目录名：实测 `第 1 闸门 · 创造（乾为天）`，而睡眠设计里 1 号闸门叫「喜悦」。
   这是**命名接线尚未落地**的预期失败：`renderBodygraph` 已支持 `opts.naming`，等睡眠页传入后此检查应转绿。

3. `leaving and returning leaves no sheet, overlay or lit row behind`（390×844）——
   离开视图再回来时，页面上残留一个已经打开的浮层（实测内容 `骶骨中心未定义`）。
   原因已抓到事件证据：Chrome 在触摸点按后会把**兼容性 hover** 以 `pointerover` + `pointerType:"mouse"`
   重新投放到最后触点所在位置，视图重绘后那个坐标正好落在新的骶骨中心上，于是渲染器把它当成真实鼠标悬停。
   代码里 CSS 侧早就承认这件事（`@media (hover: none)` 里专门关掉 hover 圆环），JS 侧的 `pointerover`
   预览还没有同样的判断。最小修法（约 3 行，`src/bodygraph.js`）：用
   `matchMedia('(hover: none)')` 判定无悬停能力时忽略 hover 预览，触摸一律走按下预览路径。
   **本次不修**（本分支只放测试），等父代理决定归谁改。

## 不覆盖

- 真机（iOS Safari / Android 硬件）、真机 Safari 的触摸行为。
- 双指缩放、系统级滚动回弹、横屏。
- 读屏（VoiceOver / TalkBack）、动态字号、强制颜色模式。
- 桌面宽度（桌面套件 `graph-hover-tooltip-e2e.mjs` 覆盖）。

## 证据

截图写到 `MOBILE_SHOTS`（默认 `/tmp/mobile-acceptance-shots`），每次运行覆盖：`<设备>-gate-sheet.png`、`-long-press.png`、`-composite.png`、`-en.png`、`-zh-Hant.png`、`-default-dark.png`、`-high-contrast.png`。按约定**不入库**。
