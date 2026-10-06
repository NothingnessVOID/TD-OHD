# Knowledge 导航与标题文案清理

基线：`1df0b512e0354819ee7955c2b16783134f9dc94d`；沿用 `fix/variable-copy-localization-v1`。

- Variable 五个公共页标题去掉总说明／公共说明，五个 Summary 改为用户指定的简短摘要，并同步繁体和英文。
- 导航独立使用六个 Learn about 动作消息：四箭头、摄取、环境、视角、动机、化身十字。Variable 跳转按钮不再读取目标 name。
- Cross 公共页标题改为 Incarnation Cross（化身十字），英文为 Incarnation Cross；正文与 Summary 不变。
- 手动查看简体、繁体、英文页面，点击 Color→分类→四箭头及 Cross→公共知识的跳转。目标 ID 未改。
- 源码对照确认三语言所有 Knowledge Detail 和 presentation sections 均不变。未改布局、计算或映射。
- 当前相关可见标题、摘要、导航没有公共说明／基础说明／Basics 等内部名称；旧的未调用翻译 key 仍作为历史条目保留。
- 同步既有 fixture 和精确哈希保护清单；清理测试中的历史保护边界允许本轮批准的五组标题／摘要及导航文字。
- 按用户要求未运行 unit、E2E、responsive 或 build，留待 Knowledge 阶段统一验收。
- 未 merge main，未 deploy，未修改本机 8787。
