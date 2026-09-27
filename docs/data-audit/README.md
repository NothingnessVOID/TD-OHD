# 资料资产清点起点

`node scripts/audit-reference-data.mjs` 按锁定的 `natalengine@1.6.0` 导出原字段快照到被 Git 忽略的 `artifacts/data-audit/raw-reference.json`，同时更新本目录的 [`inventory.json`](inventory.json)。原始文本不进入前端包或公开提交。

当前清点为 9 中心、36 通道、64 闸门、每闸门 6 爻；英文、简中、繁中的闸门、爻线、通道、易经、基因钥匙对象均有条目。共导出 1845 条原始资产。`node scripts/check-reference-structure.mjs` 另检查了端点、中心、反向通道别名及 4740 个字段类型，结果见 [`structure.json`](structure.json)。结构自洽不能证明文字正确；原始资产的审校状态仍为 `unreviewed`。

本机原始快照 SHA-256：`e65b779ab9b3860258ad5366bbe7e2d4798bfba92e3cae13994bb24702ccd50d`。已确认纠错及待核事项见 [`issues.md`](issues.md)；显示层修正不改写原始快照或英文／中文正文。
