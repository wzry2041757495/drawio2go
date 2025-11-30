// 类型安全的 i18n Hook 封装
import { useTranslation, type UseTranslationOptions } from "react-i18next";

import type { Namespace } from "./config";

/**
 * 提供受限于项目命名空间的 `useTranslation` 封装，确保调用方只能使用配置中的 Namespace。
 *
 * 使用示例：
 * ```ts
 * const { t } = useAppTranslation("common");
 * ```
 */
export function useAppTranslation<
  const Ns extends Namespace | readonly Namespace[] | undefined = undefined,
  const KPrefix extends string | undefined = undefined,
>(namespace?: Ns, options?: UseTranslationOptions<KPrefix>) {
  return useTranslation(namespace, options);
}

/**
 * 默认使用 common 命名空间的便捷 Hook，适用于 Toast 等通用文案。
 */
export function useI18n() {
  return useAppTranslation("common");
}
