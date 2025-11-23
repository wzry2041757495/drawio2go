# DrawIO 错误处理与 XML 回滚机制优化

## 一、任务背景

### 问题描述

根据 `.claude/docs/drawio.md` 官方文档，DrawIO 提供了 `merge` 操作的错误回调机制（`{event: "merge", error: "..."}`），但当前项目代码：

1. **未监听和处理 merge 错误回调** - DrawIO 内部合并失败时前端无感知
2. **缺少 XML 修改前的快照备份** - AI 工具修改失败时无法回滚到有效状态
3. **load 操作无官方错误回调** - 加载失败只能靠超时猜测

### 预期目标

1. 使用任意修改 DrawIO XML 内容的工具时，如替换后的 DrawIO 语法不合法，其应当能获得 DrawIO 的报错返回给 AI
2. 临时存储替换前的 XML，如替换后的 DrawIO 语法不合法则自动回滚

## 二、技术方案

### 2.1 架构设计

#### 错误传递链路

DrawIO iframe
→ postMessage({event: "merge", error: "..."})
→ DrawioEditorNative.handleMessage()
→ CustomEvent("drawio-merge-error")
→ drawio-tools.ts
→ AI 工具返回 {success: false, error: "...", message: "已回滚"}

#### 快照与回滚机制

- **快照位置**：仅内存中临时保存（模块级变量）
- **快照时机**：调用 `replaceDrawioXML()` 之前
- **回滚策略**：自动静默回滚 + 控制台日志 + Toast 提示用户
- **清理时机**：操作成功或失败后立即清理

### 2.2 修改文件清单

| 文件路径                                | 修改内容                        | 优先级 |
| --------------------------------------- | ------------------------------- | ------ |
| `app/components/DrawioEditorNative.tsx` | 监听 merge 错误 + load 验证逻辑 | P0     |
| `app/lib/drawio-tools.ts`               | 内存快照 + 回滚逻辑             | P0     |
| `app/lib/drawio-xml-service.ts`         | 批量编辑回滚支持                | P1     |
| `app/page.tsx`                          | 用户错误提示                    | P2     |

## 三、实现方案

### 3.1 DrawioEditorNative.tsx

#### 修改点 1：监听 merge 错误

- **位置**：`handleMessage()` 函数中处理 `merge` 事件的代码块
- **逻辑**：

1. 清除 merge 超时定时器（保持现有逻辑）
2. 检查 `data.error` 字段是否存在
3. 如果存在错误，触发 `CustomEvent("drawio-merge-error")` 并传递错误详情
4. 记录错误到控制台

#### 修改点 2：load 操作验证

- **位置**：`loadDiagram()` 函数
- **逻辑**：

1. 发送 load 消息到 DrawIO iframe
2. 等待 load 事件响应（保持现有超时机制）
3. **新增**：调用 `exportDiagram()` 导出当前 XML
4. **新增**：比较导出的 XML 与期望加载的 XML 是否相似
5. **新增**：如果验证失败，触发 `drawio-load-error` 事件

### 3.2 drawio-tools.ts

#### 修改点 1：内存快照机制

- **新增模块变量**：`let _drawioXmlSnapshot: string | null = null`
- **作用**：临时保存修改前的 XML 内容

#### 修改点 2：replaceDrawioXML() 函数增强

- **修改前流程**：

1. 验证 XML 格式
2. 保存到存储
3. 触发 `ai-xml-replaced` 事件

- **修改后流程**：

1. **新增**：从存储中读取当前 WIP 版本 XML 并保存到 `_drawioXmlSnapshot`
2. 验证 XML 格式（保持现有逻辑）
3. 保存到存储（保持现有逻辑）
4. 触发 `ai-xml-replaced` 事件（保持现有逻辑）
5. **新增**：等待 DrawIO 验证结果（3秒超时 + 监听 `drawio-merge-error` 事件）
6. **新增**：如果收到错误事件：
   - 从快照恢复 XML 到存储
   - 返回结构化错误对象：`{success: false, error: "drawio_syntax_error", message: "DrawIO 报告 XML 语法错误，已自动回滚到修改前状态"}`
7. **新增**：操作完成后清理 `_drawioXmlSnapshot = null`

#### 修改点 3：错误监听 Promise 实现

- **实现方式**：

1. 创建 Promise 包装 `drawio-merge-error` 事件监听
2. 设置 3 秒超时（超时视为成功）
3. 收到错误事件时 resolve(false)
4. 超时时 resolve(true)
5. 清理事件监听器

### 3.3 drawio-xml-service.ts

#### 修改点：executeDrawioEditBatch() 函数

- **修改前流程**：

