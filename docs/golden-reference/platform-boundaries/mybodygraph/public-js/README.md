# myBodyGraph 公开静态 JS 补充检查

这份小检查只下载主线程已经实际观察到的两个公开静态脚本 URL，不操作 Chrome 标签，不读 cookie、凭据、chart token，不调用受认证 charts API。静态代码证据 ≠ 实际 API response。

## 确认的客户端行为

- app.5623a478.js 的客户端代码明确消费 `chart.planets[0].longitude`（Sun）、`chart.planets[2].longitude`（Moon），行星字段挑选包含 `id, activation, chartId, longitude`。这证明客户端模型使用 longitude 字段，不能证明具体某张响应真的含该字段、精度多少、单位或坐标/flags。
- 客户端显示/消费 `chart.meta.birthData.time.utc`、`chart.meta.birthData.time.design` 与 local。静态代码支持实际响应中可能包含 UTC 和 Design timestamp；仍需主线程正常网络响应确认。
- config.chartsUrl 明确是 https://charts.maiamechanics.com，客户端包含 `/api/charts/<id>` GET、城市服务 `/api/cities/v3`。受认证请求存在 `x-charts-token` header 名称；本检查没有读取或发送真实 token。
- 公共 bundle 中没有找到 Swiss/SwissEph/DE441/明确引擎版本。Ephemeris 字样命中都是功能标签/订阅功能文案，不能当星历算法证据。JPL 的两个纯字符串搜索命中位于内嵌 base64 内容，不能当有效 JPL 证据。
- 477.2552f9ec.js 没有 longitude/UTC/ephemeris 关键计算证据。

## 限制

精确 astronomy algorithm、ephemeris data/version、Swiss/JPL version、UT1/TT policy、Design88实施仍 NOT DISCLOSED 于这两个静态脚本。本检查不能代替合法的实际 chart JSON response，也没有绕过登录/付费。

文件：manifest.json 保存 URL、采集时间、长度和SHA256；field-evidence.json 保存关键位置与上下文；两个 JS 原始下载字节仅保留本地，不随本次提交发布；发布 URL、哈希和关键片段即可复查。
