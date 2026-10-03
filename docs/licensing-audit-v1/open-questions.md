# 未决问题与发布 gate

| 优先级 | 问题 | 所需证据 / 下一步 |
| --- | --- | --- |
| 发布前 | 当前 Modern combined work 适用范围、源码与 object code 的版本对应关系 | 按正式 deployment 建立源码 commit、构建脚本、恢复包、数据 manifest 对应清单；确认 AGPL 第 5/6 节所需许可与源码入口。静态浏览器传播不只取决于第 13 节 |
| 发布前 | SharpAstrology.Base MIT notice 及应用 npm/runtime 完整 notices | 补适用通知并验证分发包；本轮只记录，不改生产 notices |
| 发布前 | OpenHumanDesign README 的 MIT 声明及完整版权通知 | 核定 fork 继承时 snapshot / 作者声明；保留 Unforced Dev attribution |
| 发布前 | TD-OHD 原创贡献的作者权利和目标许可 | 用户选择；候选文件不等于确认拥有全部版权 |
| 发布前 | unknown images、reference data、copied prose、generated fixtures | 逐个来源/授权核实；不要从参考数值、公开网站或图片自动推断 MIT |
| 发布前 | modern compressed DE441 data 的具体 redistribution terms | 核对原始 Swiss notice、实际合同或 copyleft 路线；不是原始 JPL binary 的同义物 |
| Jovian public gate | Swiss 1.76 和镜像 compressed DE406 的完整历史范围 | 保存实际 header 和原始 archive；确认 Professional 合同是否明确覆盖这些版本、镜像数据 |
| Commercial route | Astrodienst Professional 是否覆盖独立 C# port | 向 Astrodienst 和 CReizner 分别核对权利；不能单方面移除端口 AGPL |
| Commercial route | September 2026 合同的有效期、API services、modified source 条款 | 检查实际签订版本及适用范围，不沿用旧价格或永久许可假设 |
| Worker/local gate | Inter fonts 和 LGPL/MPL/Apache npm 依赖是否随特定服务发行 | 用实际 worker bundle / native package 测试 notice 和源代码材料；当前静态 sourcemap 只有 html-to-image 进入 browser |
| 非阻断未知 | live WASM 与本机重建 WASM 名称/hash不同 | 路径/编译元数据可能造成差异；只确认 manifest、实际 hash、signature 和组件，未声称可逐字节重现整个线上发行 |
| 非阻断未知 | missing `@better-fetch/fetch` license field | lock 和 installed metadata 均缺；在该包源码中检查适用 LICENSE；不能从依赖家族推断 MIT |

当前有 source link 和部分完整 notices，因此不把缺少根 LICENSE 单独等同于明确违法。当前商业授权是否存在属于未提供证据的事实，不能反向推断用户从未取得授权。若后续确认公开发行没有适用授权/必要源代码许可，必须先让用户决定修正路线，再进行生产变更。

没有联系任何权利人，没有发送 issue/PR/comment，没有购买或选择许可证。
