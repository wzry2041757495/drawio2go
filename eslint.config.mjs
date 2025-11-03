import { FlatCompat } from "@eslint/eslintrc";
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
            ".next/**",
            "out/**",
            "dist/**",
            "node_modules/**",
            "electron/dist/**",
            "*.config.js",
            "*.config.mjs",
        ],
    },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        files: ["server.js", "electron/**/*.js"],
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