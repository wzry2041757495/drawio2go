# 里程碑 2：工具定义层

**状态**：✅ 已完成
**实际耗时**：完成
**依赖**：无

## 目标
将 DrawIO 工具集包装为 AI SDK 兼容的 tool schema

## 任务清单

### 1. 创建工具定义文件
- [x] 创建 `app/lib/drawio-ai-tools.ts`
- [x] 添加必要的导入：
  ```typescript
  import { tool } from 'ai';
  import { z } from 'zod';
  import {
    getDrawioXML,
    replaceDrawioXML,
    batchReplaceDrawioXML,
  } from './drawio-tools';
  ```

### 2. 定义工具 1：get_drawio_xml
- [x] 实现获取 XML 工具：
  ```typescript
  export const getDrawioXMLTool = tool({
    description: '获取当前 DrawIO 图表的完整 XML 内容。使用场景：需要查看当前图表结构时调用此工具。',
    parameters: z.object({}),
    execute: async () => {
      const result = getDrawioXML();
      if (!result.success) {
        throw new Error(result.error || '获取 XML 失败');
      }
      return {
        success: true,
        xml: result.xml,
        message: 'XML 获取成功',
      };
    },
  });
  ```

### 3. 定义工具 2：replace_drawio_xml
- [x] 实现完全替换 XML 工具：
  ```typescript
  export const replaceDrawioXMLTool = tool({
    description: '完全替换当前 DrawIO 图表的 XML 内容。使用场景：需要生成全新的图表或进行大范围修改时使用。注意：此操作会覆盖整个图表。',
    parameters: z.object({
      drawio_xml: z.string().describe('新的完整 DrawIO XML 内容，必须是合法的 XML 格式'),
    }),
    execute: async ({ drawio_xml }) => {
      const result = replaceDrawioXML(drawio_xml);
      if (!result.success) {
        throw new Error(result.error || '替换 XML 失败');
      }
      return {
        success: true,
        message: result.message,
      };
    },
  });
  ```

### 4. 定义工具 3：batch_replace_drawio_xml
- [x] 实现批量替换工具：
  ```typescript
  export const batchReplaceDrawioXMLTool = tool({
    description: '批量精准替换 DrawIO XML 中的内容片段。使用场景：需要修改图表中的特定文本、属性或样式时使用。每个 search 字符串必须在 XML 中唯一出现，否则会跳过该替换。建议先使用 get_drawio_xml 获取内容，确认要替换的字符串唯一后再调用。',
    parameters: z.object({
      replacements: z.array(
        z.object({
          search: z.string().describe('要搜索的字符串，必须在 XML 中唯一出现'),
          replace: z.string().describe('替换后的字符串'),
        })
      ).describe('替换对数组，每个对象包含 search 和 replace 字段'),
    }),
    execute: async ({ replacements }) => {
      const result = batchReplaceDrawioXML(replacements);

      // 如果有错误，包含在返回信息中
      if (!result.success) {
        return {
          success: false,
          message: result.message,
          totalRequested: result.totalRequested,
          successCount: result.successCount,
          skippedCount: result.skippedCount,
          errors: result.errors,
        };
      }

      return {
        success: true,
        message: result.message,
        totalRequested: result.totalRequested,
        successCount: result.successCount,
        skippedCount: result.skippedCount,
      };
    },
  });
  ```

### 5. 导出工具对象
- [x] 在文件末尾添加统一导出：
  ```typescript
  /**
   * 所有 DrawIO 工具的集合，用于传递给 AI SDK
   */
  export const drawioTools = {
    get_drawio_xml: getDrawioXMLTool,
    replace_drawio_xml: replaceDrawioXMLTool,
    batch_replace_drawio_xml: batchReplaceDrawioXMLTool,
  };
  ```

## 文件完整结构
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { getDrawioXML, replaceDrawioXML, batchReplaceDrawioXML } from './drawio-tools';

// 工具 1
export const getDrawioXMLTool = tool({ ... });

// 工具 2
export const replaceDrawioXMLTool = tool({ ... });

// 工具 3
export const batchReplaceDrawioXMLTool = tool({ ... });

// 统一导出
export const drawioTools = { ... };
```

## 验收标准
- [x] 文件能正常导入，无 TypeScript 错误
- [x] 每个工具都有清晰的 description
- [x] 参数使用 zod schema 正确定义（使用 inputSchema）
- [x] execute 函数能正确调用底层函数
- [x] 错误情况能正确抛出或返回
- [x] 工具名称使用下划线命名（snake_case）

## 测试步骤
1. 创建测试文件或在控制台测试：
   ```typescript
   import { getDrawioXMLTool } from '@/lib/drawio-ai-tools';

   // 测试参数验证
   console.log(getDrawioXMLTool.parameters.safeParse({}));

   // 测试执行（需要在浏览器环境）
   const result = await getDrawioXMLTool.execute({});
   console.log(result);
   ```

2. 确认每个工具的 description 描述清晰
3. 确认 zod schema 能正确验证参数

## 注意事项
- **工具名称**：使用 snake_case（AI 模型更容易理解）
- **描述**：包含使用场景和注意事项
- **错误处理**：使用 `throw new Error()` 让 AI SDK 捕获错误
- **返回格式**：统一返回包含 `success` 和 `message` 的对象
- **批量替换**：即使部分失败也要返回详细信息，不要直接抛错

---

**下一步**：完成后继续 [里程碑 3：聊天 API 核心逻辑](./milestone-3.md)
