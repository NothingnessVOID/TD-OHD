# UI Polish Phase 1 — 基础系统改进

分支 `feature/ui-polish-phase1`，起点 `9af6ec8`，提交 `a228a95`。
本机 9961 已更新（buildMode=desktop，installed-release.json 记 a228a95）。

## 做了什么

新增一层共享设计 token，并在出生图页、行运页的常用组件上实际接入。刻意选取与现有渲染值相同的档位，所以大部分改动是**零视觉变化的 token 化**，真正可见的变化只有三处，见下。

### Token 位置

放在 `src/styles.css` 的 `:root`，不是 `src/styles/skins/default.css`。理由：

`default.css` 文件头自己声明它是 Skin 语义层（"Site and Human Design skin values live in separate token files"），而字号、间距、圆角不随 Skin 变化。放进 skin 文件会让后来新增皮肤的人误以为要逐个重定义。`styles.css` 原本就放着 `--max-width`、`--header-height`、`--radius`、`--radius-lg`，是这套值的既有归属地。

### 三套尺度

| 类别 | 值 |
| --- | --- |
| 字号 `--font-size-*` | xs 11 / sm 12 / md 13 / base 14 / lg 16 / xl 18 / 2xl 20 / 3xl 24 / 4xl 32（px） |
| 间距 `--space-*` | 1 4 / 2 8 / 3 12 / 4 16 / 5 20 / 6 24 / 8 32 / 10 40（px） |
| 圆角 `--radius-*` | xs 4 / sm 6 / base 8 / md 10 / lg 12 / xl 16 / full 999（px） |

`--font-size-base` 是 14px，与原有正文一致。

## 与原方案的三处偏离

**1. Token 不放在 skin 文件。** 见上。

**2. 字号档位按项目真实阶梯定，不用 12/14/16/18/20/24。** 实测 `styles.css` 的分布是 11px×23、12px×38、13px×36、14px×23，还有 12.5px×18 和 13.5px×8 两个半档。若按原方案把 `--text-sm` 定为 14px、`--text-base` 定为 16px，套用后全站正文会从 14px 变 16px，字号整体放大，那不是「替换硬编码」而是重设版面。改按现有阶梯取值后，替换不改变任何渲染尺寸。

**3. 圆角沿用 `--radius` 作为可被皮肤覆盖的入口。** 这是本轮最需要记下的一条：`new-warm-paper` 皮肤有意覆盖 `--radius: 2px` 和 `--radius-lg: 3px`，做它的锐纸边。若组件规则改读 `--radius-base`，就绕过了这个覆盖，该皮肤的卡片会从 2px 被拉回 8px。所以组件规则一律继续读 `--radius`；`--radius-base` 只是同值的命名档位。

## 三处可见变化

1. **Panel tab 字号 12px → 13px。** 原 12px 是面板里最小的文字，手机上偏难读，属于真实的可用性问题。
2. **Panel tab 圆角 6px → `max(2px, calc(var(--radius) - 3px))`。** 轨道内边距 3px，原来内层 6px 比外层 8px 减去 3px 还圆，内圆角大于应有的同心值。现在默认皮肤得 5px，纸张皮肤得 2px，内外关系都正确。
3. **胶囊类 chip/pill 从零散的 16/18/20/999px 归到 `--radius-full`。** 这些元素高度在 26–40px 区间，该值下渲染圆角与原来一致。

## 覆盖的组件

panel tabs 与 panel content、foundation 卡片、center-card、channel/gate 行、表单字段、主次按钮、导航链接、行运日期选择器、行运完成卡、闸门详情正文与 keynote、chip、pill、popover、modal 表面。

## 明确没动

- 任何 `--bg`、`--bg-elevated`、`--bg-card`、`--text`、`--text-secondary` 等底色/文字色 token（`default.css` 无任何 diff）
- 人体图 SVG 尺寸与位置
- 动画时长与缓动函数
- 12.5px / 13.5px 两个半档（留待下一阶段统一）

## 验证

- `npx vite build --mode static` 与 `--mode desktop` 均通过。
- 11 个已注册 Skin 全部核对：10 个常规皮肤为 8/12px，new-warm-paper 保持 2/3px，无一处覆盖被破坏。
- 改动前后截图做像素差：`panel-desktop`、`panel-mobile` 差异 0.000%，整页图的差异 bbox 精确落在 Tab 条上（`chart-desktop` 0.038%、`chart-mobile` 0.118%）。
- `tests/i18n.test.js` 12/12 通过。

## 未执行与已知限制

- `npm run build`（含 `build:engine`）在本机失败：`spawnSync dotnet ENOENT`，这台机器未装 .NET SDK。属既有环境限制，本次未触碰引擎与任何计算文件，历次本机更新也同样用 `npx vite build --mode desktop` 跳过引擎重编译。已核对基线在无改动时 `tests/localization.test.js` 同样报该错（4 pass / 1 fail），非本次引入。
- 9961 有本机密码锁，跨过它的页面级验证需要你的密码，未代为输入。线上仅确认：服务 200、`/api/local/health` 正常、加载的是新产物 `index-uE989miP.css`（含 `--font-size-md: 13px`）、控制台无报错。
- 未跑全量回归与手机真机，按项目当前「预览优先」的阶段约定留到你确认方向之后再跑。

## 回滚

```bash
launchctl bootout gui/501/com.unforced.open-human-design
APP="/Users/abyssldx/Library/Application Support/OpenHumanDesign/app"
B="/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/rollback-before-a228a95"
rm -rf "$APP/dist" && cp -a "$B/dist" "$APP/dist"
cp "$B/src/styles.css" "$APP/src/styles.css"
cp "$B/installed-release.json" "$APP/installed-release.json"
launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.unforced.open-human-design.plist
```

## 证据

`artifacts/ui-polish-phase1/`（被 .gitignore 忽略，仅本机留档）

- `before/`、`after/`：chart、tabs、panel、transit 的桌面 1440 与手机 390 截图
- `compare/tabs-desktop.png`、`compare/tabs-mobile.png`：并排对比
- `compare/tabs-zoom-3x.png`：Tab 条 3 倍放大对比
- `before-metrics.json`、`after-metrics.json`：计算样式逐项对照
