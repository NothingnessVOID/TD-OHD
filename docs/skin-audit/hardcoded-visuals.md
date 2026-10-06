# 硬编码视觉值

## 统计口径

下表穷举当前第一方 SPA、Worker/本机与静态资源中具有视觉语义的颜色字面量源码行，排除集中 Token 文件。**一行计一处**，一行多个色只算一处；包含内嵌色阶、派生公式锚点、fallback、skin swatch、分享图 palette，不声称每处都是缺陷或必须 Token 化。无语义的 URL fragment、Markdown 标题不计。集中 palette 字面量已在 Token 表中记录。内嵌 favicon 的 URL 编码在扫描时解码，证据保留原行。

全仓文本扫描（含测试、文档、工具）的原始命中及所有运行视觉属性见 `scan-evidence.json`；测试期望、历史审计和演示指针不能混入生产缺陷数。CSS/HTML/JS/SVG 采取静态扫描，不执行代码；动态模板不把几何 `d` 或 SVG ID 当成颜色。

## 运行时硬编码候选

| 位置 | 表面 | 当前整行值 / 上下文 |
|---|---|---|
| [index.html:12](../../index.html#L12) | SPA | ` <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M16 3 29 16 16 29 3 16Z%27 fill=%27none%27 stroke=%27%23c8781d%27 stroke-width=%272%27/%3E%3C/svg%3E"> ` |
| [src/features/transit-timeline/timeline.css:4](../../src/features/transit-timeline/timeline.css#L4) | SPA | ` --tl-transit: color-mix(in srgb, var(--hd-transit) 75%, #445457); --tl-transit-ink: var(--hd-transit-on); ` |
| [src/lib/appearance-controls.js:27](../../src/lib/appearance-controls.js#L27) | SPA | `` return rgb?.length === 3 ? `#${rgb.map(x => Math.round(x).toString(16).padStart(2,'0')).join('')}` : '#ffffff'; `` |
| [src/lib/appearance.js:36](../../src/lib/appearance.js#L36) | SPA | ` style.setProperty('--accent-on', (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 150 ? '#16130f' : '#ffffff'); ` |
| [src/lib/human-design/svg-renderer.js:31](../../src/lib/human-design/svg-renderer.js#L31) | 服务端/本机 | ` personality: '#262220', ` |
| [src/lib/human-design/svg-renderer.js:32](../../src/lib/human-design/svg-renderer.js#L32) | 服务端/本机 | ` design: '#c0392b', ` |
| [src/lib/human-design/svg-renderer.js:33](../../src/lib/human-design/svg-renderer.js#L33) | 服务端/本机 | ` inactive: '#eae5df', ` |
| [src/lib/human-design/svg-renderer.js:34](../../src/lib/human-design/svg-renderer.js#L34) | 服务端/本机 | ` undefinedCenter: '#ffffff', ` |
| [src/lib/human-design/svg-renderer.js:35](../../src/lib/human-design/svg-renderer.js#L35) | 服务端/本机 | ` centerStroke: '#cfc7be', ` |
| [src/lib/human-design/svg-renderer.js:36](../../src/lib/human-design/svg-renderer.js#L36) | 服务端/本机 | ` gateTextActive: '#ffffff', ` |
| [src/lib/human-design/svg-renderer.js:37](../../src/lib/human-design/svg-renderer.js#L37) | 服务端/本机 | ` gateTextInactive: '#a39a90', ` |
| [src/lib/human-design/svg-renderer.js:38](../../src/lib/human-design/svg-renderer.js#L38) | 服务端/本机 | ` columnText: '#1a1714', ` |
| [src/lib/human-design/svg-renderer.js:40](../../src/lib/human-design/svg-renderer.js#L40) | 服务端/本机 | ` head: '#e9d56b', ajna: '#a3c46c', throat: '#c2a06b', ` |
| [src/lib/human-design/svg-renderer.js:41](../../src/lib/human-design/svg-renderer.js#L41) | 服务端/本机 | ` g: '#e9d56b', heart: '#dd6356', spleen: '#c2a06b', ` |
| [src/lib/human-design/svg-renderer.js:42](../../src/lib/human-design/svg-renderer.js#L42) | 服务端/本机 | ` solar: '#c2a06b', sacral: '#dd6356', root: '#c2a06b' ` |
| [src/lib/human-design/svg-renderer.js:47](../../src/lib/human-design/svg-renderer.js#L47) | 服务端/本机 | ` personality: '#cfc7bb', ` |
| [src/lib/human-design/svg-renderer.js:48](../../src/lib/human-design/svg-renderer.js#L48) | 服务端/本机 | ` design: '#e05545', ` |
| [src/lib/human-design/svg-renderer.js:49](../../src/lib/human-design/svg-renderer.js#L49) | 服务端/本机 | ` inactive: '#28241f', ` |
| [src/lib/human-design/svg-renderer.js:50](../../src/lib/human-design/svg-renderer.js#L50) | 服务端/本机 | ` undefinedCenter: '#1e1c18', ` |
| [src/lib/human-design/svg-renderer.js:51](../../src/lib/human-design/svg-renderer.js#L51) | 服务端/本机 | ` centerStroke: '#3a3630', ` |
| [src/lib/human-design/svg-renderer.js:52](../../src/lib/human-design/svg-renderer.js#L52) | 服务端/本机 | ` gateTextActive: '#16130f', ` |
| [src/lib/human-design/svg-renderer.js:53](../../src/lib/human-design/svg-renderer.js#L53) | 服务端/本机 | ` gateTextInactive: '#6f685f', ` |
| [src/lib/human-design/svg-renderer.js:54](../../src/lib/human-design/svg-renderer.js#L54) | 服务端/本机 | ` columnText: '#e8e4de', ` |
| [src/lib/human-design/svg-renderer.js:56](../../src/lib/human-design/svg-renderer.js#L56) | 服务端/本机 | ` head: '#bfa94e', ajna: '#7a9c52', throat: '#9c7f53', ` |
| [src/lib/human-design/svg-renderer.js:57](../../src/lib/human-design/svg-renderer.js#L57) | 服务端/本机 | ` g: '#bfa94e', heart: '#b54a40', spleen: '#9c7f53', ` |
| [src/lib/human-design/svg-renderer.js:58](../../src/lib/human-design/svg-renderer.js#L58) | 服务端/本机 | ` solar: '#9c7f53', sacral: '#b54a40', root: '#9c7f53' ` |
| [src/lib/human-design/svg-renderer.js:153](../../src/lib/human-design/svg-renderer.js#L153) | 服务端/本机 | ` ? (opts.theme === 'dark' && personality.has(g) ? theme.gateTextActive : '#ffffff') ` |
| [src/lib/human-design/svg-renderer.js:213](../../src/lib/human-design/svg-renderer.js#L213) | 服务端/本机 | ` const bg = dark ? '#141210' : '#faf8f5'; ` |
| [src/lib/human-design/svg-renderer.js:214](../../src/lib/human-design/svg-renderer.js#L214) | 服务端/本机 | ` const cardBg = dark ? '#1e1c18' : '#ffffff'; ` |
| [src/lib/human-design/svg-renderer.js:215](../../src/lib/human-design/svg-renderer.js#L215) | 服务端/本机 | ` const text = dark ? '#e8e4de' : '#1a1714'; ` |
| [src/lib/human-design/svg-renderer.js:216](../../src/lib/human-design/svg-renderer.js#L216) | 服务端/本机 | ` const subtext = dark ? '#9e978e' : '#6b6560'; ` |
| [src/lib/human-design/svg-renderer.js:217](../../src/lib/human-design/svg-renderer.js#L217) | 服务端/本机 | ` const accent = dark ? '#d4943a' : '#9a5e1c'; ` |
| [src/lib/human-design/svg-renderer.js:221](../../src/lib/human-design/svg-renderer.js#L221) | 服务端/本机 | ` 'Generator': '#b98e2f', ` |
| [src/lib/human-design/svg-renderer.js:222](../../src/lib/human-design/svg-renderer.js#L222) | 服务端/本机 | ` 'Manifesting Generator': '#c96f1e', ` |
| [src/lib/human-design/svg-renderer.js:223](../../src/lib/human-design/svg-renderer.js#L223) | 服务端/本机 | ` 'Manifestor': '#b3422f', ` |
| [src/lib/human-design/svg-renderer.js:224](../../src/lib/human-design/svg-renderer.js#L224) | 服务端/本机 | ` 'Projector': '#2471a3', ` |
| [src/lib/human-design/svg-renderer.js:225](../../src/lib/human-design/svg-renderer.js#L225) | 服务端/本机 | ` 'Reflector': '#6c7a7b' ` |
| [src/lib/human-design/svg-renderer.js:272](../../src/lib/human-design/svg-renderer.js#L272) | 服务端/本机 | ` const bg = dark ? '#141210' : '#faf8f5'; ` |
| [src/lib/human-design/svg-renderer.js:273](../../src/lib/human-design/svg-renderer.js#L273) | 服务端/本机 | ` const text = dark ? '#e8e4de' : '#1a1714'; ` |
| [src/lib/human-design/svg-renderer.js:274](../../src/lib/human-design/svg-renderer.js#L274) | 服务端/本机 | ` const subtext = dark ? '#9e978e' : '#6b6560'; ` |
| [src/lib/human-design/svg-renderer.js:275](../../src/lib/human-design/svg-renderer.js#L275) | 服务端/本机 | ` const accent = dark ? '#d4943a' : '#9a5e1c'; ` |
| [src/lib/human-design/svg-renderer.js:279](../../src/lib/human-design/svg-renderer.js#L279) | 服务端/本机 | ` 'Generator': '#b98e2f', ` |
| [src/lib/human-design/svg-renderer.js:280](../../src/lib/human-design/svg-renderer.js#L280) | 服务端/本机 | ` 'Manifesting Generator': '#c96f1e', ` |
| [src/lib/human-design/svg-renderer.js:281](../../src/lib/human-design/svg-renderer.js#L281) | 服务端/本机 | ` 'Manifestor': '#b3422f', ` |
| [src/lib/human-design/svg-renderer.js:282](../../src/lib/human-design/svg-renderer.js#L282) | 服务端/本机 | ` 'Projector': '#2471a3', ` |
| [src/lib/human-design/svg-renderer.js:283](../../src/lib/human-design/svg-renderer.js#L283) | 服务端/本机 | ` 'Reflector': '#6c7a7b' ` |
| [src/styles/appearance-controls.css:20](../../src/styles/appearance-controls.css#L20) | SPA | ` .classic-swatch { background: linear-gradient(90deg,#e9d56b 0 25%,#a3c46c 25% 50%,#c2a06b 50% 75%,#dd6356 75%); } ` |
| [src/styles/appearance-controls.css:21](../../src/styles/appearance-controls.css#L21) | SPA | ` .chakra-swatch { background: linear-gradient(90deg,#a38abb,#7579aa,#6e9fbe,#79a889,#d4ba63,#cf9561,#bd7169); } ` |
| [worker/auth.js:47](../../worker/auth.js#L47) | 服务端/本机 | `` `<p><a href="${url}" style="display:inline-block;background:#c47a2a;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px">Sign in</a></p>`, `` |
| [worker/auth.js:48](../../worker/auth.js#L48) | 服务端/本机 | ` '<p style="color:#777;font-size:13px">This link works once and expires soon. If you didn’t request it, you can safely ignore this email.</p>', ` |
| [worker/mcp.js:320](../../worker/mcp.js#L320) | 服务端/本机 | ` #w svg{width:100%;height:auto;display:block;border-radius:12px;background:#fff} ` |
| [worker/mcp.js:321](../../worker/mcp.js#L321) | 服务端/本机 | ` #w img{max-width:100%;height:auto;display:block;margin:0 auto;border-radius:12px;background:#fff} ` |
| [worker/mcp.js:322](../../worker/mcp.js#L322) | 服务端/本机 | ` .ph{font:14px/1.5 system-ui,-apple-system,sans-serif;color:#8a8a8a;padding:28px;text-align:center} ` |
| [worker/mcp.js:323](../../worker/mcp.js#L323) | 服务端/本机 | ` a{color:#b8763e} ` |
| [worker/oauth-ui.js:20](../../worker/oauth-ui.js#L20) | 服务端/本机 | ` body{font-family:Inter,system-ui,sans-serif;background:#faf8f5;color:#1a1714;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0} ` |
| [worker/oauth-ui.js:21](../../worker/oauth-ui.js#L21) | 服务端/本机 | ` .card{background:#fff;border:1px solid #e5e0da;border-radius:14px;padding:36px;max-width:400px;width:90%;box-shadow:0 8px 24px rgba(0,0,0,.08)} ` |
| [worker/oauth-ui.js:22](../../worker/oauth-ui.js#L22) | 服务端/本机 | ` h1{font-size:20px;font-weight:600;margin:0 0 6px} p{color:#6b6560;font-size:14px;line-height:1.55} ` |
| [worker/oauth-ui.js:23](../../worker/oauth-ui.js#L23) | 服务端/本机 | ` input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e5e0da;border-radius:8px;font-size:14px;margin:10px 0} ` |
| [worker/oauth-ui.js:24](../../worker/oauth-ui.js#L24) | 服务端/本机 | ` button{width:100%;padding:11px;background:#c47a2a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer} ` |
| [worker/oauth-ui.js:25](../../worker/oauth-ui.js#L25) | 服务端/本机 | ` button:hover{background:#a86520} ` |
| [worker/oauth-ui.js:26](../../worker/oauth-ui.js#L26) | 服务端/本机 | ` .scopes{background:#faf8f5;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:13.5px} ` |
| [worker/oauth-ui.js:28](../../worker/oauth-ui.js#L28) | 服务端/本机 | ` .muted{font-size:12px;color:#9e9790;margin-top:14px} ` |
| [worker/oauth-ui.js:29](../../worker/oauth-ui.js#L29) | 服务端/本机 | ` .ok{color:#27ae60;font-size:13.5px;display:none} ` |
| [worker/oauth-ui.js:91](../../worker/oauth-ui.js#L91) | 服务端/本机 | ` <a href="${esc(verifyHref)}" style="display:block;text-align:center;text-decoration:none;padding:11px;background:#c47a2a;color:#fff;border-radius:8px;font-size:14px;font-weight:600">Sign in to Open Human Design</a> ` |
| [worker/seo.js:100](../../worker/seo.js#L100) | 服务端/本机 | ` :root{--bg:#faf8f5;--card:#fff;--sunken:#f0ede8;--text:#1a1714;--soft:#6b6560;--line:#e7e1d8;--accent:#9a5e1c;--accent2:#c47a2a} ` |
| [worker/seo.js:104](../../worker/seo.js#L104) | 服务端/本机 | ` header.site{border-bottom:1px solid var(--line);background:rgba(250,248,245,.9);position:sticky;top:0;backdrop-filter:blur(6px)} ` |
| [worker/seo.js:127](../../worker/seo.js#L127) | 服务端/本机 | ` .cta a{display:inline-block;margin-top:10px;padding:11px 20px;background:var(--accent);color:#fff;border-radius:10px;font-weight:600} ` |
| [worker/seo.js:128](../../worker/seo.js#L128) | 服务端/本机 | ` .cta a:hover{text-decoration:none;background:#84511a} ` |

## 非颜色的固定视觉参数

以下不计入硬编码颜色数，但仍与皮肤一致性有关；完整 opacity、阴影、focus、SVG 属性均有机器证据。

- `src/bodygraph.js:247`：中心 radialGradient 的 cx=.5、cy=.36、r=.78；双方条纹 8×8 / 45°，行运条纹 10 与 4 的尺寸固定。
- `src/bodygraph.js:389`：临时定义中心 fill-opacity=0.5，未接入独立 Token；其余 inactive channel、circle、hatch opacity 已有 Token。
- `src/lib/human-design/svg-renderer.js`：分享 SVG 的 channel opacity=.4、stroke-width=1.5/1、字号 11/26 等独立于互动 BodyGraph。
- `src/styles.css` 与 `src/features/transit-timeline/timeline.css`：hover/dim、阴影几何、border/outline 宽度、transition/keyframe alpha 与字号大量为局部规格。
- `src/lib/view-share.js:60`：导出时强制 opacity=1 / animation=none，是截图确定性处理，不是 Skin 的常规值。

## 候选性质

- 分享图 palette、SEO/登录/邮件：独立模板确有视觉输出，当前不继承 SPA 用户设置。
- swatch：preset 示意，而非随用户 override 重绘。
- `color-mix()` 中的 white / #16130f / #445457 / #111516：固定计算锚点。
- 对比色与 input fallback：仍属于字面量，但不能直接归并成一个“白色 Token”。
- SVG none / transparent / currentColor：绘制/继承语义，不能作为缺失彩色 palette 自动修复。
