/**
 * Electron 打包准备脚本
 * 验证 Next.js 构建产物是否完整，为 electron-builder 做准备
 *
 * 重要：Next.js standalone 模式不会自动复制 public 和 static 目录，
 * 需要在此脚本中手动复制，以确保 i18n locales 等静态资源可用。
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const nextDir = path.join(projectRoot, ".next");
const standaloneDir = path.join(nextDir, "standalone");

/**
 * 递归复制目录
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

console.log("Preparing Electron build...\n");

// 检查 .next 目录是否存在
if (!fs.existsSync(nextDir)) {
  console.error("Error: .next directory not found!");
  console.error("Please run 'npm run build' first.");
  process.exit(1);
}

// 验证关键文件和目录
const requiredPaths = [
  { path: ".next/server", type: "directory", desc: "Next.js server 目录" },
  { path: ".next/static", type: "directory", desc: "Next.js 静态资源" },
  { path: "server.js", type: "file", desc: "自定义服务器" },
  { path: "electron/main.js", type: "file", desc: "Electron 主进程" },
  { path: "electron/preload.js", type: "file", desc: "Electron 预加载脚本" },
  {
    path: "node_modules/better-sqlite3",
    type: "directory",
    desc: "SQLite 原生模块",
  },
];

let allValid = true;

for (const item of requiredPaths) {
  const fullPath = path.join(projectRoot, item.path);
  const exists = fs.existsSync(fullPath);

  if (!exists) {
    console.error(`Error: Missing ${item.type}: ${item.path}`);
    console.error(`       (${item.desc})`);
    allValid = false;
  } else {
    console.log(`✓ ${item.path} (${item.desc})`);
  }
}

if (!allValid) {
  console.error("\nBuild preparation failed. Please fix the issues above.");
  process.exit(1);
}

// 检查 standalone 输出并复制必要的静态资源
if (fs.existsSync(standaloneDir)) {
  console.log(`✓ .next/standalone (Next.js standalone 输出)`);

  // Next.js standalone 模式不会自动复制 public 和 static 目录
  // 必须手动复制，否则 i18n locales 等静态资源无法加载
  // 参考: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files

  // 复制 public 目录到 standalone/public
  const publicSrc = path.join(projectRoot, "public");
  const publicDest = path.join(standaloneDir, "public");
  if (copyDirSync(publicSrc, publicDest)) {
    console.log(`✓ public -> .next/standalone/public (含 i18n locales)`);
  } else {
    console.warn("Warning: public 目录不存在，跳过复制");
  }

  // 复制 .next/static 到 standalone/.next/static
  const staticSrc = path.join(nextDir, "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (copyDirSync(staticSrc, staticDest)) {
    console.log(`✓ .next/static -> .next/standalone/.next/static`);
  } else {
    console.warn("Warning: .next/static 目录不存在，跳过复制");
  }
} else {
  console.warn("Warning: .next/standalone 目录不存在，跳过静态资源复制");
}

// 检查 better-sqlite3 原生模块
const sqliteNodePath = path.join(
  projectRoot,
  "node_modules/better-sqlite3/build/Release",
);
if (fs.existsSync(sqliteNodePath)) {
  const files = fs.readdirSync(sqliteNodePath);
  const nodeFiles = files.filter((f) => f.endsWith(".node"));
  if (nodeFiles.length > 0) {
    console.log(`✓ better-sqlite3 原生模块: ${nodeFiles.join(", ")}`);
  } else {
    console.warn(
      "Warning: better-sqlite3 原生模块 (.node) 未找到，可能需要运行 npm run rebuild",
    );
  }
} else {
  console.warn(
    "Warning: better-sqlite3/build/Release 目录不存在，可能需要运行 npm run rebuild",
  );
}

console.log("\n✓ Electron build preparation complete!");
console.log("  Running electron-builder...\n");
