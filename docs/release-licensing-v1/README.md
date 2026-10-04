# Modern production 发布许可材料收尾 V1

本轮补齐已公开 Modern 浏览器版本的第三方许可文本、更新修改声明，并建立产物、源码、构建材料的对应清单。没有决定 TD-OHD 总许可证，也没有改变计算逻辑。

Modern 仍包含经过 TD-OHD 修改的 AGPL SharpAstrology.SwissEph。给其它 MIT 组件补通知，不会改变这层许可边界。新增 Base MIT、html-to-image MIT、.NET runtime MIT/第三方 notices、Tensors MIT/第三方 notices、完整 ICU notices，以及实测被编入浏览器的 Vite modulepreload helper 通知。原有 HumanDesign、SwissEph、Swiss 数据、Unforced Dev、hdkit 通知继续保留。

现在可以从 `release-components.json` 的线上/本地产物哈希，追到 `production-identity.json` 的计算基线、NuGet 源码提交、八项修改文件和构建项目。没有宣称整套构建与线上字节完全相同：本机环境和 fingerprint 可不同。

目前仍缺最终组合发行许可的决定、部分内容权利确认，以及适用商业授权/Swiss 数据授权的确认。这是一份工程材料检查，不是“完全满足 AGPL”的结论。当前证据没有新增必须立即停站的明确高风险事实；也不构成无需进一步处理的保证。

Jovian 历史引擎未进入当前 browser production，本轮不发布、不修改它。计算源码、年缓存、Knowledge 和页面布局保持不变。Engine signature 仍为 `59b90e629033cc7faf95`。

## 文件和复现

- `release-components.json`：17 个 runtime 组件/来源组，部分来源组对应同一产物，不是 17 个独立程序集。
- `production-identity.json`：计算发布基线 `4cc718f2ba6aaadc74b3c4036a0191fa9791d657`、来源哈希、许可文件路径。metadata commit 从 Git 读取；不把自身尚未生成的提交 SHA 填进自身内容。
- `artifact-evidence.json`：公开 HTTP GET 证据、本地资源及静态 sourcemap 的 npm 模块路径；无账号、cookie、token、用户资料。
- `source-correspondence.md`、`source-materials.md`、`runtime-notices.md`、`open-items.md`：对应关系、可恢复材料、原始通知来源和剩余事项。
- `validation.json`：实际测试结果。

```sh
npm ci
npm run build:pages
# 可通过 DOTNET 指向可用的 .NET 10 SDK；首次需要浏览器 WASM workload。
npx vite build --mode static --sourcemap --outDir /tmp/td-release-sourcemap
python3 docs/release-licensing-v1/collect.py --sourcemap-dir /tmp/td-release-sourcemap
node docs/release-licensing-v1/validate.mjs
npm test
npm run test:localization
npm run test:timeline
```

`collect.py` 读取无认证的公开网站并重新生成观察记录；网站更新时应检查变化，不自动把新站点当作本轮基线。License 文件的来源/哈希已登记，现有 build 原样复制整个 license 目录。验证会在 Base 等必要 notice 缺失、copy 内容不符、manifest 缺项、源码/缓存变化时失败。

没有 merge main、deploy、修改 pages 或 8787。
