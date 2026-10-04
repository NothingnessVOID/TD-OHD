# TD-OHD 第一轮安全分支清理（2026-10）

本轮只删除明确授权的六个已合并临时分支。其余分支只读分类，不实施第二轮删除。

## 基线与核验

- main：`2bc308b7a9037a10bae92fff6c9ff536a276b8ae`
- Knowledge access：`df06686baa855b01a8bbfb3d77cf85b34eaf4717`
- pages：`13c70f2ce4dab5199a2438bfc08475f1cbd23549`
- 已执行 `git fetch --all --prune`；ahead 是分支独有提交数，behind 是 main 独有提交数。
- 每个删除目标同时通过 `git rev-list --left-right --count` 和 `git merge-base --is-ancestor`；删除 push 使用准确旧 SHA lease，避免误删并发新增提交。

## 已删除

| 分支 | 删除前 SHA | ahead | behind | reachable from main | 本地清理 |
|---|---|---:|---:|---|---|
| integration/engine-license-v1 | `64a522bbd184893319e916d7e987562fba442f90` | 0 | 1 | YES | clean 本地分支及对应工作区已删除 |
| chore/release-licensing-cleanup-v1 | `198b2245a2560ff5228120219d6da7eae5dd1a76` | 0 | 6 | YES | clean 本地分支及对应工作区已删除 |
| refactor/engine-architecture-v1 | `633d7f0853e07dfd1522b389e890184a4d622c63` | 0 | 6 | YES | clean 本地分支及对应工作区已删除 |
| feature/jovian-compatible-engine-v1 | `1add60c36b469e0d5dc84bd7ca38b0984a446363` | 0 | 7 | YES | clean 本地分支及对应工作区已删除 |
| fix/sharp-swiss-parity-v1 | `fb5743b87346e8d16810b7c4e15a3e5d01a0f3a9` | 0 | 10 | YES | clean 本地分支及对应工作区已删除 |
| fix/true-node-swiss-parity-v1 | `4cc718f2ba6aaadc74b3c4036a0191fa9791d657` | 0 | 8 | YES | clean 本地分支及对应工作区已删除 |

没有因 ahead > 0 保留的删除目标。工作区未提交文件检查均为空，无运行任务占用；忽略文件仅构建产物和依赖。没有删除任何 dirty 工作区。脱离分支的 integration 验证工作区也已移除，其他未授权工作区保持。

## 剩余分支分类

删除后原有远端分支为 **29** 个；推送本审计分支后为 **30** 个。下表前 29 行来自删除后的真实 Git 快照；本审计分支为新增的一条文档提交，发布后核验 ahead 1 / behind 0。

分类优先级：ACTIVE / SPECIAL / 明确历史用途优先；其余依据 ahead 划分 MERGED-CANDIDATE 与 DIVERGED。因此 KEEP-HISTORY 也可能存在独立提交，不能据类别推断是否已合并。

| Branch | ahead | behind | classification | recommended action | reason |
|---|---:|---:|---|---|---|
| audit/content-sources-phase-1 | 1 | 16 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| audit/licensing-v1 | 1 | 7 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| audit/natal-golden-reference | 1 | 12 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| docs/update-platform-sharp-engine | 0 | 22 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/appearance-skin-foundation | 0 | 29 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/chart-contract-boundary-v2 | 2 | 16 | DIVERGED | 保留，先审查独立提交，禁止自动合并/删除 | 存在 main 尚未吸收的独立提交 |
| feature/copy-chart-data | 0 | 17 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/knowledge-access-v1 | 8 | 0 | ACTIVE | 保留，继续在此基线开发 | 唯一继续使用的 Knowledge 开发基线，已同步稳定 main |
| feature/knowledge-content-v1 | 4 | 16 | KEEP-HISTORY | 保留历史与证据 | 已被 knowledge-access 包含的阶段历史，本轮严格保留 |
| feature/knowledge-layer-v1 | 3 | 16 | KEEP-HISTORY | 保留历史与证据 | 已被 knowledge-access 包含的阶段历史，本轮严格保留 |
| feature/knowledge-workspace | 16 | 104 | DIVERGED | 保留，先审查独立提交，禁止自动合并/删除 | 旧 Knowledge 分叉线，不作为继续开发基线 |
| feature/reference-timeline-v1 | 0 | 43 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/sharp-engine-complete | 0 | 24 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/swiss-engine-migration-prep | 0 | 41 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/timeline-localization | 0 | 112 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/timeline-mobile-workspace | 2 | 107 | DIVERGED | 保留，先审查独立提交，禁止自动合并/删除 | 存在 main 尚未吸收的独立提交 |
| feature/transit-chart-modes | 0 | 130 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/transit-time-timezone | 0 | 128 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| feature/transit-timeline | 2 | 119 | DIVERGED | 保留，先审查独立提交，禁止自动合并/删除 | 存在 main 尚未吸收的独立提交 |
| fix/chart-ui-polish | 0 | 27 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| fix/gene-keys-sequence-line-breaks | 0 | 20 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| fix/shared-bodygraph | 0 | 132 | MERGED-CANDIDATE | 仅报告，等待单独授权 | 全部提交可从 main 到达，但不在本轮删除名单 |
| main | 0 | 0 | ACTIVE | 保留，继续在此基线开发 | 正式主线 |
| pages | 0 | 43 | SPECIAL | 保持，不随普通功能分支清理 | 独立发布分支 |
| personal/custom | 0 | 125 | SPECIAL | 保持，不随普通功能分支清理 | 个人定制分支，独立用途 |
| prep/sharp-swiss-upstream-v1 | 1 | 8 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| research/jovian-design-discriminator-suite-v1 | 6 | 12 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| research/jovian-discriminator-suite-v1 | 4 | 12 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| research/ra-era-astronomy-stack | 2 | 12 | KEEP-HISTORY | 保留历史与证据 | 研究、审计或上游准备证据 |
| chore/branch-audit-2026-10 | 1 | 0 | KEEP-HISTORY | 保留审计，不 merge | 本轮唯一新增分支，仅文档 |

### Knowledge 基线

`feature/knowledge-access-v1` 是唯一继续使用的 Knowledge 开发基线。layer / content 作为阶段历史保留，均在 access 历史内。workspace 是旧分叉线，禁止自动合并或删除。

### 重要分叉

四个 DIVERGED 分支均保留。Knowledge access 虽领先 main 8 提交，但已包含完整 main，属于 ACTIVE，不是待合并的旧分叉。research / audit / prep 的独立提交继续按证据用途保留。

## GitHub 与运行状态

- 清理前后比对全部 hosted refs：只少了授权的六个目标，其余旧分支 SHA 全部一致。
- main、Knowledge access、pages 未变化；三个严格保留的 Knowledge 历史分支未变化。
- Sharp upstream PR #3 仍为 OPEN；head `052835c94c43650b2a9985110cbb9f404d346600`、base `342a57997c1b987e7949acc98897c8b73d05939a` 清理前后一致。TD-OHD 分支删除不涉及上游 fork 的 PR head。
- 8787 原 listener 保持，进程使用独立安装目录，不依赖已移除 worktree；未改安装或数据。
- GitHub Pages 只监听 pages push；未 push main/pages，未触发手工 deploy。Netlify 无 Git 构建关联，published deploy 未变。
- 审计分支相对 main 仅新增 `docs/branch-audit-2026-10/` 文档和结构化证据；没有计算、Knowledge 内容或配置修改。

## 停止点

本轮不实施第二轮删除，不 merge 审计分支，不删除其他分支。完整分支 SHA 和计数见 branches.json。
