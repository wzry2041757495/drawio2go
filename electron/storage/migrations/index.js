const { applySQLiteV1Migration } = require("./v1");

const SQLITE_SCHEMA_VERSION = 1;

function runSQLiteMigrations(db) {
  const currentVersion = db.pragma("user_version", { simple: true }) || 0;

  if (currentVersion < 1) {
    console.log(
      `[SQLite] Applying v1 migration (current version: ${currentVersion})`,
    );
    applySQLiteV1Migration(db);
  }

  db.pragma(`user_version = ${SQLITE_SCHEMA_VERSION}`);
}

module.exports = {
  runSQLiteMigrations,
  SQLITE_SCHEMA_VERSION,
};
