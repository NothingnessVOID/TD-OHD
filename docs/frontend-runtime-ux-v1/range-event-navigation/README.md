# 手机 Timeline：Range 回到事件导航上方

基线：`fix/frontend-runtime-ux-v1` / `1d6bbdab0d5127cd056f4df7545772e0db23f6d0`。
本次只调整手机 Range 定位。其余功能、缩放 breakpoint、左下触发按钮与 Advanced 面板 CSS 均保留。

## 最终位置

左下只有 Controls / Advanced。右下 Range 在上，previous / next 在下，右边缘相同，垂直间距 2px。

```css
/* event bottom 由现有 edge 推导；range 始终跟随箭头尺寸。 */
right: max(var(--tl-mobile-edge), env(safe-area-inset-right));
bottom: calc(var(--tl-mobile-event-bottom) + var(--tl-mobile-arrow-size) + var(--tl-mobile-event-gap));
```

390/375/360px 事件组底距仍为 9px。320px 事件组底距微调为 4px（向下 5px），在不改变 range 64×28px 的情况下避开外侧中心。左下按钮和 Advanced 面板完全未动。未增加 toolbar 或普通流高度。

## 尺寸沿用

| viewport | planet scale | control | range | arrow |
|---|---:|---:|---|---:|
| 390×844 | .94 | 40px | 70×30px | 38px |
| 375×667 | .90 | 38px | 68×30px | 36px |
| 360×640 | .86 | 36px | 64×28px | 34px |
| 320×568 | .78 | 34px | 64×28px | 32px |

英文 range 沿用额外 10px 宽度。字号、图标尺寸、行星列整体缩放均未改。

## 验证

`tests/timeline-mobile-layout-e2e.mjs` 删除左下横排/基线断言，改为 Range 在事件导航上方、右边缘对齐、2px 间距、互不碰撞；保留列遮挡、60/40、SVG 原尺寸和浮层不挤占高度测试。新增所有收起控件避开实际九个中心的检查，并确认打开/关闭 Advanced 不移动 Range / arrows。

* 手机 E2E：四档屏宽、简体/英文/繁体 passed。
* production preview 手机 E2E：passed。
* `npm test`：271 passed、0 failed、3 skipped（原默认在线测试）。
* build 及 source/distribution 校验：passed；计算签名 `59b90e629033cc7faf95` 保持。
* 与上一个 HEAD 的几何记录对比：pane、SVG、Advanced 面板、左下 trigger、所有控件尺寸与 scale 精确一致；仅右侧控制组位置改变。见 [validation.json](validation.json)。
* 四档截图已人工查看，没有 Range/列/中心遮挡、控件相撞或横向 overflow。

## 截图

[四档截图页面](index.html)

* [390×844](timeline-390.png)
* [375×667](timeline-375.png)
* [360×640](timeline-360.png)
* [320×568](timeline-320.png)

`timeline-*.png` 使用固定行运时刻 `2026-10-01T06:07:53Z` 和合成出生图 `1990-06-15 14:30 UTC+8`；panel 与长英文/繁体标签截图来自 E2E。没有用户个人资料。

```sh
MOBILE_SCREENSHOT_DIR=docs/frontend-runtime-ux-v1/range-event-navigation node tests/timeline-mobile-layout-e2e.mjs
node docs/frontend-runtime-ux-v1/range-event-navigation/capture.mjs
```

未修改计算、range 逻辑、Knowledge、人物保存、地点搜索、语言或 Sync。未 merge、未部署，8787 未修改。
