# Milestone 3: API集成

## 目标

修改聊天API以支持接收、存储和传递图片消息给AI模型。

## 范围

### Chat API扩展

- 接收包含图片附件的消息请求
- 将图片文件保存到attachments表
- 在parts_structure中保存image part引用
- 查询attachment并转换为base64
- 将图片以正确格式传递给AI SDK

### 消息格式转换

- 创建attachment转换工具
- 将ImagePart转换为AI SDK的image content格式
- 处理图文混合消息
- 支持多张图片的消息

### 错误处理

- 存储失败处理
- AI模型不支持vision时的友好提示
- 图片加载失败的降级处理

### 验收标准

- [ ] 可以接收包含图片的消息
- [ ] 图片正确保存到数据库
- [ ] 图片以base64格式传递给AI
- [ ] AI能够识别并回复图片内容
- [ ] 支持纯文本、纯图片、图文混合三种消息
- [ ] 错误情况有清晰的提示

## 关键文件

- `/home/aaa/Code/drawio2go/app/api/chat/route.ts` (修改)
- `/home/aaa/Code/drawio2go/app/lib/attachment-converter.ts` (新建)

## 依赖

- Milestone 1的存储层接口
- Milestone 2的Base64转换和类型定义

## 后续依赖

- Milestone 4和5需要此API支持

## 技术要点

- 利用ModelCapabilities中的supportsVision标记
- 遵循AI SDK的image content规范
- 保持与现有工具调用流程的一致性

## 风险

- 不是所有模型都支持vision
- 解决方案：发送前检查模型能力，不支持时拒绝发送图片
