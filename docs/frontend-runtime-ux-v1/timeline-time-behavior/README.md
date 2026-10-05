# Timeline 自然年度与“现在”复用

本次基线为 `d1e2e8bae92f2f5dd1466025e1fa976033b2f93d`，继续 `fix/frontend-runtime-ux-v1`。只改变两个时间行为和必要的跨度上限；手机布局、计算引擎、Knowledge、人物、地点、Sync、语言均不变。

## 自然年度

以当前 IANA timezone 的选中日期为基准，先做日历年移位，再求当地日期边界。范围始终是 `[start, end)`。

* 未来一年：`2026-10-05` → `[2026-10-05 当地日开始, 2027-10-06 当地日开始)`。
* 过去一年：`2026-10-05` → `[2025-10-05 当地日开始, 2026-10-06 当地日开始)`。
* Feb 29 的周年日期钳制到 Feb 28，exclusive end 再取下一当地日期开始。
* DST 午夜缺口取该日期第一个实际时刻；跳过日期取下一个存在日期的开始。复用原有 `localDayBoundary()`。

没有用 365／366 个固定 24 小时做年度运算。原 1／3／7／30／90／180 天规则保持原样。

## 最大跨度证据

完整年度最多包含 367 个日历日期。纽约 `2023-11-04` 的未来一年，跨闰日和秋季 fold，实际跨度为 `367 天 + 1 小时`，已经超过原来的 `367 * DAY`。

历史极端例：Apia `1891-08-01` 至 `1892-08-02` exclusive，包含闰日与 1892 年 24 小时回拨，恰好 **368 个实际日**。因此最小必要上调为 `368 * DAY`，多 1ms 仍拒绝。同步与异步计算器均有边界测试。

[audit-span.py](audit-span.py) 对本机 2026c-rearguard TZif 的 598 个时区、1800–2200 范围内显式 transition 作了只读扫描；370 天以内最大累计 offset 后退为 24 小时。记录见 [span-audit.json](span-audit.json)。未来 POSIX 重复规则没有在此辅助脚本逐年枚举；测试另用运行时 JS/ICU 确认真实 Apia 范围与现代 DST／闰日案例。审计脚本不参与产品运行。

发布保护只授权 `core.js` 中这一常量和说明变化，其余内容与原 main 基线逐字比较。没有调整时间扫描、天体计算或边界精度。

## “现在”复用

先检查已完成结果的 `result.start <= now < result.end`。

* 已可见：只移动选中游标并刷新当时的图表快照。
* 在结果内、当前视口外：通过已有 `selectTime` / `clampWindow` 将同跨度视口移到 now，保留 result、timelineRange 和缩放程度。
* 未被结果覆盖／没有完成结果：沿用当前 preset，从 now 建立新范围并计算。

浏览器测试同时计数 `aria-busy=true`（包含 client cache hit 的计算调用）和实际 Timeline worker 请求，防止仅比较最终范围而漏掉无效重算。没有给生产代码添加测试计数器。

## 验证

| 检查 | 结果 |
|---|---|
| preset 单元测试 | 10 passed：UTC、上海、纽约 DST、Feb 29、跳过日期、午夜缺口、历史 24h 回拨、368 天及上限 +1ms |
| `npm run test:timeline` | 63 passed，0 failed |
| `npm run test:localization` | 34 passed，0 failed |
| `npm test` | 276 项：273 passed，0 failed，3 skipped（原有在线测试默认跳过） |
| `npm run build` | passed；原有 large-chunk 提示保留 |
| `tests/timeline-e2e.mjs` | passed：自然年度真实计算、可见 Now 零重算、180 天缩放／平移／Now、两次缩放跨度保留、start 包含、end 排除及超出范围重算 |
| `tests/timeline-gestures-e2e.mjs` | passed |
| `tests/timeline-mobile-touch-e2e.mjs` | passed |
| `tests/timeline-mobile-layout-e2e.mjs` | passed：320／360／375／390、三语言、60/40、SVG、行星缩放、Range 右下箭头上方、Advanced 开关尺寸稳定 |

干净重建后重新运行完整单元测试、Timeline 主流程 E2E 与发布保护，全部通过；21 个已审阅前端文件、380 个受保护基线文件，计算签名仍为 `59b90e629033cc7faf95`。过程中恢复了被 iCloud 标为 dataless 的工作树／Git 文件，并隔离了临时构建残留，未将残留纳入提交。

浏览器使用隔离 Chromium、合成出生资料、5230 开发预览。没有操作用户资料、8787、部署或 main。
