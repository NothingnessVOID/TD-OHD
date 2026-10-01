# 阶段3验证

2026-10-02；基线c3ad5b08284d5a4b081f51cd571d82cdb1225eec。独立分支feature/knowledge-layer-v1；Node v26、.NET10、Chrome headless。阶段2预览5191、阶段3测试预览5193。没有操作正式8787安装、用户账号或老师资料。

## 测试

| 命令 | passed | failed | skipped |
|---|---:|---:|---:|
| npm test | 256 | 0 | 3 |
| npm run test:localization | 34 | 0 | 0 |
| npm run test:timeline | 61 | 0 | 0 |
| Knowledge Layer新增单测 | 9 | 0 | 0 |

构建成功：原生工具、WASM、Swiss文件校验、Vite。保留已有>500kB chunk提示；没有增加依赖或修改构建策略。

本机测试以DOTNET=/tmp/td-ohd-sharp-audit/dotnet/dotnet运行；构建使用/tmp/td-ohd-dotnet-no-server包装器，禁用构建服务并复用已恢复资源。

## 新增边界检查

- 60个ID唯一；domain、objectType、sourceId、审核状态、slot版本有效。
- 5 Type、8 Authority、12 Profile、5 Definition、24 Variable、6 Cognition完整lookup；5份真实图Cross动态身份测试。
- 两种Ego身份不合并，旧摘要共享引用明确登记；没有制造细分正文。
- Summary/Detail缺失合法且无双向fallback。
- 知识模块未保存第三份原解释；实际读取结果与原入口三语一致。
- Type结构属性保持独立，Definition/Cognition未用结构字段伪装正文。
- 首页两个renderer与summary facade的静态调用边界：不调用getKnowledgeEntry/getKnowledgeDetail。
- 长Detail及抛错Detail读取fixture不会触发Home读取；future domain reader只在测试fixture验证能力，没有迁移其他体系数据。

## 真实浏览器保护

新knowledge-layer-e2e.mjs完成四宽度1224/903/664/390 × 三语en/zh-CN/zh-Hant，共12组阶段2/3对照。顶部文字、Foundation文字、卡片数量、宽/高全部一致。

每组还在当前浏览器内把Type/Authority/Profile测试Detail设为超过5万字符，通过真实refreshChartLanguage重新渲染；Home文字和几何仍全部一致。测试只改隔离浏览器内存，不改正式文件或用户数据。结果见 [validation.json](validation.json)。

证据范围是该代表图与这些语言/宽度，不宣称穷举所有出生图的像素。

## 既有E2E

以下全部通过，E2E_URL=http://127.0.0.1:5193：

- npm run e2e:chart-data-export：真实剪贴板、三语、匿名出生图、行运新鲜数据、加载守卫、时间轴/排除页面；未输出知识长文。
- npm run e2e:reference：桌面/手机资料库、深链及原Lens。
- npm run e2e:planet：出生图、行运、时间轴 Planet→Gate→Back；桌面/手机。
- npm run e2e:appearance：皮肤、四箭头、颜色、模式独立性、恢复及持久化；1224/390px。
- npm run e2e:sharp：52时刻×13点×6字段，浏览器WASM/native一致；缺文件失败、快速切时刻、DST fold等通过。
- node tests/timeline-e2e.mjs：切人、触摸、黏性布局、年度范围及详情通过。

本轮没有新增这些系统的知识入口，原读取模块与算法文件保持不变。相关UI改动仅为等值lookup替换。

## 生成与Git边界

report-knowledge-layer.mjs只写四个报告文件；连续运行输出一致，未改产品源。阶段1/2审计文件原样保留，只新增phase-3-resolution.md。Git提交只包含本阶段源、测试、报告；node_modules/public engine/bin/obj/dist不提交。

完成后提交并推送任务分支；不合并main、不部署、不删除分支。Git状态与远端SHA另在最终交付报告核对。
