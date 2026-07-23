# Health API

## GET `/api/health`

同时探测 API、MySQL 和 Redis。

- 全部正常：HTTP 200，`status=ok`
- 任意依赖异常：HTTP 503，`status=degraded`

响应包含服务版本、时间、运行时长、依赖状态和耗时，不包含连接地址或原始异常。
