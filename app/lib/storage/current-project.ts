import { DEFAULT_PROJECT_UUID } from "./constants";
import { getStorage } from "./storage-factory";
import type { StorageAdapter } from "./adapter";

/**
 * currentProjectId 的统一存储键名
 */
export const CURRENT_PROJECT_SETTING_KEY = "currentProjectId";

/**
 * 从统一存储层读取当前工程 ID
 * @param storage 复用外部已经获取的 StorageAdapter（可选）
 */
export async function getStoredCurrentProjectId(
  storage?: StorageAdapter,
): Promise<string | null> {
  const adapter = storage ?? (await getStorage());
  return adapter.getSetting(CURRENT_PROJECT_SETTING_KEY);
}

/**
 * 将当前工程 ID 写入统一存储层
 *
 * @param projectUuid 工程 UUID
 * @param storage 可选：复用已有的 StorageAdapter
 */
export async function persistCurrentProjectId(
  projectUuid: string,
  storage?: StorageAdapter,
): Promise<void> {
  const adapter = storage ?? (await getStorage());
  await adapter.setSetting(CURRENT_PROJECT_SETTING_KEY, projectUuid);
}

/**
 * 解析当前工程 UUID，若未设置则返回默认工程
 */
export async function resolveCurrentProjectUuid(
  storage?: StorageAdapter,
): Promise<string> {
  const adapter = storage ?? (await getStorage());
  const stored = await getStoredCurrentProjectId(adapter);
  return stored ?? DEFAULT_PROJECT_UUID;
}
