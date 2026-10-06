# Variable 公开正文来源口吻清理

基线：`00bc3e02340b3ff1d0eb16b7a7e0a6a619b8a755`。
分支：`fix/variable-copy-localization-v1`。

仅修改 determination 的 thirst、touch、sound、light 四项 Detail。每个 locale 清理 7 处来源元叙述，保留对应温度、环境、声音、光线描述、例子及建议。三语言原本 29 个知识对象和所有 Summary 均不变。

正文缩短后仅重算 section 的字符起止索引；section ID、标题、顺序、Tone 分支与高亮机制完全不变。Environment subtype、deviation flow、计算、Color/Tone/Base、四箭头、source mapping 均未修改。两项 source conflict 文件逐字节保持原样。

原始 Markdown 附件 fixture 原样保留；编译后的最终内容 fixture 同步这些批准的清理。`variable-public-copy-cleanup.json` 明确登记允许替换的短语，新测试以基线 Git 对象证明没有额外文字、Summary 或结构变更。

## 验证

- `node --test tests/variable*.test.js tests/knowledge*.test.js`：90 passed、0 failed、0 skipped。
- `npm run test:localization`：34 passed、0 failed、0 skipped（使用已有 dotnet SDK 路径）。
- 全部 29 项 × 3 locale 的公开 Detail 及 shared renderer 输出：`教材` 为 0；`textbook`、`supplied material`、`source says` 为 0。
- 内部原始附件及审计文档中的来源措辞作为历史证据保留，不属于公开正文。
- 按本轮要求仅运行内容、本地化和 Knowledge 相关测试；未新增浏览器流程、未重新构建或部署。
- 未 merge main；未 deploy；未修改本机 8787。
