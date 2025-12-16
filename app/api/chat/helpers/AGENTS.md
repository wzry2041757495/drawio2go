# Chat API Helpers - AI 代理指南

> 本文档适用于 `app/api/chat/helpers/` 目录，用于说明从 `app/api/chat/route.ts` 抽离的职责边界与约束。

## 目标

- 降低 `POST` 的认知复杂度（SonarJS Cognitive Complexity）到 25 以下
- **不改变功能逻辑**：仅做结构重组（除已确认：仅从 body 读取 `projectUuid`）

## 文件职责

- `request-validator.ts`：解析/校验请求体参数，统一返回可消费的结构化结果（不读取 header）
- `image-utils.ts`：图片附件（vision 支持、验证、ImagePart → FileUIPart 替换）处理
- `model-factory.ts`：按 `providerType` 表驱动创建模型
- `reasoning-utils.ts`：`reasoning_content` 复用与 experimental 参数构建（含降级日志）
- `error-classifier.ts`：错误分类（策略数组），生成 `{ code, message, statusCode }`

## 约束

- 所有 helper 必须保持“纯重构”语义：不得引入新行为、不得改变既有错误文案/状态码/字段结构
- API 返回结构仍由 `route.ts` 的 `apiError()` 统一生成
