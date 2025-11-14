# Milestone 3: 表单组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐ 中
**预计时间**：2-3 小时
**状态**：🔲 待开始
**依赖**：Milestone 1 (主题配置)
**阻塞**：无

## 🎯 目标

将项目中的表单组件（Input、TextField、TextArea、Label、Description）统一迁移到 HeroUI 表单组件，删除自定义表单样式覆盖，使用 HeroUI 原生样式和 API。

## 📊 影响范围

### 表单组件使用位置（4+ 个文件）

1. **ChatInputArea.tsx** - 聊天输入框（TextArea）
2. **ProjectSelector.tsx** - 项目名称、路径输入（Input、Label）
3. **LLMSettingsPanel.tsx** - LLM 配置表单（Input、TextField）
4. **SystemPromptEditor.tsx** - 系统提示词编辑（TextArea）
5. **FileSettingsPanel.tsx** - 文件路径设置（Input）
6. **CreateVersionDialog.tsx** - 版本创建表单（Input、TextArea）

## ✅ 任务清单

### 1. 删除自定义表单样式

- [ ] **删除 `.chat-input-textarea` 样式**
  - 位于 `app/styles/components/chat.css`
  - 包含圆角、边框、focus 效果等自定义样式

- [ ] **删除其他表单自定义样式**
  - `app/styles/components/forms.css` 中的覆盖样式
  - 检查是否有其他文件中的表单样式覆盖

### 2. Input 组件迁移映射

| 旧组件                | 新组件          | 说明                 |
| --------------------- | --------------- | -------------------- |
| `<input>` 原生        | `<Input>`       | 单行输入             |
| `<input>` + `<label>` | `<TextField>`   | 带标签的输入（推荐） |
| `<textarea>`          | `<TextArea>`    | 多行输入             |
| `<label>`             | `<Label>`       | 标签                 |
| 辅助文字              | `<Description>` | 字段描述             |
| 错误提示              | `<FieldError>`  | 错误信息             |

### 3. ChatInputArea.tsx 迁移

- [ ] **替换聊天输入框为 HeroUI TextArea**

  ```tsx
  // 旧代码
  <textarea
    className="chat-input-textarea"
    placeholder="输入消息..."
    value={input}
    onChange={(e) => setInput(e.target.value)}
  />

  // 新代码
  <TextArea
    placeholder="输入消息..."
    value={input}
    onChange={setInput}
    minRows={3}
    maxRows={10}
    radius="lg" // 12px 圆角
  />
  ```

- [ ] **删除 `.chat-input-textarea` CSS 类**

- [ ] **调整容器布局**（如需要）
  - 使用 HeroUI 的默认间距
  - 移除自定义 padding/margin

### 4. ProjectSelector.tsx 迁移

- [ ] **项目名称输入框**

  ```tsx
  // 旧代码
  <Label htmlFor="project-name">项目名称</Label>
  <Input
    id="project-name"
    value={projectName}
    onChange={(e) => setProjectName(e.target.value)}
  />

  // 新代码
  <TextField>
    <Label>项目名称</Label>
    <Input
      value={projectName}
      onChange={setProjectName}
    />
  </TextField>
  ```

- [ ] **项目路径输入框**

  ```tsx
  <TextField>
    <Label>项目路径</Label>
    <Input
      value={projectPath}
      onChange={setProjectPath}
      placeholder="/path/to/project"
    />
    <Description>选择 DrawIO 文件所在目录</Description>
  </TextField>
  ```

- [ ] **移除硬编码边框颜色**
  - 删除 `border-[#3388BB]` 等硬编码样式

### 5. LLMSettingsPanel.tsx 迁移

- [ ] **API Key 输入框**

  ```tsx
  <TextField>
    <Label>API Key</Label>
    <Input
      type="password"
      value={apiKey}
      onChange={setApiKey}
      placeholder="sk-..."
    />
    <Description>您的 OpenAI API Key</Description>
  </TextField>
  ```

- [ ] **Base URL 输入框**

  ```tsx
  <TextField>
    <Label>Base URL</Label>
    <Input
      value={baseUrl}
      onChange={setBaseUrl}
      placeholder="https://api.openai.com/v1"
    />
  </TextField>
  ```

