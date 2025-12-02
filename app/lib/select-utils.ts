import type { Key } from "react";
import type { Selection } from "react-aria-components";

/**
 * 从 HeroUI v3 Select 的 Selection 集合中提取首个键值。
 * 返回字符串形式，便于后续与配置信息或枚举匹配。
 */
export function extractSingleKey(selection: Selection): string | null {
  if (selection === "all") return null;
  const keys = Array.from(selection);
  if (!keys.length) return null;
  const first = keys[0];
  if (typeof first === "number" || typeof first === "bigint") {
    return String(first);
  }
  return first as string;
}

/**
 * 将 React Aria 的 Selection 事件值标准化为 Selection 对象，
 * 以便统一处理 HeroUI v3 Select 的 onSelectionChange 回调。
 */
export function normalizeSelection(
  value: Selection | Key | null,
): Selection | null {
  if (value === null) return null;
  if (value === "all") return "all";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    return new Set([value]) as Selection;
  }
  return value;
}
