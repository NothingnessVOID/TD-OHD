# Engine + Licensing 整合预检

两条工作线已成功组合。分支从生产 `4cc718f2ba6aaadc74b3c4036a0191fa9791d657` 出发，先正常 merge licensing `198b2245a2560ff5228120219d6da7eae5dd1a76`，再 merge architecture `633d7f0853e07dfd1522b389e890184a4d622c63`。两个 merge 均无冲突；没有 squash、cherry-pick，也没有再次单独合并 Jovian 原型。

## 额外调整

没有解冲突代码或生产算法修改。许可验证原先要求整个 package.json 与生产基线逐字节一致，现在只允许 architecture 已增加的两个准确 research/test 命令；其余生产 scripts、依赖、lock 均继续受保护。

许可产物记录重新从当前构建采集，更新 worktree-sensitive 指纹和 metadata ref。这不改变计算基线或许可实质。原许可证验证报告保留历史状态，新结果另存 `docs/release-licensing-v1/integration-validation.json`。线上证据仍通过公开 GET 获取，无认证信息。

## 回归结果

- npm ci、build:pages 通过。仍有既有 Vite chunk-size warning。
- npm test：266 passed，0 failed，3 个既有 online skipped；localization 34/34、timeline 61/61、Modern sharp 专项 5/5。
- 97 UTC × 两引擎 = 194 完整计算图：raw/output 0 change；仅 architecture 已声明的 integration envelope/signature 归一化不计作计算变化。
- C2：321 UTC、8,346 黄经对照，最大黄经及 Design root residual 都是 0。
- Jovian：97 Jovian / 33 myBodyGraph 已保存官方参考、49 负对照、97 mechanics、56 边界 × 5 时间采样、时间语义及 reference integrity 均通过。
- E2E：Sharp 52 时刻 × 13 天体 × 六字段、reference、copy-data、planet、appearance 和 timeline（含手势/mobile touch/layout）均完成通过。Planet 首次 click timeout，未改 UI 或断言，隔离重跑通过；此异常保留在 validation，不隐藏。
- 生产 provider 仍是 `chartEngine = sharpProvider`。CLI/API 默认 Modern，both 返回独立结果。
- 生产检查覆盖 135 发行文件、99 浏览器 source-map 模块：无 Jovian provider、Python、Swiss176 native binary 或 DE406；只有 Modern 运行链、原 DE441 及 notices。
- Engine Signature 仍为 `59b90e629033cc7faf95`；357 个基线保护文件保持，annual / Knowledge 0 change。License distribution、17 个组件/来源组及 object-source 对应验证通过。

本轮工程预检已具备下一步审核 merge main 的条件。许可路线和内容权利的剩余问题没有因此得到法律保证；本轮没有 merge main、deploy、修改 Knowledge 分支、pages 或 8787。

## Knowledge 后续同步

真实历史：`knowledge-layer-v1` 与 `knowledge-content-v1` 均为 `knowledge-access-v1` 的祖先。当前 main 和 access 的共同祖先是 `7734b942160497c1c28d46002de0edd91df53230`；main 独有 8 提交，access 独有 5 提交，双方已公开。

未来 main 稳定后，在独立工作区从 **feature/knowledge-access-v1** 开发一次 **merge main**。保留已公开阶段 1/2/3/4/5 历史，避免 rebase 重写共享提交。届时实际处理 adapter/core/build 的冲突并再次做计算和页面回归，不能把本轮结果当作 Knowledge merge 的验证。

不要分别继续 layer/content，也不要把旧 `feature/knowledge-workspace` 硬合进来。本轮只分析，没有执行同步。

## 证据与复现

`validation.json`、`bundle-inspection.json`、`jovian-regression/` 保存实际结果。`inspect-bundle.mjs` 检查发行文件和临时 sourcemaps。许可 collector 支持 `--metadata-ref integration/engine-license-v1`，仍固定 calculation baseline。

设置 DOTNET、JOVIAN_RUNTIME、JOVIAN_RESEARCH_ROOT 后运行：

```sh
npm ci
npm run build:pages
npx vite build --mode static --sourcemap --outDir /tmp/td-integration-sourcemap
python3 docs/release-licensing-v1/collect.py --sourcemap-dir /tmp/td-integration-sourcemap --metadata-ref integration/engine-license-v1
node docs/release-licensing-v1/validate.mjs
node docs/integration-engine-license-v1/inspect-bundle.mjs
npm test
npm run test:localization
npm run test:timeline
npm run test:sharp
# JOVIAN_VALIDATION_OUTPUT 可以指向此目录下独立 regression 目录，保留旧阶段证据。
npm run test:jovian-compatible
```

完整图 before/after 使用 `scripts/engine-architecture-validation.mjs`，ENGINE_BASELINE_ROOT 指向独立 archive 的原型提交 `1add60c36b469e0d5dc84bd7ca38b0984a446363`。E2E 使用独立 Vite 端口及 Playwright 临时测试浏览器，不 attach 用户浏览器。
