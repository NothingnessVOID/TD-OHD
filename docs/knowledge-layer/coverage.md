# Knowledge Layer V1 Coverage

此表由 scripts/report-knowledge-layer.mjs 根据实际 lookup 生成。计数按知识身份，不把共享引用当独立文章。

| 对象 | 数量 | Summary | Detail | Missing Detail |
|---|---:|---:|---:|---:|
| type | 5 | 5 | 0 | 5 |
| authority | 8 | 8 | 0 | 8 |
| profile | 12 | 12 | 0 | 12 |
| definition | 5 | 0 | 0 | 5 |
| variable | 24 | 0 | 24 | 0 |
| cognition | 6 | 0 | 0 | 6 |
| Cross | dynamic | 0 | 0 | 每个动态身份均缺正文 |

共60个静态身份，25个默认摘要、24个现有详情、36个缺详情。Type另有5个 heroSummary 引用，不算第二篇详情。Authority两种Ego身份共享同一个旧摘要。所有内容仍为unreviewed。

Variable现有正文用于下方说明区，所以登记为Detail；不自动复制为Summary。Definition只有名称；组件数量是计算信息，不冒充知识摘要。Cross没有批量生成空文章。
