# Team UI 统一交付 · 2026-10-10

## 规范落实

原 AGENTS.md 的Windows环境、9961、同步、测试、并行和资料安全规则全部保留，按用户提供正文追加九条架构原则。ENGINEERING_STANDARDS.md按用户正文建立十节详细规范，仅增加Markdown排版。UI_COMPONENT_INVENTORY.md基于真实调用入口登记共享样式、渲染函数、控制器和仍独立的业务机制，包含本轮新增公共实现。README.zh-CN.md增加三份规则入口。

## 实际复用与必要提取

- Team分析section直接使用原`.panel`，删除独立表面视觉声明。独立右栏留12px阴影/焦点空间，并在扩出的边缘使用短过渡；手机恢复自然滚动。6通道、12门、成员贡献、选中高亮保留。
- `object-detail-heading.js`提取无状态gate/channel标题及详情导航，chart出生/行运与Penta实际共用。回路标签复用`channel-badges.js`，名称继续vocabulary。sheet生命周期继续`detail-dialog.js`，增加可见可用焦点过滤和Reduced Motion。
- `operation-dialog.js/css`从既有人物编辑modal机制提取公共生命周期，Team和person-editor都使用。复用`.modal`、`.modal-field`、`.btn-primary/.btn-secondary`、`.ui-icon-button`；select扩展同一表单规则。统一Escape、遮罩、背景inert、焦点恢复、滚动锁和嵌套确认。
- 选人窗口维护独立草稿，搜索、多选、人数上限、勾选、满员替换、取消不提交；确认原子更新组合。人物编辑保存/取消回到搜索草稿；人物资料保存本身与成员选择确认独立。稳定ID和revision防护保留。
- 成员序号引入集中派生Team Token，根据Skin背景/文字形成可读表面，以数字表达身份，不冒用P/D或回路色。P/D标记使用对应专用Token。
- 旧team-members/team-visual-polish不再加载；penta-matrix清理body挂载后失效及不再生成的选择器。

没有修改SharpAstrology、天文/行运计算、Penta拓扑、存储契约、人物/成员/组稳定ID或普通知识正文。Penta激活显式来自ctx；gate/channel专属解读仍要求审核、证据以及interpretationStatus通过，不用结构摘要冒充专属解释。

## 已完成验证

全部使用隔离浏览器和虚构资料，未读取用户人物库。

- `object-detail-heading.test.js`：3项通过，覆盖三语标题、回路、内容顺序、成员分组和审核边界。
- `skin-presets.test.js`中本次相关3项：通过；原102个Token保持，增加7个集中派生Team Token，原批准色板和来源对比检查保留。只更新新增Token数量/来源断言，未改历史冻结清单。
- `team-selection-flow-e2e.mjs`：通过，覆盖草稿取消/满员替换/新建编辑返回/缺失人物/未知时间/稳定身份/新旧Team保存/跨组取消和提交/确认期间revision冲突/手机及全部Skin溢出。
- `team-ui-unification-e2e.mjs`：通过。实际比较Team与出生图panel的背景、边框、圆角、阴影和padding；滚动前中后、边缘空间、左栏固定、图文联动；出生与Penta标题相等、四透镜、关联跳转、返回、Escape、焦点和滚动恢复。1440/1280/1024/430/390/320尺寸，三语言、11个Skin。生成44张原始截图，无pageerror。
- `object-detail-heading-e2e.mjs`：在合并后通过真实图形点击，1280/390、明确合成激活成员、四透镜、关联跳转与公共返回/关闭、焦点。
- `team-layout-dialogs-e2e.mjs`：合并后通过独立Team入口、6/12完整数量、固定gate顺序、5人成员焦点不改变统计、弹窗与各尺寸/Skin。原“滚动容器上沿对齐”断言改为“可见首个panel上沿对齐”，以适应明确预留的12px阴影空间，仍保留严格对齐检查。
- 9961恢复后，通过`http://192.168.10.99:9961/`实际验证多人选择、自动分析、有成员贡献的群体闸门详情和Escape；无页面错误。
- `vite build --mode static`与`git diff --check`通过。复用已验证WASM，本轮未重编引擎。大chunk提示仍存在。

## 未验证或保留项

未执行全量Node/整站浏览器回归、真实移动设备/Safari/Firefox测试、完整时间轴回归、全站WCAG/Windows强制颜色审计。High Contrast Skin已覆盖，不等于系统forced-colors已适配。

旧`shared-object-details.test.js`仍有1项断言要求六条通道专属摘要显示，与已存在的interpretationStatus门槛冲突；本轮保留失败记录，未放宽知识审核。历史源码哈希审计、Windows路径/权限和Swiss容差问题仍按旧交接记录保留。

## 实际截图对照

图片由浏览器截图缩放拼接，无设计稿替代。原图在本地忽略目录`artifacts/visual-review/unification/`，下列精简图集进入仓库。

- [出生图与Team面板](screenshots/team-unification-2026-10-10/01-panels.png)
- [Team滚动前、中、后](screenshots/team-unification-2026-10-10/02-scroll.png)
- [出生图与Penta闸门详情](screenshots/team-unification-2026-10-10/03-gate-details.png)
- [出生图与Penta通道详情](screenshots/team-unification-2026-10-10/04-channel-details.png)
- [多人选择与人物编辑](screenshots/team-unification-2026-10-10/05-operations.png)
- [手机分析、详情和操作窗口](screenshots/team-unification-2026-10-10/06-mobile.png)
- [代表性Skin](screenshots/team-unification-2026-10-10/07-skins.png)
- [三语言](screenshots/team-unification-2026-10-10/08-languages.png)
- [修改前后](screenshots/team-unification-2026-10-10/09-before-after.png)

## 复现

在准备好本地依赖与引擎后启动开发服务，PowerShell示例：

```powershell
$env:E2E_URL='http://127.0.0.1:9961'
$env:CHROME_CHANNEL='chromium'
node tests/team-selection-flow-e2e.mjs
node tests/team-ui-unification-e2e.mjs
```

提交仅进入开发分支，不合并main、不部署正式站。用户预览继续使用9961。
