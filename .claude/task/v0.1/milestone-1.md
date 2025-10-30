# 里程碑 1：基础配置扩展

**状态**：✅ 已完成
**预计耗时**：30 分钟
**依赖**：无

## 目标
扩展 LLM 配置，支持最大循环次数设置

## 任务清单

### 1. 更新 LLMConfig 接口
- [ ] 打开 `app/components/SettingsSidebar.tsx`
- [ ] 在 `LLMConfig` 接口中添加新字段：
  ```typescript
  interface LLMConfig {
    apiUrl: string;
    apiKey: string;
    temperature: number;
    modelName: string;
    systemPrompt: string;
    useLegacyOpenAIFormat: boolean;
    maxToolRounds: number; // 新增：默认值 5
  }
  ```

### 2. 更新默认配置
- [ ] 在 `llmConfig` 状态初始化时添加 `maxToolRounds: 5`
  ```typescript
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    apiUrl: "https://api.deepseek.com",
    apiKey: "",
    temperature: 0.3,
    modelName: "deepseek-chat",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    useLegacyOpenAIFormat: true,
    maxToolRounds: 5, // 新增
  });
  ```

### 3. 添加 UI 控件
- [ ] 在 LLM 配置区域添加滑块控件（放在"系统提示词"之前）：
  ```tsx
  {/* 最大工具调用轮次 */}
  <div className="w-full mt-4">
    <Label>最大工具调用轮次: {llmConfig.maxToolRounds}</Label>
    <input
      type="range"
      min="1"
      max="20"
      step="1"
      value={llmConfig.maxToolRounds}
      onChange={(e) =>
        setLlmConfig({
          ...llmConfig,
          maxToolRounds: parseInt(e.target.value),
        })
      }
      className="w-full mt-2 temperature-slider"
    />
    <Description className="mt-2">
      限制 AI 工具调用的最大循环次数，防止无限循环（范围 1-20）
    </Description>
  </div>
  ```

### 4. 验证保存和加载逻辑
- [ ] 确认 `handleSave` 函数会保存新字段到 localStorage
- [ ] 确认 `useEffect` 加载逻辑能正确恢复 `maxToolRounds`
- [ ] 添加兼容性处理（旧配置没有此字段时使用默认值 5）：
  ```typescript
  const parsed = JSON.parse(savedLlmConfigStr);
  setLlmConfig({
    ...parsed,
    maxToolRounds: parsed.maxToolRounds ?? 5, // 兼容旧配置
  });
  ```

## 验收标准
- [ ] 设置页面能正确显示"最大工具调用轮次"滑块
- [ ] 滑块范围为 1-20，步长为 1
- [ ] 当前值实时显示在 Label 中
- [ ] 修改后保存，重新加载页面能恢复设置
- [ ] 旧配置升级时使用默认值 5

## 测试步骤
1. 打开设置侧边栏
2. 找到"最大工具调用轮次"控件
3. 拖动滑块到不同值（如 10）
4. 点击"保存"
5. 刷新页面
6. 重新打开设置，确认值为 10

## 注意事项
- 使用 `parseInt()` 确保值为整数
- 复用现有的 `temperature-slider` 样式类
- 确保与其他配置项的间距一致（`mt-4`）

---

**下一步**：完成后继续 [里程碑 2：工具定义层](./milestone-2.md)
