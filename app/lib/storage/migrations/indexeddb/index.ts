import type { IDBPDatabase, IDBPTransaction } from "idb";
import { applyIndexedDbV1Migration } from "./v1";

export function runIndexedDbMigrations(
  db: IDBPDatabase<unknown>,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
) {
  if (oldVersion < 1) {
    applyIndexedDbV1Migration(db, tx);
  }

  console.log(
    `[IndexedDB] Applied migrations up to v${newVersion ?? "unknown"}`,
  );
}
