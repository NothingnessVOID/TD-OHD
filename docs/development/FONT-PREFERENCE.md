# 独立中文字体偏好

## 行为与边界

默认使用官方标准版霞鹜新致宋 LXGW Neo ZhiSong v1.067，不使用Plus或Screen。简体、繁体与英文界面中的中文姓名均使用同一中文字体。英文/数字仍优先Inter，serif标题英文仍优先Crimson Pro；字体face限定中文字符范围，图表纯数字和行星符号沿用原字体。

外观窗口在Center Palette与Customize之间提供两个主选项：新致宋、原有字体。字体使用独立`td-ohd-font-v1`存储`{version:1,font:'lxgw'|'original'|'ipa'}`，不进入appearance-v3、SkinRegistry或Skin配色文件。切换Skin/Center Palette/语言、Reset Appearance均不重置。没有存储记录或记录无效时默认lxgw；存储受限时当前页面仍可切换。

index.html在CSS之前恢复data-font。字体使用font-display:swap，首次网络下载未完成时可读回退；不会等待整个中文字库阻塞页面。首次无缓存仍可能发生一次回退到实际字形的切换，这与偏好恢复引起的闪变不同。原字号、字重、间距不变，静态400字体的粗体由浏览器合成。

## 许可与恢复

官方嵌入指南：https://github.com/lxgw/lxgw/blob/main/documents/xizhi_embedding_instructions.md

新致宋是IPA衍生字体。网站保留IPA Font License 1.0、源版本/文件/校验和及可复现转换说明，并在外观字体区域提供“恢复为IPA原始字体”入口。该入口按需加载网站实际提供的IPA原始字体。它与“原有字体（系统中文回退）”是不同操作，后者不承担IPA恢复义务。具体来源、版本与完整许可随`public/fonts/README.html`和资源manifest发布。

IPA原始字体是日文字体，部分汉字字形与中文惯用字形不同；选项说明明确告知。恢复操作无需用户先安装本机字体，不涉及账户同步。

## 实现位置

- `src/lib/font-preference.js`：独立偏好、白名单、通知。
- `src/lib/font-controls.js`及`font-messages.js`：既有选择卡片风格、三语言、实时预览与加载状态。
- `src/styles/fonts.css`：仅字体family轴及新设置区样式；原有模式回到styles.css中的原字体栈。
- `index.html`：首屏偏好与资源CSS，设置区位置。
- `src/main.js`：字体改变后复用已有图表刷新入口，确保已有SVG字体属性更新。
- `src/lib/font-export.js`：按导出内容和unicode-range匹配实际所需同源字体包，生成内联data URL；失败不假装字体已嵌入。

## PNG边界

浏览器视图导出等待字体并嵌入所需分包。出生图SVG图片同样嵌入选定中文face；选择新致宋/IPA时即使存在服务端OG也走本地路径，使设备偏好有效。公共服务端OG和MCP图像仍为独立的固定Inter实现，不读取设备localStorage，本轮未改其渲染器。既有远程Latin字体导出的回退行为不作全新改造。

## 验证入口

`node --test tests/font-preference.test.js`

`E2E_URL=http://127.0.0.1:9961 node tests/font-preference-e2e.mjs`（PowerShell用`$env:E2E_URL`设置）

浏览器脚本通过CDP的CSS.getPlatformFontsForNode确认实际中文字形由自托管字体渲染，并记录resource timing、缓存、恢复、导出和截图。完整结果记录在本轮交付报告中，未运行项不得视为通过。
