# 资料资产清点起点

`node scripts/audit-reference-data.mjs` 按锁定的 `natalengine@1.6.0` 导出原字段快照到被 Git 忽略的 `artifacts/data-audit/raw-reference.json`，同时更新本目录的 [`inventory.json`](inventory.json)。原始文本不进入前端包或公开提交。

当前清点为 9 中心、36 通道、64 闸门、每闸门 6 爻；英文、简中、繁中的闸门、爻线、通道、易经、基因钥匙对象均有条目。共导出 1845 条原始资产；本次只检查对象是否存在，不能据此称文字正确或字段完整。所有审校状态仍为 `unreviewed`。

本机原始快照 SHA-256：`e65b779ab9b3860258ad5366bbe7e2d4798bfba92e3cae13994bb24702ccd50d`。下一步应按交接包的独立资料审校任务做字段结构检查，再逐项记录可追溯来源和待核问题；功能代码中的正文不随清点自动改写。
