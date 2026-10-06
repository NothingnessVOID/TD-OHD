# 主线收束与 Knowledge 同步

正式 main 已通过 PR #14 合入 Engine / Licensing integration，保留 merge commit 和原有历史。随后将稳定 main 正常 merge 到现有 `feature/knowledge-access-v1`，保留其五个已发布阶段提交。本轮没有开展新 Knowledge 内容开发。

## main

- PR：https://github.com/NothingnessVOID/TD-OHD/pull/14
- HEAD：`2bc308b7a9037a10bae92fff6c9ff536a276b8ae`
- main 与已验证 integration 的文件树完全一致。
- post-merge：npm test 266 passed、0 failed、3 existing skipped；localization、timeline、engine contract、build:pages、许可分发/来源验证和实际 bundle 检查通过。
- Modern 默认，Engine Signature `59b90e629033cc7faf95`；年度缓存和计算源未改变。

合并前读取了真实部署配置：GitHub Pages workflow 只监听 pages；Netlify td-ohd 未配置 Git provider/repository/build branch。main merge 没有自动部署，也没有手工部署。原 Netlify published deploy 为 `6ac0eaf1429158875f2ec893`。

## Knowledge merge

只有两处文本冲突：

1. package.json：保留 Knowledge E2E 命令及 main 的本地研究/验证命令。
2. sharp-provider.js：采用 `sharp:${ENGINE_SIGNATURE}:adapter-v2`，同时保留当前 Modern 引擎身份与阶段 2 出生契约版本，避免旧缓存丢失新增字段。

没有改变计算算法、知识正文、页面布局、summary/detail 隔离、来源审核状态或知识访问 API。旧 knowledge-layer、knowledge-content、knowledge-workspace 分支未修改，也未将 workspace 纳入合并。

## 同步所需验证适配

共享 TransitCore 新增的 ConnectedComponents JSON 序列化会影响原来整文件的年度签名。`transitCalculationSource()` 仅规范化这段确切、已审核的出生序列化增量及其注释，其他全部字节继续参与签名。完整当前序列化源码哈希另列在 presentation-scope.json；没有固定计算偏移或伪造计算结果。专项测试证明它恢复原签名，并且其他数值代码变化仍被签名检测。

许可验证器保留旧 calculation baseline，额外用已发布 Knowledge commit 的准确 blob hashes 核验已有展示/adapter 迁移。Sharp provider 的允许版本由 main blob 只替换 adapter-v1 → adapter-v2 得出。没有扩大为任意 src 变更豁免。33 个既有文件被明确追踪，357 个原基线文件仍受保护。新的发行文件哈希从当前构建重新采集；历史整合报告保持不变。

阶段 2 的五个定义 fixture 使用的 Swiss 计算早于 main parity 修复。保留同一 UTC 和五类 Definition 覆盖，刷新其 raw 数值并记录当前 Engine Signature；断言没有放宽。

## 回归证据

- 97 个 UTC：Personality / Design 全部 Gate、Line、Color、Tone、Base、longitude 及旧结构字段与 main 完全一致。仅新增原有 connectedComponents 字段；97 个行运快照完全一致。
- Knowledge：npm test 296 passed、0 failed、3 existing online skipped；localization、timeline、Knowledge 专项、engine contract、许可验证及 build:pages 通过。
- 实际浏览器 bundle 无 Jovian provider、DE406、Python 或历史 native runtime，生产入口仍是 sharpProvider。
- 浏览器对照采用已发布 Knowledge HEAD 源码的临时副本，并明确使用相同当前 Modern WASM 和年度缓存身份。这样比较既有 Knowledge 的 DOM/文本/几何；天文准确性另由上面的独立 main native 对照验证。
- 12 组 Foundation/Variable 文本与几何对照、24 组 BodyGraph DOM/文本/几何对照、详情 timing 和 owner transitions、复制数据 E2E 通过。
- 首次测试服务未就绪、构建热更新影响模块状态，以及旧基线缓存身份造成一分钟 timing 差异，均保留记录；稳定服务与对齐缓存身份后重新运行，未放宽测试断言。

最终机器结果见 validation.json、modern-regression.json 和 browser reports。构建/测试临时文件、浏览器会话和本机绝对路径没有加入报告。

## 下一步

Knowledge 现在可以在同步后的 access 分支继续开发，但本轮到同步和验证为止。main 不包含本次 Knowledge 同步改动。未修改 root license、fork 关系、8787 安装；未删除旧分支或 research 分支。
