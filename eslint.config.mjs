import { FlatCompat } from "@eslint/eslintrc";
import sonarjs from "eslint-plugin-sonarjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      "**/.next/**",
      ".open-next/**",
      "out/**",
      "dist/**",
      "node_modules/**",
      "electron/dist/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // SonarJS 推荐规则集
  sonarjs.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // SonarJS 规则调整
      "sonarjs/cognitive-complexity": ["warn", 25], // 认知复杂度阈值
      "sonarjs/no-duplicate-string": ["warn", { threshold: 6 }], // 重复字符串阈值
      "sonarjs/no-identical-functions": "warn", // 重复函数检测
    },
  },
  {
    files: ["server.js", "electron/**/*.js", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];
