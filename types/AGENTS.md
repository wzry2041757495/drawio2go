# 全局类型声明（TypeScript）

## 模块概述

`types/` 目录存储**全局 TypeScript 类型定义和声明文件**，为整个项目提供跨模块的类型支持。这是一个**极简目录**，仅包含外部库的类型补充和全局声明。

核心作用：

1. **第三方库补充声明**：当 npm 包缺失类型定义时，通过 `.d.ts` 文件补充
2. **全局类型共享**：避免重复定义，统一类型来源
3. **TypeScript 配置支持**：在 tsconfig.json 的 `typeRoots` 或 `include` 中引用

## 文件列表

### pako.d.ts（仅此一个文件）

**功能**：pako 库的 TypeScript 类型声明

**pako 是什么**：

- NPM 包 `pako`：DEFLATE 压缩/解压库（JavaScript 实现）
- 用途：在 DrawIO2Go 中用于 XML 的压缩存储和传输

**声明内容**：

```typescript
declare module "pako";
```

这是一个**模块声明**，告诉 TypeScript 编译器存在 `pako` 模块，使得以下导入不会产生类型错误：

```typescript
import pako from "pako";
const compressed = pako.deflate(data);
const decompressed = pako.inflate(buffer);
```

**deflate-raw 相关**：
虽然声明文件中没有详细的接口定义，但 pako 提供的主要方法包括：

- `deflate(data)`：压缩数据（返回 Uint8Array）
- `inflate(data)`：解压数据（返回 Uint8Array）
- `gzip(data)`：GZIP 压缩
- `ungzip(data)`：GZIP 解压
- `deflateRaw(data)`：原始 DEFLATE 压缩
- `inflateRaw(data)`：原始 DEFLATE 解压

在 DrawIO2Go 的实现中（`app/lib/storage/writers.ts` 等），可能使用 `deflateRaw` 和 `inflateRaw` 来实现不含 zlib 头的压缩。

## 如何添加新的全局类型声明

### 场景 1：第三方库缺失类型定义

当 `npm install @types/xxx` 找不到类型包时：

1. 在 `types/` 目录创建 `xxx.d.ts`
2. 编写声明文件：
   ```typescript
   // types/my-lib.d.ts
   declare module "my-lib" {
     export interface MyType {
       prop: string;
     }
     export function myFunc(): void;
   }
   ```
3. 确保 `tsconfig.json` 包含该目录（通常已包含）

### 场景 2：全局类型或接口

如果需要在全局作用域暴露类型（如 Window 扩展）：

```typescript
// types/global.d.ts
declare global {
  interface Window {
    myGlobal: string;
  }
}

export {}; // 重要：标记为模块，避免冲突
```

### 场景 3：Ambient 类型声明

对于只读配置或编译器选项，可以使用：

```typescript
// types/config.d.ts
declare const CONFIG_VERSION: "1.0";
```

## TypeScript 配置关键项

### tsconfig.json 配置

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"],
    // 或者使用 include 确保 types 目录被编译
    "types": ["pako"] // 显式声明需要的类型
  },
  "include": ["**/*.ts", "**/*.tsx", "types/**/*.d.ts"]
}
```

**说明**：

- `typeRoots`：指定类型声明的搜索路径，默认为 `node_modules/@types`，可扩展
- `include`：确保 `types/` 目录下的 `.d.ts` 被识别

### 模块声明 vs 增强声明

**模块声明**（本项目使用）：

```typescript
declare module "pako" { ... }
```

用于声明一个外部模块的类型。

**增强声明**（declare global）：

```typescript
declare global {
  interface Window { ... }
}
```

用于扩展全局对象或现有接口。

## 注意事项

1. **最小化原则**：仅在必要时添加声明，优先考虑 `@types/*` 包
2. **版本同步**：如果声明对应的库有更新，需同步更新声明内容
3. **无实现代码**：`.d.ts` 文件只包含类型，不包含实现（无 `export class` 实体等）
4. **避免冲突**：全局声明可能导致命名冲突，谨慎使用 `declare global`
5. **编译验证**：修改声明文件后运行 `tsc --noEmit` 验证类型检查
6. **导入时注意**：对于模块声明，运行时仍需 `import "pako"` 或在 package.json 中依赖它

## 当前依赖的库

- **pako**：DEFLATE 压缩库
  - 用于 XML 版本的压缩存储
  - 在 `app/lib/storage/writers.ts` 中可能被调用
  - 虽然声明简化，但 TypeScript 能识别其存在

## 未来扩展建议

当项目中引入其他类型缺失的库时，按照以下步骤处理：

1. 检查 `@types/xxx` 是否存在
2. 如不存在且需要，在 `types/` 中添加声明
3. 更新此文档的"文件列表"
4. 定期审查和维护声明内容