- [ ] **Model 输入框**

  ```tsx
  <TextField>
    <Label>模型</Label>
    <Input value={model} onChange={setModel} placeholder="gpt-4" />
  </TextField>
  ```

- [ ] **Temperature 滑块**（使用 HeroUI Slider）
  ```tsx
  <div>
    <Label>Temperature</Label>
    <Slider
      value={temperature}
      onChange={setTemperature}
      min={0}
      max={2}
      step={0.1}
    />
    <Description>控制回复的随机性</Description>
  </div>
  ```

### 6. SystemPromptEditor.tsx 迁移

- [ ] **系统提示词编辑器**
  ```tsx
  <TextField>
    <Label>系统提示词</Label>
    <TextArea
      value={systemPrompt}
      onChange={setSystemPrompt}
      minRows={10}
      maxRows={20}
      placeholder="你是一个有帮助的助手..."
    />
    <Description>定义 AI 的行为和角色</Description>
  </TextField>
  ```

### 7. FileSettingsPanel.tsx 迁移

- [ ] **DrawIO 文件路径**
  ```tsx
  <TextField>
    <Label>DrawIO 文件路径</Label>
    <Input value={filePath} onChange={setFilePath} isReadOnly />
    <Description>当前打开的文件路径</Description>
  </TextField>
  ```

### 8. CreateVersionDialog.tsx 迁移

- [ ] **版本名称输入**

  ```tsx
  <TextField isRequired>
    <Label>版本名称</Label>
    <Input value={versionName} onChange={setVersionName} placeholder="v1.0.0" />
    <FieldError>版本名称不能为空</FieldError>
  </TextField>
  ```

- [ ] **版本描述输入**
  ```tsx
  <TextField>
    <Label>描述（可选）</Label>
    <TextArea
      value={description}
      onChange={setDescription}
      minRows={3}
      maxRows={5}
      placeholder="描述此版本的变更..."
    />
  </TextField>
  ```

### 9. 表单验证集成

- [ ] **使用 HeroUI Form 组件包裹表单**

  ```tsx
  <Form onSubmit={handleSubmit}>
    <TextField isRequired>
      <Label>项目名称</Label>
      <Input value={name} onChange={setName} />
      <FieldError>{errors.name}</FieldError>
    </TextField>

    <Button type="submit" variant="solid" color="primary">
      保存
    </Button>
  </Form>
  ```

- [ ] **添加表单验证**
  - 必填字段使用 `isRequired`
  - 错误消息使用 `<FieldError>`
  - 禁用状态使用 `isDisabled`

### 10. CSS 清理（表单迁移完成后立即执行）

- [ ] **验证所有表单组件已迁移**
  - 搜索原生 `<input>` 标签（表单相关）应无结果
  - 搜索原生 `<textarea>` 标签应无结果
  - 搜索 `.chat-input-textarea` 应无结果

- [ ] **删除表单相关的自定义样式**
  - 删除 `app/styles/components/forms.css`（如存在）
  - 从 `chat.css` 中删除 `.chat-input-textarea` 样式块

  ```css
  /* 删除这些样式 */
  .chat-input-textarea {
    border: 1.5px solid var(--border-primary);
    border-radius: 0.75rem;
    /* ... 其他样式 */
  }

  .chat-input-textarea:focus {
    /* ... */
  }
  ```

- [ ] **从 `globals.css` 中移除 forms.css 导入**（如有）

  ```css
  // 删除这行（如存在）
  @import "./styles/components/forms.css" layer(components);
  ```

- [ ] **测试验证**
  - 所有输入框圆角为 12px
  - focus 态边框颜色正确（主题色）
  - TextArea 自动高度调整正常
  - placeholder 显示正确
  - 表单验证正常工作

## 📝 实现细节

### HeroUI 表单组件 API 参考

#### TextField（推荐使用）

```tsx
<TextField isRequired={boolean} isDisabled={boolean} isInvalid={boolean}>
  <Label>标签</Label>
  <Input value={value} onChange={onChange} />
  <Description>描述文字</Description>
  <FieldError>错误信息</FieldError>
</TextField>
```

#### Input

```tsx
<Input
  type="text" | "password" | "email" | "number"
  value={string}
  onChange={(value: string) => void}
  placeholder={string}
  isReadOnly={boolean}
  isDisabled={boolean}
  radius="none" | "sm" | "md" | "lg" | "full"
/>
```

