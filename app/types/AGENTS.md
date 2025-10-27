# TypeScript 类型定义

## 概述

项目的完整 TypeScript 类型定义，确保类型安全和开发体验。

## 类型文件

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