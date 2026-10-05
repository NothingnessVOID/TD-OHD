# Round 2E UI Polish / Bug Fix

## 基线与交付

实际基线：`686a5966bd5c36f37dd4a80f5c51786c4f847a31`，来自远程 `feature/knowledge-ui-refinement-v1`。
独立分支：`fix/knowledge-ui-polish-v1`。预览：<http://127.0.0.1:5209/?d=2000-05-10&t=12%3A30&tz=8>。
本轮不合并 main，不部署，不调整本机 8787 安装。最终提交身份以该分支 Git HEAD 为准，避免在提交内写入自身 SHA。

## 1. Shared Back

Knowledge 内部按钮、事件选择器和焦点选择器统一使用 `.gate-detail-back`。runtime 中 `knowledge-back` 为 0；没有复制 Back CSS。现有标题避让规则增加嵌套 Knowledge 标题选择器，仍共用 142px padding 规则。
同 modal 的 Cross → Basics → Back、locale refresh、close 后 history 清空保持不变。实际 computed background/border/radius/font/padding/hover 与 Planet → Gate 标准 Back 一致；英文和繁中、桌面和手机标题均不覆盖按钮。

## 2. Planet Detail

仅删除三个按 Design/Personality/Transit 区分的 detail-label CSS override，标签继承全局 `--accent`。interactive gate/focus/hover 继续沿用现有主题规则。
来源文字、data-source、BodyGraph 红黑、行星列、tooltip 和实际数据来源颜色不变。三种来源均验证自定义 Accent `#6851a8`；该颜色只用于测试，不写入产品 CSS。

## 3. Hover

`.knowledge-trigger:hover` 使用 `--accent-soft`，与 `.foundation-clickable:hover` 一致。Type、Strategy、Authority、Profile、Definition、Cross、Variable slot/arrow-card 都验证实际颜色变化；宽高不变。保留 focus-visible，加 120ms 背景/边框过渡，无 transform。

## 4. Cross Panel

删除旧 inline Basics summary，在现有四 Gate 卡后增加 Basics 跳转卡。直接打开 `hd.cross.introduction`，无需先打开具体 Cross。四 Gate 的 showGateDetail/wireRowHover 未改变，Gene Keys 区域保持原样。

## 5. 追加：Cross 四激活 → Gate

四 activation 改成真正的 button，保留现有卡片视觉，提供 aria-label、accent-soft hover 和 accent focus。顺序不变：人格太阳、人格地球、设计太阳、设计地球；显式传递 side/planet，不重算 Gate/Line。
Knowledge controller 发出内部 `ohd-open-knowledge-gate` 事件；chart 在释放 Knowledge dialog owner 后压入 synthetic Knowledge return item，调用原有 `showGateDetail(gate, false, source)`。
`goBack()` 只增加 Knowledge 返回分支，恢复 query/context 并聚焦原 activation。两种 history 保持独立，没有反向 import chart，没有复制 Gate renderer。
验证人格太阳 Enter、设计地球 Space：正确 Gate、正确来源与太阳/地球文字高亮、同 `#gate-detail` 返回、原卡焦点恢复。鼠标点击由原生 button click 同一处理器支持。旧 Channel → Gate → Back 回归通过。

## 6. Dead locale keys

删除 zh-CN / zh-Hant 各三个 key：

- Shared Cross introduction
- Specific Cross detail is unavailable.
- View Cross introduction in the library

删除前全仓搜索仅命中 locale 定义，未发现运行时、旧测试或 fixture 依赖。英文使用身份 key fallback，无对应字典项可删。删除后 src 引用为 0。新测试中保留 key 名，仅用于验证删除范围。没有扩大翻译清理。

## 7. 保护与验证

165 个三语言 Reviewed summary/detail SHA-256 全部不变。Engine、Adapter、Calculation、geometry、四箭头 mapping 未改。
showGateDetail / showTransitChannelDetail / showCenterDetail / showPlanetDetail / decorateBodygraphDetail / appendTiming / appendActivations 未改。goBack 属于追加需求允许的导航适配。
旧 whole-style guard 调整为精确 CSS 差异断言；goBack 的旧分支也有精确差异 guard，没有取消实质保护。source scope 只增加这次七个获准 UI 文件。

测试记录见 `round2e-polish-validation.json`。初次浏览器运行遇到外部字体等待、选择器同时命中页面和 modal、英文 uppercase，以及 Vite 热更新后动态 import 产生独立模块状态；分别限定 selector/使用 locale 真实标签、屏蔽外部字体并重启预览服务后重跑。最终没有产品失败项。

## 8. 页面与范围

主页内容、信息密度和布局不变；只改变 Hover。Cross tab 按要求将摘要替换为跳转卡。具体 Cross modal 四激活新增按钮交互。没有知识正文修改、新页面、新 renderer、计算调整、关系/团队改动。

## 9. 完整修改文件

- `docs/frontend-knowledge-sync-v1/validate.mjs`
- `docs/knowledge-layer/review-round2e-polish.md`
- `docs/knowledge-layer/round2e-polish-scope.json`
- `docs/knowledge-layer/round2e-polish-validation.json`
- `src/lib/knowledge/detail-access.css`
- `src/lib/knowledge/detail-controller.js`
- `src/lib/knowledge/detail-renderer.js`
- `src/locales/zh-CN/ui-chart.json`
- `src/locales/zh-Hant/ui-chart.json`
- `src/styles.css`
- `src/views/chart.js`
- `tests/appearance-skin-e2e.mjs`
- `tests/knowledge-polish-e2e.mjs`
- `tests/knowledge-polish.test.js`
- `tests/knowledge-refinement-e2e.mjs`
- `tests/knowledge-round2d.test.js`
- `tests/knowledge-round2e.test.js`

## 10. 未解决项

本轮范围内无。三个可选在线测试因未启用 OHD_ONLINE_TESTS 跳过，不涉及本轮 UI 验收。生产构建现有 chunk-size 提示保留，不扩大范围拆包。

## 追加 UI 修复：闸门顶部激活行对齐

用户反馈行星符号与激活文字垂直错位。共享 `.tl-activation-glyph` 原为 1.08em / line-height:1；现改为 1em / line-height:inherit，并 align-self:start，长文字换行时仍对齐第一行。只改 CSS，不改详情 DOM、来源色、计算或正文。

浏览器实测：出生图 Gate 52 的太阳、水星，以及行运和时间轴 Gate 48 的太阳，glyph/identity/value 均同一 y，行高和高度均 21.45px。全量测试并行首次出现两个 C# harness build 失败，单独构建及串行运行同一全量测试后通过：338 total / 335 passed / 0 failed / 3 skipped。生产构建通过。
