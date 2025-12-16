const { applySQLiteV1Migration } = require("./v1");
const { STORAGE_VERSION } = require("../shared/constants-shared");

const defaultLogger = {
  info: (...args) => console.log("[SQLiteMigration]", ...args),
  warn: (...args) => console.warn("[SQLiteMigration]", ...args),
  error: (...args) => console.error("[SQLiteMigration]", ...args),
};

/**
 * 执行 SQLite 迁移（基于 PRAGMA user_version）。
 * @param {import("better-sqlite3")} db
 * @param {{info?: Function, warn?: Function, error?: Function}} logger
 * @returns {number} 应用后的版本号
 */
function runSQLiteMigrations(db, logger = defaultLogger) {
  const log = logger || defaultLogger;
  const currentVersion = Number(
    db.pragma("user_version", { simple: true }) || 0,
  );
  const targetVersion = STORAGE_VERSION;

  log.info("Run SQLite migrations", { currentVersion, targetVersion });

  if (currentVersion > targetVersion) {
    log.warn("SQLite user_version is ahead of migration scripts", {
      currentVersion,
      targetVersion,
    });
    return currentVersion;
  }

  if (currentVersion === targetVersion) {
    log.info("SQLite schema up-to-date", { version: currentVersion });
    return currentVersion;
  }

  for (let next = currentVersion + 1; next <= targetVersion; next += 1) {
    if (next === 1) {
      log.info("Applying SQLite V1 migration");
      applySQLiteV1Migration(db, log);
    } else {
      log.warn("No SQLite migration handler for version", { version: next });
    }
  }

  return targetVersion;
}

module.exports = {
  runSQLiteMigrations,
  applySQLiteV1Migration,
};
