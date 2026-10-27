# Default Skin Auto

Branch: `fix/default-theme-auto`. Baseline commit: `12b9705`.

## 动机与核实到的原行为

TD-OHD 的 Skin Picker 长期保留一张 Auto 卡，文案为 Follow system / 自动，选择后由 `onSystemSchemeChange` 跟随系统明暗切换。但这张卡只对主动点过它的人生效。`initAppearance()` 在函数开头把 `skinMode` 基线设为 `'manual'`，然后读取 legacy `bodygraph-theme`，用 `defaultSkinForMode(legacyMode)` 解析出初始 Skin。也就是说，首次访问其实已经按 `prefers-color-scheme` 选出了 Amber Dawn 或 Amber Dusk，但模式字段留在 manual，并在初始化末尾的 `persist()` 里立即写入 v3 存储。

结果是系统跟随只发生一次，而且发生在一个用户从未选择手动皮肤的时刻。第二次访问时 v3 已存在，`skinMode` 从存储读回 manual，系统明暗变化不再触发任何切换；Picker 高亮的是具体的琥珀晨光或琥珀暮色，而不是自动。对一台白天用浅色、夜里切到深色的机器来说，这个效果和手动钉死没有区别。本次改动只修正这个初始基线，不新增 UI，也不新增文案：Auto 卡片与三语文案原本就已完备。

## 精确改动点

唯一的行为改动在 `src/lib/appearance.js` 的 `initAppearance()` 内，位置是读完 v3 存储之后、进入 `saved?.version === 3` 分支之前：

```js
  // A fresh profile follows the system; a stored v3 or legacy theme choice stays explicit.
  if (!savedTheme && saved?.version !== 3) skinMode = 'auto';
```

`DEFAULT_SITE_SKIN`、`setTheme()`、`setSiteSkin()`、`getSkinId()` 的兜底、`persist()` 的字段集合与字段顺序、Skin Registry、Picker 与任何 CSS 都没有改动。`persist()` 本来就会写入 `skinMode`，所以新增的这一行不需要任何存储侧配合，初始化末尾的保存自然把 `'auto'` 落盘。

## 三条初始化分支的语义

有效 v3 存在时，新行条件为假，`skinMode` 仍由 v3 分支按存储值决定，`'auto'` 只在用户显式选过 Auto 时出现，其余一律回落 manual。已有明确选择的用户完全不受影响。

没有 v3 但存在 legacy `bodygraph-theme` 时，`savedTheme` 为真，条件同样为假，于是保持 manual 加 `defaultSkinForMode(savedTheme)`。这是旧版显式明暗选择的迁移路径，不能被 Auto 覆盖，否则老用户会发现自己的深色设定变成了跟随系统。

两者都不存在时属于全新访客，或者 localStorage 不可用，此时 `skinMode` 被评为 `'auto'`，随后第 121 行的 `if (skinMode === 'auto') skinId = resolvedSystemSkin();` 解析出当前系统 Skin，`persist()` 写入 `skinMode:'auto'`。此后的系统明暗变化会持续通过 `onSystemSchemeChange` 生效，直到用户主动选一张具体皮肤。

## 为何本次不动 resetAppearance()

`resetAppearance()` 固定回到 Amber Dawn、manual 与 skin-default 到 Mineral，是 `docs/APPEARANCE-RESET-AMBER-DAWN.md` 记录并经过人工确认的契约。重置的语义是"回到一个确定可见的默认外观"，如果让它跟随系统，同一台机器在不同时刻点重置会得到不同的结果，验收和人工复核都会失去稳定基准。

这就留下一个真实的语义分叉，本次不擅自裁决：全新访客默认跟随系统，而重置的用户回到固定的 Amber Dawn。两者都能自圆其说，取决于产品更看重"默认贴合环境"还是"重置必须可预测"。这里仅将其记录为待用户裁决的开放问题；无论结论如何，都不影响本次初始化改动本身的正确性。若要统一，改动会落在 `resetAppearance()` 与 §8 文档，属于另一次变更。

## 对现有用户的影响

已有有效 v3 存储的人不会看到任何变化，包括曾经显式选择过 Auto 的人，以及所有手动选过具体皮肤的人。改动只对真正的全新访客与清空过 localStorage 的设备生效：这类设备首次初始化得到 Auto，并且此后持续跟随系统明暗。legacy `bodygraph-theme` 的迁移同样不受影响。

一个已知的边缘情形：用户手动选了 Amber Dawn（即 `skinId:'default-light'`、`skinMode:'manual'` 写进 v3）之后再清空 localStorage，初始化会回到 Auto。此时系统若为深色，页面显示 Amber Dusk 而不是 Amber Dawn。这是"没有偏好就跟随系统"的直接推论，不是迁移缺陷：清空存储等于清空偏好。

## 已验证与未验证

已用 `node --test` 覆盖三条分支与自动跟随：`tests/appearance.test.js` 中原先断言 `skinMode:'manual'` 的首个用例改为 `'auto'`，并新增一个用例，自带可控的 `matchMedia` mock，可翻转 `matches` 并手动触发 change 回调，断言无存储且系统为深色时得到 `default-dark` 加 Auto、写入存储的 `skinMode` 为 `'auto'`、回调触发后 Skin 随系统切换且模式仍为 Auto、有效 v3 的 manual 加 high-contrast 不被翻成 Auto、legacy `bodygraph-theme:'dark'` 保持 manual 加 `default-dark`。现有 `withBrowser` 的实现签名未改，其他用例不受影响。

同时执行了 `node --test tests/appearance-preferences.test.js tests/font-preference.test.js`（11 项全过）与 `node --test tests/skin-presets.test.js tests/appearance-contract.test.js`（13 项全过），确认存储字段顺序、迁移、Reset 与 Picker 契约都没有被这一行初始化改动波及。

`npm test` 在当前 worktree 有 45 项失败，全部来自环境而非本次改动：worktree 没有安装依赖（缺失 `ajv`、`rollup`、`vite`、`@noble/hashes`、`@modelcontextprotocol/sdk`），本机没有 .NET 10 SDK（`spawnSync dotnet ENOENT`，共 28 项），以及 macOS 的 `/var` 临时目录触发了私有路径保护的既有断言。外观、皮肤、字体与 Picker 相关的用例在这些失败之外全部通过。

未验证的部分：没有运行任何 `*-e2e.mjs` 浏览器回归，因此 Picker 在真实页面上的高亮状态、系统明暗真实切换时的视觉过渡，以及三语言下 Auto 卡片文案的实际呈现，都只有单元级证据。没有构建产物验证，也没有占用 9961 预览端口做人工查看。上面那 45 项环境失败也没有在这种干净环境里重跑确认。`tests/fixtures/skin-reviewed-scope.json` 属历史冻结存档，其对应测试被 `scripts/run-functional-tests.mjs` 排除在 `npm test` 之外，本次未改该 fixture。
