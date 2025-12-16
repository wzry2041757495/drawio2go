# Milestone 4: 前端上传组件

## 目标

实现用户上传图片的三种交互方式：点击选择、拖拽上传、粘贴上传。

## 范围

### 上传按钮组件

- 创建图片上传按钮
- 触发文件选择对话框
- 显示上传状态（加载中/成功/失败）
- 集成到ChatInputArea工具栏

### 拖拽上传组件

- 创建拖拽区域包装器
- 监听拖拽事件（dragover、drop等）
- 显示拖拽提示覆盖层
- 验证拖入的文件类型
- 包装整个聊天区域

### 粘贴上传功能

- 监听paste事件
- 从剪贴板提取图片
- 支持截图直接粘贴
- 集成到ChatInputArea

### 图片预览

- 显示待发送图片的缩略图
- 支持移除预览中的图片
- 显示图片文件名和大小
- 多图片排列展示

### 验证与反馈

- 调用image-utils验证文件
- 显示文件过大/类型错误提示
- 上传失败的错误提示
- 友好的用户反馈

### 验收标准

- [ ] 点击按钮可以选择图片文件
- [ ] 拖拽图片到聊天区域可以上传
- [ ] Ctrl+V粘贴图片可以上传
- [ ] 显示上传图片的预览
- [ ] 可以移除预览中的图片
- [ ] 文件验证失败时有清晰提示
- [ ] 支持同时上传多张图片

## 关键文件

- `/home/aaa/Code/drawio2go/app/components/chat/ImageUploadButton.tsx` (新建)
- `/home/aaa/Code/drawio2go/app/components/chat/ImageDropZone.tsx` (新建)
- `/home/aaa/Code/drawio2go/app/components/chat/ChatInputArea.tsx` (修改)
- `/home/aaa/Code/drawio2go/app/components/chat/ChatSidebar.tsx` (修改)

## 依赖

- Milestone 2的验证功能
- Milestone 3的API支持

## 后续依赖

- Milestone 5需要这些上传的图片

## 技术要点

- 使用HTML5 File API
- 使用Drag and Drop API
- 使用Clipboard API
- 复用现有的fileOperations.ts模式

## 用户体验

- 拖拽时显示明显的视觉反馈
- 上传进度实时显示
- 操作可撤销
- 快捷键支持
