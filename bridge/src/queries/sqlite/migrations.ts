/**
 * SQLite Migration Queries
 */

/**
 * Create the schema_migrations table if not exists
 */
export const SQLITE_CREATE_MIGRATION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(14) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT (datetime('now')),
    checksum VARCHAR(64) NOT NULL
  );
`;

/**
 * Check if any migrations exist
 */
export const SQLITE_CHECK_MIGRATIONS_EXIST = `SELECT 1 FROM schema_migrations LIMIT 1;`;

/**
 * Insert a migration record
 */
export const SQLITE_INSERT_MIGRATION = `
  INSERT INTO schema_migrations (version, name, checksum)
  VALUES (?, ?, ?);
`;

/**
 * List all applied migrations ordered by version
 */
export const SQLITE_LIST_APPLIED_MIGRATIONS = `
  SELECT version, name, applied_at, checksum
  FROM schema_migrations
  ORDER BY version;
`;

/**
 * Delete a migration record by version
 */
export const SQLITE_DELETE_MIGRATION = `
  DELETE FROM schema_migrations WHERE version = ?;
`;