#### TextArea

```tsx
<TextArea
  value={string}
  onChange={(value: string) => void}
  placeholder={string}
  minRows={number}
  maxRows={number}
  resize="none" | "both" | "vertical" | "horizontal"
  radius="none" | "sm" | "md" | "lg"
/>
```

#### Slider（如需要）

```tsx
<Slider
  value={number}
  onChange={(value: number) => void}
  min={number}
  max={number}
  step={number}
  label="标签"
/>
```

### 圆角配置

根据 Milestone 1 的主题配置：

- **Input**: `radius="lg"` → 12px（`--field-radius`）
- **TextArea**: `radius="lg"` → 12px

### 事件处理

HeroUI v3 的表单组件使用简化的事件处理：

```tsx
// 旧方式（React 标准）
onChange={(e) => setValue(e.target.value)}

// 新方式（HeroUI）
onChange={setValue}  // 直接传递 value
```

## 🧪 验证标准

### 功能验证

- [ ] **所有输入框正常工作**
  - 文字输入无延迟
  - onChange 事件正确触发
  - 值更新正确

- [ ] **表单验证正常**
  - 必填字段显示验证错误
  - isInvalid 状态显示正确
  - FieldError 显示错误消息

- [ ] **样式显示正确**
  - 圆角为 12px（lg）
  - Focus 态显示主题色边框
  - Placeholder 颜色正确

- [ ] **TextArea 自动调整高度**
  - minRows/maxRows 生效
  - 内容增加时自动扩展

### 代码验证

- [ ] **无自定义表单样式类**
  - 搜索 `.chat-input-textarea` 无结果
  - 搜索自定义 input/textarea 类无结果

- [ ] **统一使用 HeroUI 组件**
  - 搜索原生 `<input>` 标签（表单相关）无结果
  - 搜索原生 `<textarea>` 标签无结果
  - 搜索原生 `<label>` 标签（表单相关）无结果

- [ ] **事件处理简化**
  - 使用 `onChange={setValue}` 而非 `onChange={(e) => setValue(e.target.value)}`

### 可访问性验证

- [ ] **标签关联正确**
  - Label 与 Input 正确关联
  - 屏幕阅读器可读取标签

- [ ] **键盘导航**
  - Tab 键可以在表单字段间导航
  - Enter 键可以提交表单

- [ ] **错误提示**
  - 错误信息与字段关联
  - 屏幕阅读器可读取错误

## 📚 参考资源

- [HeroUI TextField Docs](https://v3.heroui.com/docs/components/text-field)
- [HeroUI Input Docs](https://v3.heroui.com/docs/components/input)
- [HeroUI TextArea Docs](https://v3.heroui.com/docs/components/textarea)
- [HeroUI Form Docs](https://v3.heroui.com/docs/components/form)
- [HeroUI Slider Docs](https://v3.heroui.com/docs/components/slider)

## ⚠️ 注意事项

1. **onChange 事件签名变化**
   - HeroUI: `onChange={(value: string) => void}`
   - React 标准: `onChange={(e: ChangeEvent) => void}`
   - 需要调整所有事件处理器

2. **TextField vs Input 选择**
   - 有标签时优先使用 `<TextField>` 复合组件
   - 简单场景可直接使用 `<Input>`

3. **TextArea 高度控制**
   - 使用 `minRows`/`maxRows` 而非 CSS height
   - 自动扩展需要设置合理的 max

4. **表单验证时机**
   - `isRequired` 仅在提交时验证
   - 实时验证需要自己控制 `isInvalid` 状态

5. **圆角一致性**
   - 所有表单字段使用 `radius="lg"` (12px)
   - 与主题配置保持一致

## 🔗 相关里程碑

- **依赖**：
  - Milestone 1: 主题配置（需要 field-radius 配置）

- **后续**：
  - Milestone 5: CSS 清理（删除 forms.css）
  - Milestone 6: 测试验证（表单交互测试）

## 📝 完成标准

- [x] 所有任务清单项完成
- [x] 所有验证标准通过
- [x] 所有表单输入正常
- [x] 自定义表单样式已删除
- [x] 无 console 错误或警告
- [x] 代码已提交到 Git

---

**创建日期**：2025-11-14
**预计开始**：Milestone 1 完成后
**实际开始**：-
**完成日期**：-
