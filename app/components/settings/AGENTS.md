# Settings 组件模块 (AGENTS.md)

## 模块概述

`app/components/settings/` 目录包含了应用全局设置面板的 React 组件。该模块提供多个独立的设置面板，覆盖通用配置、LLM API 配置、文件路径配置和版本管理。所有配置项均支持国际化，并通过父组件管理状态持久化。

**关键特性：**

- 多标签页设置面板（通用、LLM、文件、版本）
- LLM API 连接测试
- 系统提示词编辑器（弹窗）
- 语言切换
- 文件路径选择（Electron 环境）
- 版本自动快照策略

---

## 设置面板列表

| 面板                     | 职责             | 核心配置项                                                                     |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------ |
| **GeneralSettingsPanel** | 通用设置         | 语言选择、默认文件路径                                                         |
| **LLMSettingsPanel**     | LLM 配置         | API URL、Provider、API Key、Model Name、Temperature、MaxToolRounds、系统提示词 |
| **FileSettingsPanel**    | 文件设置         | DrawIO 文件默认保存路径                                                        |
| **VersionSettingsPanel** | 版本管理         | AI 编辑前自动创建版本快照                                                      |
| **SystemPromptEditor**   | 系统提示词编辑器 | 弹窗编辑模式，支持恢复默认值                                                   |
| **ConnectionTester**     | 连接测试器       | 测试 LLM API 连接可用性                                                        |
| **SettingsNav**          | 设置导航栏       | 标签页切换（图标导航）                                                         |

---

## 配置项说明

### GeneralSettingsPanel（通用设置）

```typescript
interface GeneralSettingsPanelProps {
  defaultPath: string; // 默认文件路径
  onDefaultPathChange: (path: string) => void;
}
```

**配置项：**

- **语言选择** - 切换应用UI语言（中文/英文），使用 LanguageSwitcher 组件
- **默认文件路径** - 设置文件浏览器打开的初始目录（Electron 环境）

### LLMSettingsPanel（LLM 配置）

```typescript
interface LLMSettingsPanelProps {
  config: LLMConfig;
  onChange: (updates: Partial<LLMConfig>) => void;
}
```

**配置项：**

- **API URL** - LLM 服务地址（如 https://api.openai.com/v1）
- **Provider Type** - 供应商类型选择（openai-compatible、deepseek、openai-reasoning）
- **API Key** - 认证密钥（密码输入框）
- **Model Name** - 模型名称（如 gpt-4o、deepseek-chat）
- **Temperature** - 生成多样性（0.0 - 2.0，滑块）
- **Max Tool Rounds** - 最大工具调用轮数（1 - 20，滑块）
- **System Prompt** - 系统提示词（弹窗编辑）
- **连接测试** - 点击按钮测试当前配置的可用性

### FileSettingsPanel（文件设置）

```typescript
interface FileSettingsPanelProps {
  defaultPath: string;
  onChange: (path: string) => void;
  onBrowse: () => void;
}
```

**配置项：**

- **文件默认路径** - DrawIO 文件的默认保存位置，支持手动输入或浏览选择

### VersionSettingsPanel（版本管理）

```typescript
interface VersionSettingsPanelProps {
  settings: { autoVersionOnAIEdit: boolean };
  onChange: (settings: { autoVersionOnAIEdit: boolean }) => void;
}
```

**配置项：**

- **AI 编辑时自动版本化** - 开关，在 AI 修改图表前是否自动创建版本快照

---

## 组件间关系

```
SettingsNav（导航栏）
└── onTabChange -> activeTab

GeneralSettingsPanel
├── LanguageSwitcher（语言切换器）
└── 默认路径输入 + 文件夹选择

LLMSettingsPanel
├── API URL 输入框
├── Provider 下拉选择
│   └── getProviderOptions(t) -> ProviderOption[]
├── API Key 密码框
├── Model Name 输入框
├── Temperature 滑块
├── MaxToolRounds 滑块
├── SystemPromptEditor（系统提示词编辑器）
│   └── 弹窗编辑模式
└── ConnectionTester（连接测试器）
    └── 弹窗显示测试结果

FileSettingsPanel
└── 文件路径输入 + 浏览按钮

VersionSettingsPanel
└── 自动版本化开关
```

---

## 国际化支持

所有面板使用 `useAppTranslation("settings")` hook 获取国际化文本，支持以下翻译键：

**通用设置：**

```
settings.general.title
settings.general.description
settings.general.defaultPath.label
settings.general.defaultPath.placeholder
settings.general.defaultPath.description
settings.general.defaultPath.selectButton
```

**LLM 设置：**

```
settings.llm.title
settings.llm.description
settings.llm.apiUrl.label
settings.llm.apiUrl.placeholder
settings.llm.apiUrl.description
settings.llm.provider.label
settings.llm.provider.description
settings.llm.providers.[type].label        // openai-compatible, deepseek, openai-reasoning
settings.llm.providers.[type].description
settings.llm.apiKey.label
settings.llm.apiKey.placeholder
settings.llm.apiKey.description
settings.llm.modelName.label
settings.llm.modelName.placeholder
settings.llm.modelName.description
settings.llm.temperature.label
settings.llm.temperature.description
settings.llm.maxToolRounds.label
settings.llm.maxToolRounds.description
settings.systemPrompt.label
settings.systemPrompt.button
settings.systemPrompt.description
```

