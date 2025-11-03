# 工具库

## 概述

汇总应用层工具函数，包括 DrawIO XML 操作与 LLM 配置管理，支持跨组件复用。

## LLM 配置工具（`llm-config.ts`）

- **默认配置**: `DEFAULT_LLM_CONFIG` 与 `DEFAULT_SYSTEM_PROMPT` 提供统一的初始参数。
- **URL 规范化**: `normalizeApiUrl` 自动补全 `/v1` 路径并清理尾部斜杠。
- **供应商识别**: `resolveProviderType`/`isProviderType` 兼容旧版 `useLegacyOpenAIFormat` 配置。
- **配置归一化**: `normalizeLLMConfig` 输出后端与前端共用的标准化 `LLMConfig`。

## DrawIO XML 工具集（`drawio-tools.ts`）

提供 DrawIO XML 文档操作的完整工具集，支持获取、修改和批量替换 XML 内容。

### 存储管理
- **存储键**: `currentDiagram`
- **自动同步**: 修改后立即更新 localStorage
- **编辑器通知**: 通过事件系统触发重新加载

### 事件系统
通过自定义事件通知 DrawIO 编辑器重新加载：
```typescript
window.dispatchEvent(new CustomEvent("drawio-xml-updated", {
  detail: { xml: newXml }
}));
```

## 核心功能

### 1. getDrawioXML()
获取当前存储在 localStorage 中的 DrawIO XML 内容。

**返回**:
```typescript
GetXMLResult {
  success: boolean;
  xml?: string;
  error?: string;
}
```

### 2. replaceDrawioXML(newXml: string)
安全地覆写当前的 DrawIO XML 内容。

**参数**:
- `newXml`: 新的 XML 内容字符串

**功能**:
- XML 格式验证
- localStorage 更新
- 编辑器重新加载通知

**返回**:
```typescript
ReplaceXMLResult {
  success: boolean;
  message: string;
  error?: string;
}
```

### 3. batchReplaceDrawioXML(replacements: Replacement[])
批量替换 XML 中的文本内容，支持全局替换（替换所有匹配项）。

**参数**:
- `replacements`: 替换规则数组
  ```typescript
  Replacement {
    search: string;    // 查找文本（将替换所有匹配项）
    replace: string;   // 替换文本
  }
  ```

**功能**:
- 全局替换所有匹配的内容
- 自动跳过未找到的搜索内容
- 详细的错误报告

**返回**:
```typescript
BatchReplaceResult {
  success: boolean;
  message: string;
  totalRequested: number;
  successCount: number;
  skippedCount: number;
  errors: ReplacementError[];
}
```

## 技术实现

### XML 验证
使用浏览器内置的 DOMParser 进行 XML 格式验证：
```typescript
const parser = new DOMParser();
const doc = parser.parseFromString(xml, "text/xml");
const parseError = doc.querySelector("parsererror");
```

### 事件系统
通过自定义事件通知 DrawIO 编辑器重新加载：
```typescript
window.dispatchEvent(new CustomEvent("drawio-xml-updated", {
  detail: { xml: newXml }
}));
```

### 存储管理
- **存储键**: `currentDiagram`
- **自动同步**: 修改后立即更新 localStorage
- **编辑器通知**: 通过事件系统触发重新加载

## 使用示例

```typescript
import {
  getDrawioXML,
  replaceDrawioXML,
  batchReplaceDrawioXML
} from "../lib/drawio-tools";

// 获取当前 XML
const currentXml = await getDrawioXML();

// 替换整个 XML
await replaceDrawioXML(newXmlContent);

// 批量文本替换
await batchReplaceDrawioXML([
  { search: "旧文本", replace: "新文本" },
  { search: "另一个旧文本", replace: "另一个新文本" }
]);
```

## 错误处理

所有函数都提供详细的错误信息：
- XML 格式验证错误
- localStorage 访问错误
- 批量操作中的单项错误
- 成功操作的详细统计

## 类型定义

完整的 TypeScript 类型定义位于 `../types/drawio-tools.ts`，包含所有接口和错误类型。
