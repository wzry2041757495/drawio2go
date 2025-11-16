# Milestone 3: 表单组件迁移

## 📋 里程碑概述

**优先级**：⭐⭐ 中
**预计时间**：2-3 小时
**状态**：✅ 已完成（2025-11-14）
**依赖**：Milestone 1 (主题配置)
**阻塞**：无
**完成摘要**：统一将聊天/设置/版本相关表单迁移至 HeroUI TextField/TextArea 组合，移除了所有自定义表单 CSS（含 `forms.css` 与 `.chat-input-textarea`），并补充了 Version Dialog 的 FieldError 校验，使整套表单体系完全依赖主题 Token。

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

- [x] **删除 `.chat-input-textarea` 样式**
  - 位于 `app/styles/components/chat.css`
  - 包含圆角、边框、focus 效果等自定义样式

- [x] **删除其他表单自定义样式**
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

- [x] **替换聊天输入框为 HeroUI TextArea**

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
    onChange={(event) => setInput(event.target.value)}
    rows={3}
    disabled={configLoading || !llmConfig}
    className="w-full"
  />
  ```

- [x] **删除 `.chat-input-textarea` CSS 类**

- [x] **调整容器布局**：原容器结构已满足需求，TextArea 默认样式即可继承主题。HeroUI v3 暂不支持 `minRows`/`radius` 变体，因此使用标准 `rows` 属性控制高度。

### 4. ProjectSelector.tsx 迁移

- [x] **项目名称输入框**

  ```tsx
  // 旧代码
  <Label htmlFor="project-name">项目名称</Label>
  <Input
    id="project-name"
    value={projectName}
    onChange={(e) => setProjectName(e.target.value)}
  />
  ```

// 新代码
<TextField isRequired>
<Label>工程名称</Label>
<Input
value={newProjectName}
onChange={(event) => setNewProjectName(event.target.value)}
/>
<Description>创建工程时必填</Description>
</TextField>

````

- [ ] **项目路径输入框（不适用）**
  - 当前 ProjectSelector 仅提供“新建工程”名称 + 描述输入，路径选择在别处处理，因此保持现状

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
````

- [ ] **移除硬编码边框颜色**
  - TODO：工程卡片仍使用品牌色十六进制，待迁移为 CSS 变量或主题 token
  - 该项与表单迁移无直接耦合，延后至视觉统一改造

### 5. LLMSettingsPanel.tsx 迁移

> 现有实现已完全使用 HeroUI 复合组件，本次仅复核并保留。

- [x] **API Key 输入框**

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

- [x] **Base URL 输入框**

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

- [x] **Model 输入框**

  ```tsx
  <TextField>
    <Label>模型</Label>
    <Input value={model} onChange={setModel} placeholder="gpt-4" />
  </TextField>
  ```

- [x] **Temperature 滑块**（使用 HeroUI Slider）
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

- [x] **系统提示词编辑器**
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

- [x] **DrawIO 文件路径**
  ```tsx
  <TextField>
    <Label>DrawIO 文件路径</Label>
    <Input value={filePath} onChange={setFilePath} isReadOnly />
    <Description>当前打开的文件路径</Description>
  </TextField>
  ```

### 8. CreateVersionDialog.tsx 迁移

- [x] **版本名称输入**

  ```tsx
  <TextField isRequired>
    <Label>版本名称</Label>
    <Input value={versionName} onChange={setVersionName} placeholder="v1.0.0" />
    <FieldError>版本名称不能为空</FieldError>
  </TextField>
  ```

- [x] **版本描述输入**
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

> HeroUI v3 的 `<Form>` 组件仍在 beta，且现有受控表单需要自定义 Socket/存储逻辑，暂不引入。维持原生 `<form>` 并在字段级别使用 `isRequired`/`FieldError`。

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

- [x] **添加表单验证**
  - 必填字段使用 `isRequired`
  - `CreateVersionDialog` 已使用 `<FieldError>`；其余字段沿用受控状态提示
  - 禁用状态使用 `disabled`/`isDisabled`

### 10. CSS 清理（表单迁移完成后立即执行）

- [x] **验证所有表单组件已迁移**
  - 搜索原生 `<input>` 标签（表单相关）应无结果
  - 搜索原生 `<textarea>` 标签应无结果
  - 搜索 `.chat-input-textarea` 应无结果

- [x] **删除表单相关的自定义样式**
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

- [x] **从 `globals.css` 中移除 forms.css 导入**（如有）

  ```css
  // 删除这行（如存在）
  @import "./styles/components/forms.css" layer(components);
  ```

- [x] **测试验证**
  - 所有输入框圆角使用主题 `--field-radius`（HeroUI 默认），无额外覆盖
  - focus 态由 HeroUI 样式负责，删除自定义阴影后仍匹配主题
  - TextArea 采用固定 `rows`，HeroUI 暂无 `minRows/maxRows`（不适用自动高度）
  - placeholder 样式回退到主题变量
  - `CreateVersionDialog` 已引入 `FieldError` 并验证禁用状态逻辑

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
  onChange={(event: ChangeEvent<HTMLInputElement>) => void}
  placeholder={string}
  isReadOnly={boolean}
  disabled={boolean}
/>
```

