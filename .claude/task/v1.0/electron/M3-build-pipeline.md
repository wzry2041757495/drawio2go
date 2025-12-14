# M3: 构建流程

## 目标

配置多目标构建流程，确保：

1. API 核心模块可被 Electron 主进程使用
2. 静态导出正确生成
3. Electron 打包包含所有必要文件

## 前置依赖

- [M1: API 核心抽象](./M1-api-core-abstraction.md) 完成
- [M2: Electron 本地服务器](./M2-electron-local-server.md) 完成

## 构建架构

```
源代码                    构建产物                    打包
─────────                ─────────                  ─────

app/lib/api-core/   ──►  dist/api-core/       ──┐
      (TypeScript)            (CommonJS)        │
                                                │
app/                ──►  out/                 ──┼──►  dist/
      (Next.js)              (静态 HTML/JS)     │        (Electron 安装包)
                                                │
electron/           ──►  (直接使用)           ──┘
      (JavaScript)
```

## 任务清单

### 3.1 配置 API 核心模块构建

**安装 tsup**：

```bash
pnpm add -D tsup
```

**创建 `tsup.config.ts`**：

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["app/lib/api-core/index.ts"],
  format: ["cjs"], // CommonJS 供 Electron 使用
  outDir: "dist/api-core",
  dts: true, // 生成类型定义
  clean: true,

  // 外部依赖（不打包，运行时从 node_modules 加载）
  external: [
    "ai",
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/deepseek",
    "socket.io",
    "zod",
    // 其他运行时依赖...
  ],

  // 环境变量替换
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
```

### 3.2 更新 package.json 脚本

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "build:api-core": "tsup",
    "build:all": "pnpm run build && pnpm run build:api-core",

    "electron": "electron .",
    "electron:dev": "concurrently \"pnpm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "pnpm run build:all && electron-builder",

    "rebuild": "electron-rebuild -f -w better-sqlite3",
    "postinstall": "electron-rebuild -f -w better-sqlite3"
  }
}
```

### 3.3 更新 electron-builder 配置

**`package.json` 中的 `build` 配置**：

```json
{
  "build": {
    "appId": "com.drawio2go.app",
    "productName": "DrawIO2Go",

    "files": [
      "out/**/*",
      "electron/**/*",
      "dist/api-core/**/*",
      "node_modules/**/*",
      "package.json"
    ],

    "extraResources": [
      {
        "from": "out",
        "to": "out",
        "filter": ["**/*"]
      }
    ],

    "directories": {
      "buildResources": "assets",
      "output": "dist-electron"
    },

    "asar": true,
    "asarUnpack": ["node_modules/better-sqlite3/**/*"],

    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.productivity"
    },

    "win": {
      "target": ["nsis", "portable"]
    },

    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    }
  }
}
```

### 3.4 确保 Next.js 静态导出正确

**检查 `next.config.mjs`**：

```javascript
const nextConfig = {
  output: "export", // 始终静态导出

  images: {
    unoptimized: true, // 静态导出必须
  },

  // 其他配置保持不变...
};
```

**注意**：由于 M1 已将 API 逻辑抽取到 `api-core`，Route Handlers 仅在 Web 版使用，静态导出时这些文件不会被执行。

### 3.5 处理 API Routes 与静态导出的兼容

**方案 A：条件性包含 Route Handlers**

在 `next.config.mjs` 中使用 webpack 配置排除 API 路由：

```javascript
const nextConfig = {
  output: "export",

  webpack: (config, { isServer }) => {
    if (!isServer && process.env.BUILD_TARGET === "electron") {
      // Electron 构建时，排除 API 路由的客户端引用
      config.resolve.alias["@/app/api"] = false;
    }
    return config;
  },
};
```

**方案 B：保留 Route Handlers，仅在 Web 版使用**

静态导出时 API 路由不会生成可执行端点，但代码仍被打包。这是可接受的，因为：

- 对最终包体积影响很小
- 简化了构建配置
- Web 版仍可正常使用

**推荐方案 B**（简单且有效）。

### 3.6 配置 TypeScript 路径映射

**确保 `tsconfig.json` 中的路径在构建后有效**：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**tsup 会处理这些路径**，转换为相对路径。

### 3.7 添加构建验证脚本

**创建 `scripts/verify-build.js`**：

```javascript
const fs = require("fs");
const path = require("path");

const requiredPaths = [
  "out/index.html",
  "out/_next",
  "dist/api-core/index.js",
  "dist/api-core/index.d.ts",
];

let allExist = true;

for (const p of requiredPaths) {
  const fullPath = path.join(process.cwd(), p);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing: ${p}`);
    allExist = false;
  } else {
    console.log(`✅ Found: ${p}`);
  }
}

if (!allExist) {
  process.exit(1);
}

console.log("\n✅ Build verification passed!");
```

**添加到 package.json**：

```json
{
  "scripts": {
    "verify-build": "node scripts/verify-build.js",
    "electron:build": "pnpm run build:all && pnpm run verify-build && electron-builder"
  }
}
```

## 文件变更清单

| 操作 | 文件                      | 说明                  |
| ---- | ------------------------- | --------------------- |
| 新增 | `tsup.config.ts`          | API 核心构建配置      |
| 新增 | `scripts/verify-build.js` | 构建验证脚本          |
| 修改 | `package.json`            | 更新脚本和 build 配置 |
| 修改 | `next.config.mjs`         | 确保静态导出配置正确  |
| 修改 | `.gitignore`              | 添加 `dist/` 目录     |

## 新增依赖

```json
{
  "devDependencies": {
    "tsup": "^8.0.0"
  }
}
```

## 构建命令速查

| 命令                      | 说明                            |
| ------------------------- | ------------------------------- |
| `pnpm run build`          | Next.js 静态导出 → `out/`       |
| `pnpm run build:api-core` | API 核心构建 → `dist/api-core/` |
| `pnpm run build:all`      | 完整构建（静态 + API 核心）     |
| `pnpm run verify-build`   | 验证构建产物完整性              |
| `pnpm run electron:build` | 完整 Electron 打包              |

## 验收标准

- [ ] `pnpm run build:api-core` 成功生成 `dist/api-core/`
- [ ] `pnpm run build` 成功生成 `out/`
- [ ] `pnpm run verify-build` 通过
- [ ] `pnpm run electron:build` 成功生成安装包
- [ ] 安装包体积合理（< 200MB）
- [ ] 安装后应用能正常启动

## 注意事项

1. **依赖版本锁定**：确保 `pnpm-lock.yaml` 提交到版本控制
2. **原生模块重建**：`better-sqlite3` 需要针对 Electron 版本重建
3. **asar 打包**：原生模块需要 `asarUnpack`
4. **增量构建**：开发时可单独运行 `build:api-core` 加速
5. **CI/CD**：后续可添加 GitHub Actions 自动构建
