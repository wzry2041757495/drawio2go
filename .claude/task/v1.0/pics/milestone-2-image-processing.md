# Milestone 2: 图片处理工具层

## 目标

创建图片验证、压缩、格式转换等核心工具函数。

## 范围

### 图片验证

- 文件类型验证（PNG/JPEG/GIF/WebP）
- 文件大小限制（5MB）
- 返回友好的错误信息

### 图片处理

- Blob压缩（deflate-raw算法）
- Blob解压
- 获取图片尺寸（宽度和高度）
- Blob与Base64相互转换

### 类型扩展

- 在chat.ts中定义ImagePart类型
- 扩展ChatUIPart联合类型
- 定义图片相关的TypeScript接口

### 常量定义

- 最大图片大小：5MB
- 支持的MIME类型列表
- 错误消息模板

### 验收标准

- [ ] 可以验证图片文件的合法性
- [ ] 压缩和解压功能正常工作
- [ ] 可以准确获取图片尺寸
- [ ] Base64转换双向正常
- [ ] 类型定义完整且无TypeScript错误

## 关键文件

- `/home/aaa/Code/drawio2go/app/lib/image-utils.ts` (新建)
- `/home/aaa/Code/drawio2go/app/types/chat.ts` (修改)

## 依赖

- Milestone 1的Attachment类型定义

## 后续依赖

- Milestone 3需要Base64转换功能
- Milestone 4需要验证功能
- Milestone 5需要解压和显示功能

## 技术要点

- 复用现有的compression-utils.ts和blob-utils.ts
- 与现有SVG处理保持一致的压缩策略
- 确保Web和Electron环境的兼容性

## 风险

- Base64编码会增大约33%体积
- 解决方案：仅在API传输时临时转换，存储层始终用压缩blob
