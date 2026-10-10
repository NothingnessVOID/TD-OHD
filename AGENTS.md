# TD-OHD development agreement

## Local environment and preview

- Use Node.js 24 and the .NET 10 SDK. In Windows PowerShell, prefer `npm.cmd`.
- Keep user-facing development and built preview on **port 9961**. Bind to `0.0.0.0` for the user's trusted LAN; local access is `http://127.0.0.1:9961/`, remote access is `http://<host-LAN-IP>:9961/`.
- Do not configure public port forwarding, disable firewall protections, or set unrestricted Vite host allow-lists. Private research under `docs/handoff/` is denied by the dev server.
- `npm.cmd run dev` starts development; `npm.cmd run build:pages` then `npm.cmd run preview` serves the static build.
- Both servers use `strictPort`. Do not silently fall back to another port or run both at once.
- If 9961 is occupied, identify the process before stopping it. Prefer reusing or stopping this project's own preview; preserve unrelated applications and unsaved work.
- Browser profiles are origin-specific. Keep one consistent address per browser; localhost and LAN-IP libraries do not automatically synchronize.
- Preserve LF line endings. Engine signatures hash file contents, so automatic CRLF conversion can change generated signatures without a logic change.

## Parallel implementation

- Authorized implementation tasks that need edits, installs, tests or commits start in fresh `write`-permission instances. Do not reuse a historical read-only research instance for development.
- Give each implementation task its own branch/worktree and explicit file ownership. Keep shared API changes coordinated.
- Isolated worktree services use assigned loopback-only ports; reserve 9961 for the user's current shared preview.
- Preserve failed test evidence; do not weaken assertions to hide failures.

## Iteration and user acceptance (current instruction)

- During active UI/feature iteration, run only necessary builds and obvious startup/error checks. Do not repeatedly run full suites, smoke tests or complete browser regression.
- Integrate the feature into the 9961 preview so the user can first accept the direction, functionality and interaction.
- Run comprehensive automated tests and full browser regression only after the user confirms that acceptance. Previously recorded test results remain historical evidence, not proof that the current integration is fully tested.
- The user has confirmed LAN access works; do not keep changing firewall settings to solve an already-resolved access request.
- This preview-first workflow does not authorize merging to `main` or deploying.

## Git synchronization

- The user requests a commit and push to a development branch after each completed, validated development increment, so another computer can continue the work.
- Current shared development branch: **`dev/windows-development`**.
- Before work, inspect the current branch and worktree and fetch remote updates when available. Preserve existing uncommitted work. If histories diverge, investigate before integrating.
- Commit only intended changes with a clear message. Apply the current phase's checks (build/error checks before user acceptance; comprehensive tests afterward) and explicitly report deferred or failed checks.
- Push the development branch without force and confirm its remote commit matches local `HEAD`.
- Do not push directly to `main`, merge to `main`, publish, or deploy without separate explicit authorization. `main` updates trigger the production GitHub Pages workflow.
- If authentication or a non-fast-forward push blocks synchronization, report it; do not rewrite remote history to bypass the problem.

## Test data

- Use clearly labeled fictional people for development fixtures.
- Never commit actual personal birth records, credentials, local databases, browser profiles, or local storage dumps.
- Keep reusable import fixtures outside `public/`; do not auto-seed production builds or overwrite existing people.

## 架构、组件复用与设计统一规范

本节适用于 TD-OHD 的所有后续开发，包括新功能、维护、重构以及 AI Agent 执行的开发任务。
详细规范见 docs/development/ENGINEERING_STANDARDS.md。

### 1. 优先复用，避免重复造轮子

新增功能前，必须先检查项目中是否已经存在类似的组件、工具函数、样式、数据接口或交互机制。
优先级依次为：

1. 直接复用现有实现。
2. 合理扩展现有组件或接口。
3. 从多个相似实现中提取共用基础层。
4. 确实无法合理复用时，才创建独立实现。

不能仅仅因为重新写一套更方便，就忽略已有系统。
但也不能为了复用而制造过度抽象，或者强行合并不同的业务机制。
原则是优先统一，而不是禁止新建组件。

### 2. UI 组件与交互统一

相同类型的界面元素，应尽可能使用统一的基础组件和视觉规范。
包括：

- 页面布局
- 信息卡片
- 标题与副标题
- 弹窗和底部抽屉
- 按钮及图标按钮
- 表单与选择器
- 标签与状态提示
- 空状态与错误提示
- 滚动容器
- 导航、返回、关闭和跳转

统一不仅指颜色相似，还包括尺寸、间距、圆角、阴影、交互行为、手机适配和可访问性。
允许不同功能拥有不同的业务内容和必要的特殊布局。

### 3. Skin 设计系统

所有新 UI 必须兼容项目已有的 Skin 系统。
颜色、背景、边框、阴影、焦点状态等，应优先使用现有语义化 CSS 变量。
不得在已有对应变量时直接硬编码颜色。
需要增加新的颜色语义时，应先检查现有 Token，再决定是否扩展统一设计系统。
必须考虑所有已注册 Skin，包括明暗主题及高对比度模式。

### 4. 多语言与术语统一

普通界面文字通过 src/lib/i18n.js 等已有多语言机制管理。
专业人类图术语通过 src/lib/vocabulary.js 等统一词汇接口读取。
例如闸门、通道、中心、卦名、行星、回路、人生角色等，不应在各个页面自行写死显示名称。
内部计算和数据引用使用稳定 ID，不使用翻译后的显示文字作为对象身份。

### 5. 知识资料同源

出生图、行运、关系图、Penta、Wa 等功能应共享原有的人类图基础知识。
不得为了新功能复制一套普通闸门、通道或中心的解释正文。
不同分析场景可以拥有独立的激活数据和专属解读，但共同资料必须保持统一来源。

### 6. 数据上下文明确

可复用组件必须明确接收当前业务场景所需的数据。
例如 Penta 闸门详情，不能隐式读取当前出生图人物的激活数据。
共享展示组件不代表共享所有业务状态。
修改 UI 时不得擅自改变计算规则、稳定 ID、数据存储契约或资料审核状态。

### 7. 响应式与可访问性

新增 UI 需兼容：

- 桌面与手机
- 现有全部 Skin
- 简体中文、繁体中文、英文
- 键盘与触控操作
- 焦点、返回、Escape、关闭和滚动行为

不能仅凭一张桌面截图认定功能完成。

### 8. 代码维护

尽量减少重复 CSS、过时选择器、重复事件监听和功能相同的平行实现。
创建或提取有复用价值的组件时，应更新：
docs/development/UI_COMPONENT_INVENTORY.md
优先进行小范围、可验证的重构，避免无关的大规模修改。

### 9. 开发验收

每次涉及 UI 或架构的修改，应说明：

- 复用了哪些现有实现。
- 新增了哪些组件，以及为什么需要新增。
- 是否兼容 Skin、多语言和统一术语。
- 是否保持数据上下文独立。
- 已经验证哪些功能。
- 还有哪些内容没有验证。

具体测试节奏、预览、提交和部署限制继续遵守本文件其他章节。
以上是长期架构原则，不是永久固定的文件路径或 CSS 类名。未来允许优化实现，但应保持这些原则。
