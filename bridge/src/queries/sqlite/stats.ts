/**
 * SQLite Statistics Queries
 */

/**
 * Get database statistics (table count)
 * Note: SQLite doesn't track row counts or DB size natively like PostgreSQL.
 * Row counts must be computed per-table, and file size is obtained via the OS.
 */
export const SQLITE_COUNT_TABLES = `
  SELECT COUNT(*) AS total_tables
  FROM sqlite_master
  WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%';
`;

/**
 * Get page count and page size (used to estimate DB size)
 */
export const SQLITE_PAGE_COUNT_PRAGMA = "page_count";
export const SQLITE_PAGE_SIZE_PRAGMA = "page_size";
