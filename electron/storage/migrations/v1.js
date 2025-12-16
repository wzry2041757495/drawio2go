const defaultLogger = {
  info: (...args) => console.log("[SQLiteMigration]", ...args),
  warn: (...args) => console.warn("[SQLiteMigration]", ...args),
  error: (...args) => console.error("[SQLiteMigration]", ...args),
};

/**
 * V1 迁移：创建全部表、索引和外键，幂等可重复执行。
 * @param {import("better-sqlite3")} db
 * @param {{info?: Function, warn?: Function, error?: Function}} logger
 */
function applySQLiteV1Migration(db, logger = defaultLogger) {
  const log = logger || defaultLogger;
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        active_xml_version_id TEXT,
        active_conversation_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

      CREATE TABLE IF NOT EXISTS xml_versions (
        id TEXT PRIMARY KEY,
        project_uuid TEXT NOT NULL,
        semantic_version TEXT NOT NULL,
        name TEXT,
        description TEXT,
        source_version_id TEXT NOT NULL,
        is_keyframe INTEGER NOT NULL,
        diff_chain_depth INTEGER NOT NULL,
        xml_content TEXT NOT NULL,
        metadata TEXT,
        page_count INTEGER NOT NULL,
        page_names TEXT,
        preview_svg BLOB,
        pages_svg BLOB,
        preview_image BLOB,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (project_uuid) REFERENCES projects(uuid) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_xml_versions_project ON xml_versions(project_uuid);
      CREATE INDEX IF NOT EXISTS idx_xml_versions_source_version ON xml_versions(source_version_id);
      CREATE INDEX IF NOT EXISTS idx_xml_versions_created_at ON xml_versions(created_at);

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_uuid TEXT NOT NULL,
        title TEXT NOT NULL,
        is_streaming INTEGER NOT NULL DEFAULT 0,
        streaming_since INTEGER DEFAULT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_uuid) REFERENCES projects(uuid) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_uuid);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        parts_structure TEXT NOT NULL,
        model_name TEXT,
        xml_version_id TEXT,
        sequence_number INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (xml_version_id) REFERENCES xml_versions(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_xml_version ON messages(xml_version_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sequence ON messages(conversation_id, sequence_number);

      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'image',
        mime_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        file_path TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_conversation_id ON attachments(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

      CREATE TABLE IF NOT EXISTS conversation_sequences (
        conversation_id TEXT PRIMARY KEY,
        last_sequence INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      PRAGMA user_version = 1;
    `);
  });

  migrate();
  log.info("Applied SQLite V1 migration (idempotent)");
}

module.exports = {
  applySQLiteV1Migration,
};
