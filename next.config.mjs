/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化 HeroUI 导入
  transpilePackages: ["@heroui/react", "@heroui/styles"],

  // 实验性功能：优化包导入
  experimental: {
    optimizePackageImports: ["@heroui/react"],
  },

  // 使用 standalone 模式以支持 API Routes 和 SSR
  // Electron 生产模式需要内嵌完整服务器
  output: "standalone",

  // 图片优化配置
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
