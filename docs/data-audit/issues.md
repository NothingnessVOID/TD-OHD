# 资料问题与待核清单

本表区分结构检查、明确纠错与尚未核实的内容。原始资产 `artifacts/data-audit/raw-reference.json` 由脚本只读导出，SHA-256 为 `e65b779ab9b3860258ad5366bbe7e2d4798bfba92e3cae13994bb24702ccd50d`，未公开提交。机器检查结果见 [`structure.json`](structure.json)：9 中心、36 通道、64 闸门、4740 个字段类型，结构错误 0；10/20/34/57 各有三个通道伙伴，不能仅凭单一 `harmonic` 字段导航。

| ID | 原字段／发现 | 依据与判断 | 处理、影响及状态 |
|---|---|---|---|
| Q-01 | 原 `GATE_DESCRIPTIONS[*].quarter` 仅有 Mutation/Civilization/Duality，数量 19/25/20；3 号闸门为 Mutation。与四个各 16 闸门的象限不符，逐点对照有 41 项错位。 | [Jovian Archive 术语表](https://jovianarchive.com/pages/human-design-dictionary)明确四象限各 16 个连续闸门；[Jovian Archive 象限边界](https://jovianarchive.com/products/incarnation-crosses-by-profile)列出 13–24、2–33、7–44、1–19。按锁定引擎轮盘顺序 `GATE_ORDER` 展开；[第一象限闸门清单](https://humandesignhub.app/zh/library/quarter-1)包含 3 号闸门。[亚洲人类图学院](https://humandesign.org.cn/courses/%E4%B8%93%E4%B8%9A%E5%88%86%E6%9E%90%E5%B8%88%E5%9F%B9%E8%AE%AD%EF%BC%9A%E4%BA%BA%E7%B1%BB%E5%9B%BE%E5%85%AD%E9%98%B6%E8%BD%AE%E5%9B%9E%E4%BA%A4%E5%8F%89ptl3/)使用“启蒙象限”。 | 已确认并在 `src/lib/quarter.js` 和 `src/lib/content.js` 修正显示读取；原引擎、译文 JSON、正文与哈希保留。影响化身十字象限显示，不改排盘、年度索引或缓存签名。64 项覆盖及语言切换有独立测试。 |
| P-01 | `gate-lines.js` 的 384 条爻线解释。 | 源文件头注释明确说明这是闸门能量与六爻通用特质的*原创综合文字*，并非 Jovian Archive／Ra Uru Hu 原句。 | 已确认内容性质；现有文字照原样展示。逐条解释是否符合体系仍待核，不作原典声明。 |
| P-02 | `hexagram-descriptions.js` 的易经文字。 | 源文件头注释说明是现代原创转述，未逐字复制某一译本。 | 已确认内容性质；古籍对读及翻译质量待核，不改写正文。 |
| M-01 | 爻线固定规则缺 54.4。 | `src/features/transit-timeline/line-fixing-data.js` 源注释记录 383／384，`tests/line-fixing.test.js` 要求此项返回 `unknown`。 | 保留未知；不得把缺项当成“没有固定”。若取得可追溯的原表证据，再单独修正。 |
| M-02 | Color／Tone／Base 数值与释义。 | 引擎能返回原始数值，但本轮没有按领域独立校验的解释资料。 | 数值仍在返回链路；未增加深层资料入口。术语及精度待独立核验。 |

没有依据的内容不自动填补；此表也不把结构检查、内容解释和天文精度合并为一个“通过”结论。运行时保留原许可证信息，资料库与弹窗继续共用正文来源。
