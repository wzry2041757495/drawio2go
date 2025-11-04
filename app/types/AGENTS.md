# TypeScript 类型定义

## 概述

项目的完整 TypeScript 类型定义，确保类型安全和开发体验。

## 类型文件

### chat.ts
LLM 供应商与聊天消息相关的核心类型定义。

#### 核心类型

- **ProviderType**: 支持的供应商枚举（`openai`、`openai-response`、`deepseek`、`anthropic`）。
- **LLMConfig**: 设置页与后端共用的 LLM 配置（URL、密钥、温度、模型、系统提示、供应商、工具轮次数）。
- **ToolInvocation/ToolInvocationState**: AI 工具调用的状态结构。
- **ChatMessage**: 扩展 AI SDK Message 的聊天消息定义。
- **ChatSession**: 聊天会话定义（ID、标题、消息列表、时间戳）。
- **ChatSessionsData**: 会话数据管理结构。
- **ChatExportData**: 会话导入导出数据格式。

### socket-protocol.ts
Socket.IO 通讯协议的类型定义。

#### 核心接口

- **ToolRequest**: 工具执行请求结构
- **ToolResponse**: 工具执行响应结构
- **RequestStatus**: 请求状态枚举（pending, completed, error）
- **SocketEvents**: Socket.IO 事件名称常量

### global.d.ts
全局类型声明和环境变量定义。

#### 主要内容

- 全局 Socket.IO 客户端类型
- 环境变量类型声明
- 扩展的 Window 对象属性

### drawio-tools.ts
DrawIO XML 操作工具的完整类型定义。

#### 核心接口

**GetXMLResult** - 获取 XML 的返回结果
```typescript
export interface GetXMLResult {
  success: boolean;
  xml?: string;
  error?: string;
}
```

**ReplaceXMLResult** - 替换 XML 的返回结果
```typescript
export interface ReplaceXMLResult {
  success: boolean;
  message: string;
  error?: string;
}
```

**Replacement** - 批量替换的单个替换对
```typescript
export interface Replacement {
  search: string;    // 查找文本
  replace: string;   // 替换文本
}
```

**ReplacementError** - 批量替换中跳过项的错误详情
```typescript
export interface ReplacementError {
  index: number;     // 错误项索引
  search: string;    // 查找文本
  replace: string;   // 替换文本
  reason: string;    // 跳过原因
}
```

**BatchReplaceResult** - 批量替换的返回结果
```typescript
export interface BatchReplaceResult {
  success: boolean;
  message: string;
  totalRequested: number;    // 总请求数
  successCount: number;      // 成功数
  skippedCount: number;      // 跳过数
  errors: ReplacementError[]; // 错误详情
}
```

**XMLValidationResult** - XML 验证结果
```typescript
export interface XMLValidationResult {
  valid: boolean;
  error?: string;
}
```

## 类型设计原则

### 1. 完整性
- 所有公共 API 都有对应的类型定义
- 包含所有可能的返回状态和错误情况

### 2. 详细错误信息
- 每个错误都包含具体的描述信息
- 批量操作提供单项错误追踪

### 3. 类型安全
- 使用严格的类型检查
- 避免使用 `any` 类型
- 提供明确的可选/必需字段标记

### 4. 开发友好
- 详细的 JSDoc 注释
- 清晰的字段命名
- 逻辑性的接口分组

## 使用示例

```typescript
import type {
  GetXMLResult,
  ReplaceXMLResult,
  BatchReplaceResult,
  Replacement
} from "./drawio-tools";

// 类型安全的函数调用
async function handleXmlOperations() {
  const result: GetXMLResult = await getDrawioXML();

  if (result.success && result.xml) {
    const replacements: Replacement[] = [
      { search: "旧文本", replace: "新文本" }
    ];

    const batchResult: BatchReplaceResult =
      await batchReplaceDrawioXML(replacements);
  }
}
```

## 扩展指南

### 添加新类型
1. 在相应的 `.ts` 文件中定义接口
2. 使用 `export` 导出公共类型
3. 添加详细的 JSDoc 注释
4. 更新相关的使用文档

### 类型命名规范
- **接口**: PascalCase (如 `GetXMLResult`)
- **类型别名**: PascalCase (如 `EventHandler`)
- **枚举**: PascalCase (如 `ThemeMode`)
- **常量**: camelCase (如 `storageKey`)
