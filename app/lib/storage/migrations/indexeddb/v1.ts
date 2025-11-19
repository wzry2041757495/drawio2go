import type { IDBPDatabase, IDBPObjectStore, IDBPTransaction } from "idb";

type VersionChangeStore = IDBPObjectStore<
  unknown,
  ArrayLike<string>,
  string,
  "versionchange"
>;

const INDEX_OPTIONS = { unique: false } as const;

function hasIndex(store: VersionChangeStore, name: string): boolean {
  const list = store.indexNames;
  if (!list) {
    return false;
  }
  if (typeof list.contains === "function") {
    return list.contains(name);
  }
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === name) {
      return true;
    }
  }
  return false;
}

function ensureIndex(store: VersionChangeStore, name: string, keyPath: string) {
  if (!hasIndex(store, name)) {
    store.createIndex(name, keyPath, INDEX_OPTIONS);
  }
}

function ensureStore(
  db: IDBPDatabase<unknown>,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
  name: string,
  options: IDBObjectStoreParameters,
): VersionChangeStore {
  if (!db.objectStoreNames.contains(name)) {
    return db.createObjectStore(name, options) as VersionChangeStore;
  }
  return tx.objectStore(name) as VersionChangeStore;
}

export function applyIndexedDbV1Migration(
  db: IDBPDatabase<unknown>,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
) {
  ensureStore(db, tx, "settings", { keyPath: "key" });
  ensureStore(db, tx, "projects", { keyPath: "uuid" });

  const xmlStore = ensureStore(db, tx, "xml_versions", { keyPath: "id" });
  ensureIndex(xmlStore, "project_uuid", "project_uuid");
  ensureIndex(xmlStore, "source_version_id", "source_version_id");

  const convStore = ensureStore(db, tx, "conversations", { keyPath: "id" });
  ensureIndex(convStore, "project_uuid", "project_uuid");

  const msgStore = ensureStore(db, tx, "messages", { keyPath: "id" });
  ensureIndex(msgStore, "conversation_id", "conversation_id");
  ensureIndex(msgStore, "xml_version_id", "xml_version_id");
}
