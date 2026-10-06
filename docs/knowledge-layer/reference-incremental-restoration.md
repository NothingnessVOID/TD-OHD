# Reference 增量内容恢复

## 基线与来源

分支：`fix/variable-copy-localization-v1`。起始提交：`e287263d20b8dc1ba9d444cc50317cd3fbcfc6a5`。
本轮最终 zh-CN 内容来源：用户提供的 `TD-OHD-reference-incremental-restoration.md`。
未读取教材源文件，未进行外部知识研究。zh-Hant 忠实转换，English 完整翻译。

## 实现范围

- `reference-supplements.json` 保存三语言增量正文；`reference-supplements.js` 提供当前语言 lookup。
- 9 个 Centers 追加非自己提醒、潜在智慧；Open 补充放在既有 Open 段内。原 Defined / Undefined / Open 正文保留。
- Gates 只追加共享六爻阅读提示，位于 HD 六爻正文之后、关联通道之前。64 个 Gate 正文和 384 个 Line 数据不修改，其他三个 Lens 不修改。
- 15 条 Channels 在原 description / whenDefined 后追加设计原型、运作机制、高阶状态、非我阴影。名单：10-20、20-34、34-57、10-57、3-60、2-14、1-8、23-43、24-61、28-38、20-57、39-55、12-22、10-34、25-51。其他 21 条没有补充，原正文与页面结构保留。
- 10-34 / 20-57 的原三语言 description 仅删除错误 Integration 归属措辞，whenDefined 不修改。
- 6 个子回路及 Integration 的说明放在现有 h3 和通道 links 之间。Centering 中文显示改为向心回路／向心迴路，内部 key 不变。
- 不修改 CSS、Reference 布局、通道列表生成、circuit-topology.js 或任何计算。

## 必要手动确认

本地 Vite 预览 `http://127.0.0.1:5211/`：

- 逐页打开 9 个 Centers，确认原三状态和两项补充可见；根部 Open 补充位于原 Open 段内。
- 逐页打开 15 条 Channels，确认四项补充可见；4-63 作为未增强样本保持原两段正文和关联列表。
- Gate 52 的 HD 六爻后显示共享提示；易经、基因钥匙、经络穴位三个 Lens 正常打开且不显示该提示。
- 个体、集体、家族三个回路页面正常打开，说明位于标题与原通道链接之间；10-34 留在 Centering、20-57 留在 Knowing，Integration 列表仍为四条。
- English、简体、繁体均已打开核对；10-34 简体页面截图观察无明显溢出。
- 差异检查确认两份本地化 channels.json 仅修改 10-34 / 20-57；English readings 也仅有对应两行修正。Gate / Line / Center 原数据、topology、CSS 零改动。

## 尚未执行

按用户要求未运行完整 unit、E2E、responsive 或 build。完整回归及旧正文快照／范围断言的更新留到内容阶段结束后统一处理；本轮不把它们宣称为通过。
本轮附件范围内无未落实内容。未 merge main，未 deploy，不进入下一阶段。
