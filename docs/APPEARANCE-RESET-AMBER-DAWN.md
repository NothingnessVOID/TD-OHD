# Appearance Header / Reset / Amber Dawn Transit 人工确认

当前未提交工作区；保留 Center Palette V2 六套及之前 Skin / Timeline 改动。未执行完整测试、build、commit、push、merge、deploy。

## Header

整个 `.skin-settings-header` sticky，`z-index: 10`，不透明 `--bg-elevated` 和轻微 `--border-subtle` 下边框。用共享 `--skin-settings-padding` 补偿 Dialog 的内边距：sticky top 为负内边距，左右外边距同样补偿，标题与关闭键仍按原内边距摆放。这样滚动内容不会从 Header 上方的 padding 空白露出。没有 fixed 关闭键，没有重做 Dialog 滚动结构。

桌面 1224px 下深色弹窗滚到 Footer 后标题／× 可见。手机 390px 下 Light 弹窗滚到最底部（scrollTop = scrollMax = 795），Header 在 Dialog 顶边内，关闭按钮可见，背景不透明，没有叠字。相关截图保存在工作区外的 `outputs/TD-OHD-Appearance-Reset/`。

## Reset 范围

Footer 改为三语言 Reset Appearance / 恢复默认外观 / 恢復預設外觀，绑定 `resetAppearance()`。固定 `default-light`、`manual`、`classic`；全部 Skin overrides 和 Appearance preferences 清空，gateNumberSize 回到 CSS 的 22px。持久化空 v3 状态，旧 migration 不会在刷新后复活自定义值。

旧按当前 Skin 的 Restore API 保留给兼容消费者，Footer 不再使用。Font 为独立轴；不清除人物、出生数据、语言、地点、时区、Timeline、Knowledge、同步账号或其他业务数据。

人工操作确认：

- Midnight Contrast + Jewel + 自定义 Accent + 28px 字号 → Reset → Amber Dawn / manual / Classic / 22px，root inline overrides 清空。
- 分别修改 Delve Design 与 Amber Dusk Transit，再选择 Auto + Ink + 30px → Reset → Auto 未选中，Amber Dawn 与 Classic 选中，字号 22px。
- Reset 后重新进入 Delve 与 Amber Dusk，均无残余 root inline 颜色 override。
- 刷新后 Root 仍为 default-light / light / classic / classic。
- Reset 前后人物列表、出生图文字、当前语言和 body font-family 均相同。
- 实际切换 zh-CN / zh-Hant / English，Footer 文案均正确。

## Amber Dawn

| 角色 | 最新值 |
|---|---|
| BodyGraph Transit / Picker Transit | #2D929F |
| Timeline Transit / Both Transit Stripe / Completed 主体（保持原值） | #2F6870 |
| Transit Text | #246D76 |
| Transit Soft | #E1F0F1 |
| Transit On / Both Text | #FFFFFF |
| Timeline Birth / Both Birth Stripe / Completed 左标记 | #6B655F |
| Theme Accent / Picker Signature | #B86F2C |
| Personality | #282624 |
| Design | #B84D43 |

本轮只增强 Amber Dawn 的 BodyGraph Transit 及直接派生值，Picker Transit 预览同步。Timeline Transit 保持原值。Amber Dusk、其他 Skin、中心配色、Timeline 布局与计算未改。Both / Completed 自动复用现有 CSS token，没有新增时间轴实现。

实际查看了普通出生图、Transit 与 Timeline。Timeline 观察到 Both 使用暖灰／青绿重复条纹、白色文字；Completed 主体为 rgb(47,104,112)，左标记为 5px solid rgb(107,101,95)。Picker Transit 为 rgb(45,146,159)，Signature 保持 #B86F2C。

视觉判断：BodyGraph 的青蓝色更鲜明，仍为青绿色而非荧光 Cyan；铜橙 Accent、砖红 Design 与 Transit 可区分。Timeline 保持原有、比 BodyGraph 更沉静的 #2F6870 青绿色，条纹与 Birth 标记语法清晰；行间空隙与日期底带仍保留。本记录为人工页面查看，不替代最终 Release Gate。
