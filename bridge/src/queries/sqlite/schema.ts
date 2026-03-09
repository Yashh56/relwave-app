/**
 * SQLite Schema-related Queries (PRAGMA-based)
 */

/**
 * List all user tables (excluding sqlite internal tables)
 */
export const SQLITE_LIST_TABLES = `
  SELECT 'main' AS schema, name, type
  FROM sqlite_master
  WHERE type IN ('table', 'view')
    AND name NOT LIKE 'sqlite_%'
  ORDER BY name;
`;

/**
 * List all attached databases (schemas)
 */
export const SQLITE_LIST_SCHEMAS = `PRAGMA database_list;`;
