import type { IDBPDatabase, IDBPObjectStore, IDBPTransaction } from "idb";

// Type alias 便于约束 upgrade 事务
export type IndexedDbUpgradeTransaction = IDBPTransaction<
  unknown,
  string[],
  "versionchange"
>;

type UpgradeObjectStore = IDBPObjectStore<
  unknown,
  string[],
  string,
  "versionchange"
>;

const hasIndex = (store: UpgradeObjectStore, name: string): boolean => {
  const names = Array.from(store.indexNames || []);
  return names.includes(name);
};

const ensureIndex = (
  store: UpgradeObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
) => {
  if (!hasIndex(store, name)) {
    store.createIndex(name, keyPath, options);
  }
};

const getOrCreateStore = (
  db: IDBPDatabase<unknown>,
  tx: IndexedDbUpgradeTransaction,
  name: string,
  options: IDBObjectStoreParameters,
): UpgradeObjectStore => {
  if (db.objectStoreNames.contains(name)) {
    return tx.objectStore(name);
  }
  return db.createObjectStore(name, options);
};

/**
 * V1 迁移：完整建表 + 索引，幂等可重复执行
 */
export function applyIndexedDbV1Migration(
  db: IDBPDatabase<unknown>,
  tx: IndexedDbUpgradeTransaction,
): void {
  // settings
  const settingsStore = getOrCreateStore(db, tx, "settings", {
    keyPath: "key",
  });
  ensureIndex(settingsStore, "by_key", "key", { unique: true });

  // projects
  const projectsStore = getOrCreateStore(db, tx, "projects", {
    keyPath: "uuid",
  });
  ensureIndex(projectsStore, "by_uuid", "uuid", { unique: true });
  ensureIndex(projectsStore, "by_created_at", "created_at", {
    unique: false,
  });

  // xml_versions
  const xmlVersionsStore = getOrCreateStore(db, tx, "xml_versions", {
    keyPath: "id",
  });
  ensureIndex(xmlVersionsStore, "project_uuid", "project_uuid", {
    unique: false,
  });
  ensureIndex(xmlVersionsStore, "source_version_id", "source_version_id", {
    unique: false,
  });
  ensureIndex(xmlVersionsStore, "semantic_version", "semantic_version", {
    unique: false,
  });
  ensureIndex(xmlVersionsStore, "created_at", "created_at", {
    unique: false,
  });

  // conversations
  const conversationsStore = getOrCreateStore(db, tx, "conversations", {
    keyPath: "id",
  });
  ensureIndex(conversationsStore, "project_uuid", "project_uuid", {
    unique: false,
  });
  ensureIndex(conversationsStore, "updated_at", "updated_at", {
    unique: false,
  });
  ensureIndex(conversationsStore, "created_at", "created_at", {
    unique: false,
  });

  // messages
  const messagesStore = getOrCreateStore(db, tx, "messages", {
    keyPath: "id",
  });
  ensureIndex(messagesStore, "conversation_id", "conversation_id", {
    unique: false,
  });
  ensureIndex(messagesStore, "xml_version_id", "xml_version_id", {
    unique: false,
  });
  ensureIndex(
    messagesStore,
    "conversation_id_sequence_number",
    ["conversation_id", "sequence_number"],
    { unique: false },
  );

  // attachments
  const attachmentsStore = getOrCreateStore(db, tx, "attachments", {
    keyPath: "id",
  });
  ensureIndex(attachmentsStore, "message_id", "message_id", { unique: false });
  ensureIndex(attachmentsStore, "conversation_id", "conversation_id", {
    unique: false,
  });
  ensureIndex(attachmentsStore, "created_at", "created_at", {
    unique: false,
  });

  // conversation_sequences
  if (!db.objectStoreNames.contains("conversation_sequences")) {
    db.createObjectStore("conversation_sequences", {
      keyPath: "conversation_id",
    });
  }
}