1. 获取原始 XML
2. 应用 XPath 操作
3. 序列化新 XML
4. 调用 `executeToolOnClient("replace_drawio_xml")`

- **修改后流程**：

1. 获取原始 XML（保留用于回滚）
2. 应用 XPath 操作（保持现有逻辑）
3. 序列化新 XML（保持现有逻辑）
4. 调用 `executeToolOnClient("replace_drawio_xml")`
5. **新增**：检查返回结果的 `success` 字段
6. **新增**：如果失败，调用 `executeToolOnClient("replace_drawio_xml", {drawio_xml: 原始 XML})` 进行回滚
7. **新增**：抛出错误并包含回滚信息

### 3.4 page.tsx

#### 修改点：用户错误提示

- **实现方式**：

1. 新增 `useEffect` hook
2. 监听 `drawio-merge-error` 事件
3. 显示 Toast 通知："图表更新失败：[错误信息]，已自动回滚到修改前状态"
4. 记录错误到控制台

## 四、关键技术细节

### 4.1 错误返回格式

AI 工具收到的错误响应：

```json
{
"success": false,
"error": "drawio_syntax_error",
"message": "DrawIO 报告 XML 语法错误，已自动回滚到修改前状态"
}

4.2 XML 相似性判断（load 验证）

- 方法：归一化比较（去除空格、换行、注释）
- 容忍度：允许 DrawIO 自动格式化导致的微小差异
- 实现：使用现有的 normalizeDiagramXml() 函数

4.3 并发保护

- 问题：快速连续修改可能导致快照覆盖
- 方案：使用单一快照变量，后发请求覆盖前一个（符合"最后写入获胜"语义）
- 风险：可接受，因为前端通常串行执行 AI 工具

4.4 内存快照生命周期

replaceDrawioXML() 开始
↓
保存快照到内存
↓
修改存储中的 XML
↓
等待 DrawIO 验证（3秒超时）
├─ 成功 → 清理快照 → 返回 {success: true}
└─ 失败 → 回滚快照 → 清理快照 → 返回 {success: false}

五、测试计划

5.1 单元测试场景

1. 故意损坏的 XML：发送格式错误的 XML → 验证 DOMParser 拦截 + 不触发回滚
2. DrawIO 语法错误：发送格式正确但 DrawIO 不接受的 XML → 验证回滚 + 错误返回
3. 超大 XML：发送 >10MB 的 XML → 验证超时机制
4. 快速连续修改：短时间内多次调用 → 验证快照不冲突

5.2 集成测试场景

1. AI 批量编辑失败：drawio_edit_batch 工具返回错误 → 验证原始 XML 恢复
2. load 验证失败：模拟 load 后 export 不匹配 → 验证错误检测
3. 用户手动加载文件：加载损坏文件 → 验证错误提示

5.3 用户体验测试

1. 错误提示是否清晰易懂
2. Toast 通知是否及时显示
3. 控制台日志是否包含足够调试信息

六、影响评估

6.1 功能影响

| 影响项      | 变更                    | 风险等级    |
|----------|-----------------------|---------|
| AI 工具返回值 | 新增 error 和 message 字段 | 低（向后兼容） |
| 用户操作流程   | 无变化（自动回滚）             | 无       |
| 错误恢复能力   | 显著提升                  | 正面      |

6.2 性能影响

| 操作                 | 增加延迟       | 说明             |
|--------------------|------------|----------------|
| replaceDrawioXML() | +3 秒（最坏情况） | 等待 DrawIO 验证超时 |
| loadDiagram()      | +1-2 秒     | export 验证步骤    |
| 内存占用               | +XML 大小    | 临时快照，操作后立即释放   |

6.3 兼容性影响

- ✅ 无破坏性更新（符合 AGENTS.md 内部开发阶段准则）
- ✅ 现有 Socket.IO 工具调用架构无需修改
- ✅ 版本历史系统可继续使用

七、后续优化方向

1. 持久化快照（可选）：如需支持页面刷新后恢复，可改用 IndexedDB 临时表
2. 智能重试（可选）：merge 失败时自动尝试 load 操作
3. 错误分类（可选）：区分语法错误、超时错误、网络错误等
4. 性能优化（可选）：仅在 AI 工具调用时启用验证，用户手动操作跳过

八、实施顺序

1. 第一阶段（P0）：
- DrawioEditorNative.tsx 监听 merge 错误
- drawio-tools.ts 快照与回滚机制
- 基础测试验证
2. 第二阶段（P1）：
- drawio-xml-service.ts 批量编辑回滚
- load 验证逻辑
- 集成测试
3. 第三阶段（P2）：
- page.tsx 用户提示
- 完整测试覆盖
- 文档更新
```
