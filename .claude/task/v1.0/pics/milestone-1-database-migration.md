# Milestone 1: 数据库设计与迁移

## 目标

建立图片存储的数据库基础设施，创建attachments表并扩展存储层接口。

## 范围

### 数据库Schema

- 创建attachments表用于存储媒体文件
- 支持字段：id、conversation_id、message_id、type、mime_type、file_name、file_size、尺寸信息、blob数据、file_path(Electron)、时间戳
- 建立索引：conversation_id、message_id、created_at
- 配置级联删除：删除对话、消息、项目时自动删除附件
- electron环境下直接存放到文件系统中

### 版本

- 不要更新数据库版本号：保持 V1，执行破坏性更新

### 验收标准

- [ ] attachments表在两种存储后端中成功创建
- [ ] 可以创建、查询、删除attachment记录
- [ ] 级联删除正常工作
- [ ] Blob数据正确存储和读取

## 依赖

- 无前置依赖

## 后续依赖

- Milestone 2依赖此里程碑的Attachment类型定义
- Milestone 3依赖存储层接口

## 风险

- IndexedDB配额限制（浏览器通常50-100MB）
- 需要在接近配额时提供警告机制

## 扩展性

- type字段预留了'file'、'audio'、'video'类型
- 为后续文件对话功能提供数据基础
