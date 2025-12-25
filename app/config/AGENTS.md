# app/config - AI 代理说明

## 目录用途

- 存放与 AI/绘图能力相关的配置文件。
- 当前包含 `skill-elements` 配置，用于定义绘图元素类型与提示词片段。

## 维护规则

- JSON 必须保持有效格式，`promptFragment` 多行用 `\n` 表示换行。
- `id` 必须唯一且稳定，避免影响已存储的用户选择。
- 配套更新 `skill-elements.ts` 的类型与工具函数。

## 文件索引

- `skill-elements.json`：元素与风格的配置数据。
- `skill-elements.ts`：类型定义与读取/查询工具函数。
