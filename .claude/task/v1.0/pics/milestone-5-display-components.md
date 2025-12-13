# Milestone 5: 前端展示组件

## 目标

实现消息中图片的展示、加载和交互功能。

## 范围

### 图片展示组件

- 创建ImageContent组件
- 根据attachment_id查询并显示图片
- 使用Object URL渲染图片
- 支持可选的宽高属性
- 显示alt文本

### 加载状态

- 显示图片加载中的占位符
- 骨架屏或加载动画
- 超时处理

### 错误处理

- 图片加载失败的占位符
- 显示错误信息
- 提供重试按钮

### MessageContent集成

- 在MessageContent.tsx中添加image类型处理
- 根据part类型路由到ImageContent组件
- 保持与text、reasoning、tool类型的一致性

### 样式设计

- 添加消息图片样式
- 响应式布局（移动端适配）
- 与现有聊天界面风格一致
- 图片点击放大（可选）

### 内存管理

- Object URL的创建和释放
- 使用useEffect cleanup避免内存泄漏
- 懒加载优化（IntersectionObserver）

### 验收标准

- [ ] 消息中的图片正确显示
- [ ] 加载状态有友好提示
- [ ] 加载失败有清晰的错误信息
- [ ] 图片样式美观且一致
- [ ] 响应式布局正常
- [ ] 没有内存泄漏
- [ ] 长对话中图片懒加载工作正常

## 关键文件

- `/home/aaa/Code/drawio2go/app/components/chat/ImageContent.tsx` (新建)
- `/home/aaa/Code/drawio2go/app/components/chat/MessageContent.tsx` (修改)
- `/home/aaa/Code/drawio2go/app/styles/components/chat.css` (修改)

## 依赖

- Milestone 1的存储层读取接口
- Milestone 2的解压功能
- Milestone 3的API支持

## 后续依赖

- Milestone 6的性能优化依赖此组件

## 技术要点

- 使用URL.createObjectURL创建临时URL
- 使用URL.revokeObjectURL释放内存
- 使用IntersectionObserver实现懒加载
- 复用现有的loading和error UI模式

## 性能优化

- 大图片添加max-width限制
- 首屏外的图片延迟加载
- 解压操作异步执行
- 缓存已加载的Object URL
