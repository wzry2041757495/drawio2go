# i18n 工具函数库

## 模块概述

`app/lib/i18n/` 是国际化 **工具函数层**，与 `app/i18n/` **配置层** 相辅相成。

- **app/i18n/**: i18next 核心配置、初始化、Provider 管理（参见 [@app/i18n/AGENTS.md](../i18n/AGENTS.md)）
- **app/lib/i18n/**: 业务层国际化辅助函数，提供更高阶的 API 和工具

**职责**：

1. 提供应用级的国际化辅助函数（如格式化、验证、转换）
2. 封装与特定业务场景相关的翻译逻辑
3. 统一国际化相关的工具和 Hook（若 app/i18n/ 的 useAppTranslation 不够用）
4. 处理动态文案生成、复数形式、日期/时间/数字本地化等高级需求
5. 提供国际化相关的常量、配置预设

## 目录结构

```
app/lib/i18n/
├── AGENTS.md                    # 本文档
├── locale-utils.ts              # 语言工具函数（语言检测、验证、转换）
├── message-utils.ts             # 文案工具函数（动态构建、插值、复数）
├── validation-messages.ts       # 表单验证文案生成器
├── error-messages.ts            # 错误信息文案生成器
├── datetime-formatter.ts        # 日期时间本地化格式化
├── number-formatter.ts          # 数字、货币、百分比本地化格式化
└── constants.ts                 # i18n 相关常量预设（如日期格式、数字精度等）
```

> **注**：目前目录为空，上述文件为规划清单，待实现

## 核心工具函数 API（规划）

### locale-utils.ts

```typescript
// 语言验证
export function isValidLocale(locale: unknown): locale is Locale;
export function normalizeLocale(locale: string): Locale;

// 语言特性检测
export function isRTLLocale(locale: Locale): boolean; // 右到左 (如阿拉伯语)
export function isAsianLocale(locale: Locale): boolean; // 亚洲语言

// 地区/语言扩展信息
export interface LocaleInfo {
  code: Locale;
  name: string; // 英文名称
  nativeName: string; // 本地语言名称
  isRTL: boolean;
  dateFormat: string; // 默认日期格式
  timeFormat: string; // 默认时间格式
  currency?: string; // 默认货币代码
}

export function getLocaleInfo(locale: Locale): LocaleInfo;
```

### message-utils.ts

```typescript
// 动态文案构建（用于复杂的条件文案）
export function buildMessage(
  messageKey: string,
  variables: Record<string, string | number>,
  options?: { locale?: Locale },
): string;

// 复数形式处理（虽然 i18next 原生支持，但提供更便利的 API）
export function getPluralForm(
  count: number,
  singular: string,
  plural: string,
  options?: { locale?: Locale },
): string;

// 文案安全性检查（检查缺失的翻译占位符）
export interface MessageValidationResult {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
}

export function validateMessageKeys(
  namespace: Namespace,
  locale: Locale,
  keys: string[],
): MessageValidationResult;
```

### validation-messages.ts

```typescript
// 表单验证文案生成
export interface ValidationMessageParams {
  fieldName: string;
  value?: string | number;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  [key: string]: unknown;
}

export function getValidationMessage(
  rule: string, // 如 'required', 'email', 'minLength'
  params: ValidationMessageParams,
  locale?: Locale,
): string;

// 常见验证规则的快捷函数
export function getRequiredMessage(fieldName: string, locale?: Locale): string;
export function getEmailMessage(locale?: Locale): string;
export function getMinLengthMessage(min: number, locale?: Locale): string;
export function getMaxLengthMessage(max: number, locale?: Locale): string;
```

### error-messages.ts

```typescript
// 错误信息映射生成
export function getErrorMessage(
  errorCode: string,
  context?: Record<string, unknown>,
  locale?: Locale,
): string;

// 常见错误的快捷函数
export function getNetworkErrorMessage(locale?: Locale): string;
export function getTimeoutErrorMessage(locale?: Locale): string;
export function getValidationErrorMessage(
  field: string,
  locale?: Locale,
): string;
export function getAuthErrorMessage(code: string, locale?: Locale): string;
```

### datetime-formatter.ts

```typescript
export interface DateTimeFormatOptions {
  locale?: Locale;
  format?: "short" | "medium" | "long" | "full"; // 预设格式
  custom?: string; // 自定义 format 字符串
}

// 日期格式化
export function formatDate(
  date: Date | number,
  options?: DateTimeFormatOptions,
): string;

// 时间格式化
export function formatTime(
  date: Date | number,
  options?: DateTimeFormatOptions,
): string;

// 日期+时间格式化
export function formatDateTime(
  date: Date | number,
  options?: DateTimeFormatOptions,
): string;

// 相对时间（如 "2 days ago", "刚刚"）
export function formatRelativeTime(
  date: Date | number,
  locale?: Locale,
): string;

// 获取语言本地化的日期范围表示
export function formatDateRange(
  startDate: Date | number,
  endDate: Date | number,
  options?: DateTimeFormatOptions,
): string;
```

### number-formatter.ts

```typescript
export interface NumberFormatOptions {
  locale?: Locale;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

// 普通数字格式化
export function formatNumber(
  value: number,
  options?: NumberFormatOptions,
): string;

// 货币格式化
export function formatCurrency(
  value: number,
  currencyCode?: string,
  options?: NumberFormatOptions,
): string;

// 百分比格式化
export function formatPercent(
  value: number,
  options?: NumberFormatOptions,
): string;

// 字节大小格式化（B, KB, MB, GB）
export function formatBytes(
  bytes: number,
  locale?: Locale,
  decimals?: number,
): string;
```

### constants.ts

```typescript
// 日期格式预设
export const DATE_FORMATS = {
  SHORT: "y-MM-dd", // 2025-11-30
  MEDIUM: "MMM d, y", // Nov 30, 2025
  LONG: "MMMM d, yyyy", // November 30, 2025
} as const;

// 时间格式预设
export const TIME_FORMATS = {
  SHORT: "HH:mm", // 16:48
  MEDIUM: "HH:mm:ss", // 16:48:30
  LONG: "HH:mm:ss z", // 16:48:30 CST
} as const;

// 数字精度预设
export const NUMBER_PRECISION = {
  DEFAULT: 2, // 默认小数位
  PERCENT: 2,
  CURRENCY: 2,
} as const;

// 国际化翻译命名空间（与 app/i18n/config.ts 保持同步）
export const SUPPORTED_NAMESPACES = [
  "common",
  "topbar",
  "sidebar",
  "chat",
  "settings",
  "project",
  "errors",
  "validation",
  "version",
] as const;
```

## 与 app/i18n/ 配置的关系

```
app/i18n/config.ts, client.ts, hooks.ts, Provider
            ↓
    (初始化、配置、i18n 实例)
            ↓
app/lib/i18n/* (工具函数)
            ↓
    (业务层使用：验证、格式化、生成文案等)
```

**数据流**：

1. `app/i18n/client.ts` 初始化全局 i18next 实例
2. `app/i18n/hooks.ts` 提供 useAppTranslation Hook
3. `app/lib/i18n/*` 基于 useAppTranslation 构建更高级的业务工具
4. 组件调用工具函数完成国际化需求

## 使用示例

### 示例 1：表单验证文案

```typescript
"use client";

import { getValidationMessage, getRequiredMessage } from "@/app/lib/i18n/validation-messages";
import { useAppTranslation } from "@/app/i18n/hooks";

export default function LoginForm() {
  const { i18n } = useAppTranslation("validation");

  const handleSubmit = (formData: Record<string, string>) => {
    const errors: Record<string, string> = {};

    // 使用工具函数生成验证文案
    if (!formData.email) {
      errors.email = getRequiredMessage("Email", i18n.language as Locale);
    }

    if (formData.password?.length < 8) {
      errors.password = getValidationMessage("minLength", {
        fieldName: "Password",
        minLength: 8,
      }, i18n.language as Locale);
    }

    // 显示错误...
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
    </form>
  );
}
```

### 示例 2：错误处理和日期格式化

```typescript
import { getErrorMessage } from "@/app/lib/i18n/error-messages";
import { formatDateTime } from "@/app/lib/i18n/datetime-formatter";
import { useAppTranslation } from "@/app/i18n/hooks";

export default function ProjectCard({ project }) {
  const { i18n } = useAppTranslation("common");

  const handleDelete = async () => {
    try {
      // 删除项目...
    } catch (error) {
      const errorMsg = getErrorMessage(
        error.code,
        { projectName: project.name },
        i18n.language as Locale
      );
      showToast(errorMsg);
    }
  };

  const createdTime = formatDateTime(project.created_at, {
    locale: i18n.language as Locale,
    format: 'medium'
  });

  return (
    <Card>
      <p>{project.name}</p>
      <p>Created: {createdTime}</p>
      <button onClick={handleDelete}>Delete</button>
    </Card>
  );
}
```

## 注意事项

### 1. 依赖 i18next 初始化

所有工具函数都依赖 `app/i18next/client.ts` 已初始化。在组件中使用时，必须确保 `I18nProvider` 已包裹组件树。

### 2. 类型安全

工具函数应接受可选的 `locale` 参数，未提供时从 `i18n.language` 推断。使用 TypeScript 约束 Locale 类型，避免拼写错误。

### 3. 翻译文件对应

所有 **生成文案的函数** 都应与 `public/locales/{{lng}}/{{ns}}.json` 中的翻译文件结构对应。

- `validation-messages.ts` → `validation.json`
- `error-messages.ts` → `errors.json`
- `datetime-formatter.ts` → 使用 i18next 原生格式化 (date-fns/intl 集成)

### 4. 性能考虑

- **缓存 Intl 对象**: DatetimeFormatter 和 NumberFormatter 应缓存 Intl.DateTimeFormat 等对象，避免重复创建
- **按需加载**: 仅在使用时导入需要的模块
- **避免在渲染时构建**: 不应在 render 函数中调用复杂的格式化逻辑，考虑 useMemo

### 5. 测试覆盖

每个工具函数应包含单元测试，覆盖：

- 多种 Locale 的行为
- 边界值（0、负数、超大数字、特殊日期等）
- 参数缺失的降级行为

### 6. 扩展性

预留扩展接口以支持新语言和地区特异性，如：

- 货币符号位置 (前/后)
- 数字分组符号 (逗号/空格/点)
- 日期顺序 (年/月/日 vs 月/日/年 vs 日/月/年)

## 相关引用

- **配置层**: [@app/i18n/AGENTS.md](../i18n/AGENTS.md) — i18next 核心配置和初始化
- **翻译文件**: `/home/aaa/Code/drawio2go/public/locales/` — 多语言翻译资源
- **工具库索引**: [@app/lib/AGENTS.md](./AGENTS.md) — 工具函数库总览

## 开发路线图（待实现）

1. **Phase 1**: locale-utils 和 constants (基础)
2. **Phase 2**: message-utils 和 validation-messages
3. **Phase 3**: error-messages 和 datetime-formatter
4. **Phase 4**: number-formatter 和完整测试覆盖
5. **Phase 5**: 集成到现有组件，替换硬编码的国际化逻辑
