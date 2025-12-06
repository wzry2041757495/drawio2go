# DrawIO 工具重构计划

## 设计目标

- 统一参数命名（`xpath`）
- 支持双重定位：`xpath` 或 `id`
- 查询支持类似 `ls` 的列表操作
- 保持简洁高效

---

## 一、drawio_read 重构

### 输入参数

```typescript
interface DrawioReadInput {
  // 定位方式（三选一，默认 ls 模式）
  xpath?: string; // XPath 精确查询
  id?: string | string[]; // 按 cell id 查询

  // ls 模式选项（当 xpath 和 id 都未指定时生效）
  filter?: "all" | "vertices" | "edges"; // 默认 "all"
}
```

### 使用示例

```json
// ls 模式 - 列出所有 cell
{}
// ls 模式 - 仅列出形状
{ "filter": "vertices" }
// ls 模式 - 仅列出连线
{ "filter": "edges" }
// XPath 查询
{ "xpath": "//mxCell[@id='xxx']" }
// ID 查询
{ "id": "cell-1" }
{ "id": ["cell-1", "cell-2"] }
```

### 工具描述

```
读取 DrawIO 图表内容。支持三种方式：
1. ls 模式（默认）：列出所有/部分 cell，可用 filter 筛选 vertices 或 edges
2. xpath：XPath 精确查询
3. id：按 cell id 查询
```

---

## 二、drawio_edit_batch 重构

### 核心改动

1. `insert_element` 的 `target_xpath` → `xpath`
2. 所有操作增加可选 `id` 参数作为 `xpath` 的替代

### 操作参数设计

```typescript
// 通用定位：xpath 或 id 二选一
interface LocatorBase {
  xpath?: string;
  id?: string;
  allow_no_match?: boolean;
}

// 6 种操作
type Operation =
  | ({ type: "set_attribute"; key: string; value: string } & LocatorBase)
  | ({ type: "remove_attribute"; key: string } & LocatorBase)
  | ({
      type: "insert_element";
      new_xml: string;
      position?: InsertPosition;
    } & LocatorBase)
  | ({ type: "remove_element" } & LocatorBase)
  | ({ type: "replace_element"; new_xml: string } & LocatorBase)
  | ({ type: "set_text_content"; value: string } & LocatorBase);
```

### 验证规则

- `xpath` 和 `id` 至少提供一个
- 如果同时提供，优先使用 `id`（转换为 `//mxCell[@id='xxx']`）

### 使用示例

```json
{
  "operations": [
    // 用 id 定位
    {
      "type": "set_attribute",
      "id": "cell-1",
      "key": "value",
      "value": "新文本"
    },
    // 用 xpath 定位
    {
      "type": "set_attribute",
      "xpath": "//mxCell[@vertex='1']",
      "key": "style",
      "value": "..."
    },
    // 插入元素（原 target_xpath 改为 xpath）
    { "type": "insert_element", "xpath": "//root", "new_xml": "<mxCell .../>" }
  ]
}
```

### 工具描述

```
批量编辑 DrawIO 图表（原子操作：全部成功或全部回滚）。

定位方式：
- id: 直接指定 mxCell id
- xpath: XPath 表达式

操作类型：
- set_attribute: 设置属性
- remove_attribute: 移除属性
- insert_element: 插入元素
- remove_element: 删除元素
- replace_element: 替换元素
- set_text_content: 设置文本
```

---

## 三、drawio_overwrite（保持不变）

```typescript
interface DrawioOverwriteInput {
  drawio_xml: string; // 完整 XML
}
```

---

## 四、需修改的文件

| 文件                            | 改动                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `app/types/drawio-tools.ts`     | 更新类型定义：InsertElementOperation.xpath，新增 LocatorBase                    |
| `app/lib/drawio-ai-tools.ts`    | 更新 Zod schema，增加 id 参数，更新验证逻辑和工具描述                           |
| `app/lib/drawio-xml-service.ts` | executeDrawioRead 支持 ls/id 模式，insertElement 改用 xpath，新增 id→xpath 转换 |

---

## 五、实施步骤

1. [ ] **类型定义** `app/types/drawio-tools.ts`
   - InsertElementOperation: `target_xpath` → `xpath`
   - 新增 `DrawioReadInput` 类型
   - 新增 `LocatorBase` 接口

2. [ ] **Zod Schema** `app/lib/drawio-ai-tools.ts`
   - drawio_read: 增加 `id`, `filter` 参数
   - drawio_edit_batch: 增加 `id` 参数，移除 `target_xpath`
   - 更新验证逻辑：xpath/id 二选一
   - 更新工具描述

3. [ ] **执行逻辑** `app/lib/drawio-xml-service.ts`
   - `executeDrawioRead`: 实现 ls 模式和 id 查询
   - `insertElement`: `target_xpath` → `xpath`
   - `applyOperation`: 支持 id→xpath 自动转换

4. [ ] **测试验证**
   - TypeScript 编译检查
   - 功能测试
