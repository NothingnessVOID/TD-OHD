# 独立只读报告审查

审查对象：`<LOCAL_HOME>/Documents/Projects/TD-OHD-golden-reference-audit-2026-10-02/README.md` 与 `golden-cases.json`。未修改正式报告、正式 fixture、生产仓库或 8787 安装。

## 结论

所指定的七例判断、表格值、官方分钟切换区间和 5473 记录计数均核对通过。未发现会改变七例结论的数据错误。一个较小的精度呈现问题建议在交付前调整，另有一个统计说明可选补充。DE441 与 DE431 的新增诊断仍由另一 agent 处理；本审查不裁定该项或全部最终根因。

## 核对结果

1. 七例固定为 G1995-feb、G1995-jun、G2005-jul20、G2015-tight、G2015-feb、G2025-tight、G2025-mar。逐项对照官方浏览器结构化摘录的全部 26 项，以及 8787 浏览器全部 26 项，再与 fixture 的 baseline/expected 对照，均一致。
2. 七例全部只在 Personality Sun 与 Personality Earth 两项 Gate.Line 上出现差异。各 Gate 不变，Jovian 比当前 TD 更早进入下一爻；其余 24 项均一致，包括设计侧全部 13 项。因此报告“人格侧差异、设计侧一致”的判断有数据支持。
3. Profile 在七例中均等于 Personality Sun Line / Design Sun Line；正式 fixture、官方 Properties 与当前 Native/Profile 配对没有冲突。
4. README 主表、Earth 表、太阳双精度黄经/Design UTC/solar arc/C258 表均与 fixture 和原始 Native 扫描一致。README 将 Design UTC 截到三位毫秒，完整数字仍保存在 JSON；这是显示精度收敛。
5. 七例 local→UTC 都经独立 Python zoneinfo 验证；两例 BST 正确减一小时，其中 G1995-jun 正确跨到前一 UTC 日期。
6. 七例均有前一分、当前分、后一分官方记录。前一分钟保留旧爻，当前分钟和后一分为新爻。因此官方根的 `(前一分钟, 当前分钟]` 区间正确；与 TD 根相减得到 `[当前分后余秒, 60 + 该余秒)`，报告的开闭区间方向正确。正文没有把官方根伪装成秒级测量。
7. 5473 = 90 + 150 + 120 + 20 + 39 + 7×(121+601)，是保存并校验的记录条数。独立重新读取这些具体文件得出 5473，Profile 配对不一致数为 0。若按 UTC 去重，则为 **5339 个 UTC**，所以它不等于 5473 个独立出生时刻。
8. 1918 全年 Personality 边界、169 January Design 边界均与扫描文件记录数一致。官方 fixture 是45条记录、40个唯一UTC，其中7条 mismatch、14条 neighbor、24条 control-or-repeat，计数正确。重复 UTC 的完整 expected 无相互冲突。
9. 1995 April Design residual 最大 7.300834795e-6度已被正确保留为另一项求根精度限制，未用它解释出生人格太阳差异。

## 建议调整

### 较小的精度问题：JSON 偏移范围应与毫秒输入量化一致

`golden-cases.json` 的七例 `boundary.shiftEarlierThanSharpLowerBoundSeconds` / `...UpperBoundSeconds` 保留六位小数，例如 G2015-tight 为 0.271045 / 60.271045；但同一记录的 `sharpTransitionUtcMilliseconds` 与 README 均只报告毫秒，生产 Swiss provider 的 FromUtc 也舍弃亚毫秒 ticks。六位小数来自 binary-search bracket上界，无法被解读为亚毫秒天文精度。

建议将这些秒差字段输出到三位小数，并保持上界 exclusive（或增加明确字段说明原值仅为 bracket bookkeeping，真实报告精度为1ms）。正文表格的 0.271 至小于60.271 已经遵循这个要求。此问题不会改变七例 mismatch，也不会改变官方一分钟切换区间。

### 可选澄清：5473 为含重叠样本的记录数

README 已使用“记录”措辞，因此当前不是错误。可以顺带补“按UTC去重为5339个时刻”，防止以后将窗口秒级/分钟级重叠和候选重叠当成独立样本数。

## 审查数据

检查结果保存于 `/tmp/td-ohd-golden-audit/report-review-checks.json`，包含逐例判断、统计和具体源文件计数。

审查时文件 SHA256：

- README.md：99eba80135ac5054a0404d7a8906067c9ecbbe1f58cffdbe7ee2a73a054f87fa
- golden-cases.json：9ee911b519e92ee729f26d0fbdfd900732c3b277d8dbc5b4094c101fc608dd23