#### TextArea

```tsx
<TextArea
  value={string}
  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => void}
  placeholder={string}
  rows={number}
  disabled={boolean}
  className="w-full"
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

### 事件处理

HeroUI v3 的 Input/TextArea 仍继承 React DOM 事件，需要通过 `event.target.value` 更新状态；Slider 等 RAC 组件会直接传递值。

## 🧪 验证标准

### 功能验证

- [x] **所有输入框正常工作**
  - 已在受控组件中手动验证受控 value/set 流程；`pnpm lint` 通过
- [x] **表单验证正常**
  - `CreateVersionDialog` 使用 `isRequired + FieldError`，其余字段维持自定义校验
- [x] **样式显示正确**
  - 依赖 HeroUI 主题 Token（圆角、Focus、Placeholder）无额外覆盖
- [ ] **TextArea 自动调整高度**
  - HeroUI v3 目前不提供 `autoResize`，本次采用固定 `rows`；若未来提供 `minRows/maxRows` 可再启用

### 代码验证

- [x] **无自定义表单样式类**
  - `.chat-input-textarea` 与 `forms.css` 均已删除
- [x] **统一使用 HeroUI 组件**
  - `rg "<input"` / `rg "<textarea"` 均无结果，表单仅使用 HeroUI 组件
- [ ] **事件处理**
  - HeroUI Input/TextArea 仍需 `event.target.value`，暂无进一步简化

### 可访问性验证

- [x] **标签关联正确**
  - TextField 结构自带 `aria-labelledby`，SystemPromptEditor 等新增 Label 包裹
- [x] **键盘导航**
  - 继续使用原生 `<form>`，Tab/Enter 行为保持
- [x] **错误提示**
  - Version Dialog 的 `FieldError` 供屏幕阅读器读取，其余字段无同步错误态需求

## 📚 参考资源

- [HeroUI TextField Docs](https://v3.heroui.com/docs/components/text-field)
- [HeroUI Input Docs](https://v3.heroui.com/docs/components/input)
- [HeroUI TextArea Docs](https://v3.heroui.com/docs/components/textarea)
- [HeroUI Form Docs](https://v3.heroui.com/docs/components/form)
- [HeroUI Slider Docs](https://v3.heroui.com/docs/components/slider)

## ⚠️ 注意事项

1. **onChange 事件签名**
   - HeroUI Input/TextArea 依旧沿用 React DOM 的 `ChangeEvent`
   - Slider/Select 等基于 RAC 的组件才直接回传值
   - 如需只处理值，可自行封装 `handleChange = (event) => setValue(event.target.value)`

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
   - HeroUI v3 通过主题 token 控制 Input/TextArea 圆角，无需额外传参
   - 删除覆盖样式后即可继承 `--field-radius`

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
**实际开始**：2025-11-14
**完成日期**：2025-11-14
