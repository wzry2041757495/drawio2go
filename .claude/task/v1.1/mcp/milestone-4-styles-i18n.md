# 里程碑 4：样式和国际化

## 目标

完善 MCP 组件的样式设计和多语言支持。

## 状态

⏳ 待开始

## 预计时间

1-2 天

## 依赖

- 里程碑 3 完成

## 新增文件

```
app/components/mcp/
└── mcp-styles.css              # MCP 组件样式

public/locales/
├── zh-CN/mcp.json              # 中文翻译
├── en-US/mcp.json              # 英文翻译
```

## 修改文件

```
app/globals.css                 # [修改] 导入 MCP 样式
```

## 任务清单

### 4.1 样式文件 (`mcp-styles.css`)

- [ ] **MCP 按钮容器**
  - 紧贴输入框上方
  - `display: flex`
  - `padding: 8px 0`
  - 底部分隔线
- [ ] **配置展示区域**
  - 相对定位（复制按钮定位基准）
  - 背景：`var(--background-secondary)`
  - 圆角：`var(--radius)`
  - 代码字体：monospace
  - 代码高亮样式
- [ ] **全屏暴露界面布局**
  - Flexbox 列布局
  - 间距：`var(--spacing-6)`
  - 内容区滚动：`overflow-y: auto`
- [ ] **头部区域**
  - 两端对齐
  - 底部分隔线
- [ ] **版本控制提示框**
  - 蓝色主题背景
  - 边框：`var(--accent-border)`
  - 圆角：`var(--radius)`
- [ ] **活跃状态指示器**
  - 绿色圆点 + 脉冲动画
  - `@keyframes pulse`
- [ ] **响应式设计**
  - `@media (max-width: 768px)`
  - 小屏适配（padding、font-size）
- [ ] **暗色模式兼容**
  - 使用 CSS 变量确保主题一致性

### 4.2 全局样式导入 (`app/globals.css`)

- [ ] 添加 `@import "components/mcp/mcp-styles.css";`
- [ ] 确保导入顺序正确（components layer）

### 4.3 中文翻译 (`public/locales/zh-CN/mcp.json`)

翻译键结构：

```
button.*          - 按钮文本
config.*          - 配置对话框
exposure.*        - 暴露界面
clients.*         - 客户端名称
server.*          - 服务器状态
common.*          - 通用文本
```

- [ ] `button.expose` - "MCP 接口"
- [ ] `button.exposing` - "暴露中"
- [ ] `config.title` - "MCP 接口配置"
- [ ] `config.webNotSupported` - "仅支持 APP 端"
- [ ] `config.webNotSupportedDesc` - 详细说明
- [ ] `config.ipLabel` - "IP 地址"
- [ ] `config.localhost` - "本地（仅本机访问）"
- [ ] `config.lan` - "局域网（允许其他设备访问）"
- [ ] `config.portLabel` - "端口号"
- [ ] `config.randomPort` - "随机端口"
- [ ] `config.invalidPort` - "无效端口"
- [ ] `config.portRangeHint` - "端口号必须在 8000-9000 之间"
- [ ] `config.starting` - "启动中..."
- [ ] `config.confirm` - "确认启动"
- [ ] `config.randomPortError` - "获取随机端口失败"
- [ ] `config.startError` - "启动失败"
- [ ] `config.copy` - "复制"
- [ ] `config.copySuccess` - "配置已复制到剪贴板"
- [ ] `config.copyError` - "复制失败"
- [ ] `exposure.title` - "MCP 接口已暴露"
- [ ] `exposure.activeAt` - "正在暴露："
- [ ] `exposure.selectClient` - "选择接入示例"
- [ ] `exposure.stop` - "结束暴露"
- [ ] `exposure.stopping` - "正在停止..."
- [ ] `exposure.stopError` - "停止失败"
- [ ] `exposure.versionControlHint` - "版本控制功能在被外部 MCP 调用中依然有效"
- [ ] `clients.cursor` - "Cursor 编辑器"
- [ ] `clients.claudeCode` - "Claude Code"
- [ ] `clients.codex` - "Codex CLI"
- [ ] `clients.geminiCli` - "Gemini CLI"
- [ ] `clients.generic` - "通用配置"
- [ ] `server.startSuccess` - "MCP 服务器已启动"
- [ ] `server.startError` - "MCP 服务器启动失败"
- [ ] `server.stopSuccess` - "MCP 服务器已停止"
- [ ] `server.stopError` - "MCP 服务器停止失败"
- [ ] `common.close` - "关闭"
- [ ] `common.cancel` - "取消"

### 4.4 英文翻译 (`public/locales/en-US/mcp.json`)

- [ ] 与中文翻译对应的英文版本
- [ ] 保持键结构一致

## 设计规范

### 颜色变量

- 背景：`var(--background)`, `var(--background-secondary)`
- 前景：`var(--foreground)`, `var(--text-primary)`
- 主题色：`var(--accent)`, `var(--accent-bg)`, `var(--accent-border)`
- 成功：`var(--success)`, `var(--success-bg)`
- 危险：`var(--danger)`
- 边框：`var(--border-default)`

### 间距系统

- `var(--spacing-2)` - 8px
- `var(--spacing-3)` - 12px
- `var(--spacing-4)` - 16px
- `var(--spacing-6)` - 24px

### 圆角系统

- `var(--radius-sm)` - 4px
- `var(--radius)` - 8px
- `var(--radius-lg)` - 12px

### 阴影系统

- `var(--shadow-1)` - 轻微阴影
- `var(--shadow-2)` - 标准阴影
- `var(--shadow-4)` - 中等阴影

## 验收标准

- [ ] 所有样式使用 CSS 变量，无硬编码值
- [ ] 暗色模式正常显示
- [ ] 响应式布局在小屏正常工作
- [ ] 中英文切换正常
- [ ] 所有 UI 文本无硬编码
- [ ] 代码展示区可读性良好
- [ ] 复制按钮定位正确
- [ ] 脉冲动画流畅

## 注意事项

- 参考现有组件样式文件（如 `model-selector.css`、`chat.css`）
- 翻译文件命名空间为 `mcp`
- 确保 i18n Hook 正确导入命名空间
- 测试多语言切换后的布局稳定性
