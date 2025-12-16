import type { IDBPDatabase } from "idb";
import { createLogger } from "@/lib/logger";
import { STORAGE_VERSION } from "../../constants";
import {
  applyIndexedDbV1Migration,
  type IndexedDbUpgradeTransaction,
} from "./v1";

const logger = createLogger("IndexedDBMigration");

/**
 * 执行 IndexedDB 迁移（从 oldVersion → newVersion）
 */
export function runIndexedDbMigrations(
  db: IDBPDatabase<unknown>,
  oldVersion: number,
  newVersion: number | null,
  tx: IndexedDbUpgradeTransaction,
): void {
  const targetVersion =
    typeof newVersion === "number" ? newVersion : STORAGE_VERSION;

  logger.info("Run IndexedDB migrations", {
    oldVersion,
    targetVersion,
    storageVersion: STORAGE_VERSION,
  });

  for (let next = oldVersion + 1; next <= targetVersion; next += 1) {
    if (next === 1) {
      logger.info("Applying IndexedDB V1 migration");
      applyIndexedDbV1Migration(db, tx);
      logger.info("IndexedDB V1 migration done");
    } else {
      logger.warn("No IndexedDB migration handler for version", {
        version: next,
      });
    }
  }
}

export { applyIndexedDbV1Migration } from "./v1";