**文件设置：**

```
settings.file.title
settings.file.description
settings.file.defaultPath.label
settings.file.defaultPath.placeholder
settings.file.defaultPath.note
settings.file.defaultPath.browse
```

**版本设置：**

```
settings.version.title
settings.version.description
settings.version.autoVersionOnAIEdit.label
settings.version.autoVersionOnAIEdit.description
```

**连接测试：**

```
settings.connectionTest.button
settings.connectionTest.description
settings.connectionTest.title
settings.connectionTest.loading
settings.connectionTest.testing
settings.connectionTest.success
settings.connectionTest.error
settings.connectionTest.close
```

---

## 使用示例

### 完整设置面板集成

```tsx
import {
  SettingsNav,
  GeneralSettingsPanel,
  LLMSettingsPanel,
  FileSettingsPanel,
  VersionSettingsPanel,
  type SettingsTab,
} from "@/app/components/settings";

export function SettingsModal() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [config, setConfig] = useState<LLMConfig>(defaultConfig);
  const [generalPath, setGeneralPath] = useState("");
  const [filePath, setFilePath] = useState("");
  const [version, setVersion] = useState({ autoVersionOnAIEdit: true });

  return (
    <div className="settings-container">
      <SettingsNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="settings-content">
        {activeTab === "general" && (
          <GeneralSettingsPanel
            defaultPath={generalPath}
            onDefaultPathChange={setGeneralPath}
          />
        )}

        {activeTab === "llm" && (
          <LLMSettingsPanel
            config={config}
            onChange={(updates) => setConfig({ ...config, ...updates })}
          />
        )}

        {/* 其他面板... */}
      </div>
    </div>
  );
}
```

### LLM 设置与测试

```tsx
// 用户修改 API 配置
<LLMSettingsPanel
  config={llmConfig}
  onChange={(updates) => {
    // 更新配置到状态
    saveLLMConfig({ ...llmConfig, ...updates });
  }}
/>

// ConnectionTester 在 LLMSettingsPanel 内部调用
// 点击"测试连接"按钮 -> 发送 POST /api/test -> 弹窗显示结果
```

### 系统提示词编辑

```tsx
// 在 LLMSettingsPanel 中包含：
<SystemPromptEditor
  value={config.systemPrompt}
  onChange={(systemPrompt) => onChange({ systemPrompt })}
/>

// 用户点击"编辑系统提示词" -> 弹窗打开
// 可以修改文本或点击"恢复默认"
// 点击"保存"将新值回调给 onChange
```

---

## 工具和常量

### 常量 (`constants.ts`)

```typescript
interface ProviderOption {
  value: ProviderType;
  label: string;
  description: string;
  disabled?: boolean;
}

const PROVIDER_OPTIONS: ProviderType[] = [
  "openai-compatible",
  "deepseek",
  "openai-reasoning",
];

// 获取国际化后的供应商选项
const getProviderOptions = (t: TFunction): ProviderOption[] => {
  // 返回带有翻译的选项列表
};
```

### 类型定义

来自 `@/app/types/chat`：

```typescript
interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxToolRounds: number;
  systemPrompt: string;
  providerType: ProviderType;
}

type ProviderType = "openai-compatible" | "deepseek" | "openai-reasoning";
```

---

## API 集成

### 连接测试 API

**端点：** `POST /api/test`

**请求体：**

```json
{
  "apiUrl": "https://api.example.com/v1",
  "apiKey": "sk-xxx",
  "modelName": "gpt-4o",
  "temperature": 0.7,
  "providerType": "openai-compatible"
}
```

**响应（成功）：**

```json
{
  "success": true,
  "response": "OK / 测试消息"
}
```

**响应（失败）：**

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

---

## 限制与注意事项

1. **状态管理** - 各面板通过 props 回调管理状态，父组件负责持久化
2. **Electron 环境检测** - 文件夹选择功能依赖 `window.electron?.selectFolder()`
3. **密码输入** - API Key 使用密码类型输入框，不在 HTML 中暴露
4. **验证** - 各个输入框没有内置验证，应在父组件或 API 层处理
5. **异步操作** - ConnectionTester 中的网络请求可能超时，应设置合理的超时时间
6. **国际化** - 所有文本均通过 i18n，需要对应的翻译文件支持

---

## 文件结构

```
app/components/settings/
├── index.ts                      # 模块导出
├── SettingsNav.tsx               # 设置导航栏（标签页）
├── GeneralSettingsPanel.tsx      # 通用设置面板
├── LLMSettingsPanel.tsx          # LLM 配置面板
├── FileSettingsPanel.tsx         # 文件设置面板
├── VersionSettingsPanel.tsx      # 版本管理设置面板
├── SystemPromptEditor.tsx        # 系统提示词编辑器（弹窗）
├── ConnectionTester.tsx          # 连接测试器（弹窗）
└── constants.ts                  # 常量定义（供应商选项等）
```

---

## 与其他模块的关系

- **LanguageSwitcher** - GeneralSettingsPanel 引入，来自 `app/components/LanguageSwitcher`
- **i18n hooks** - 所有面板使用 `useAppTranslation("settings")`
- **类型定义** - 依赖 `@/app/types/chat` 的 LLMConfig 等类型
- **配置工具** - 使用 `normalizeLLMConfig`（来自 `app/lib/config-utils`）

---

**最后更新:** 2025年11月30日
