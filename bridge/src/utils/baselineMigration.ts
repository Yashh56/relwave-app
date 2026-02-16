import fs from "fs";
import path from "path";
import type {
    ColumnDetail,
    ForeignKeyInfo,
    IndexInfo,
    UniqueConstraintInfo,
    CheckConstraintInfo,
    PrimaryKeyInfo,
} from "../types/common";

// ─── Types ──────────────────────────────────────────

export type TableMetadata = {
    columns: ColumnDetail[];
    primaryKeys: PrimaryKeyInfo[];
    foreignKeys: ForeignKeyInfo[];
    indexes: IndexInfo[];
    uniqueConstraints: UniqueConstraintInfo[];
    checkConstraints: CheckConstraintInfo[];
};

export type SchemaTableMap = Map<string, TableMetadata>;

export type BaselineSchemaInput = {
    schemaName: string;
    tables: SchemaTableMap;
    enumTypes?: { schema_name: string; enum_name: string; enum_value: string }[];
};

// ─── Identifier quoting ─────────────────────────────

type DbType = "mysql" | "postgres" | "mariadb";

function q(name: string, dbType: DbType): string {
    if (dbType === "mysql" || dbType === "mariadb") {
        return `\`${name.replace(/`/g, "``")}\``;
    }
    return `"${name.replace(/"/g, '""')}"`;
}

function tableRef(schema: string, table: string, dbType: DbType): string {
    return `${q(schema, dbType)}.${q(table, dbType)}`;
}

// ─── Core: generate CREATE TABLE SQL from metadata ──

/**
 * Generate a complete CREATE TABLE statement for a single table
 * from its introspected metadata.
 */
export function generateCreateTableSQL(
    schemaName: string,
    tableName: string,
    meta: TableMetadata,
    dbType: DbType,
    enumTypes?: { schema_name: string; enum_name: string; enum_value: string }[]
): string {
    const lines: string[] = [];
    const ref = tableRef(schemaName, tableName, dbType);

    // ── Column definitions ──
    for (const col of meta.columns) {
        let def = `  ${q(col.name, dbType)} ${col.type}`;
        if (col.not_nullable) def += " NOT NULL";
        if (col.default_value != null && col.default_value !== "") {
            def += ` DEFAULT ${col.default_value}`;
        }
        lines.push(def);
    }

    // ── Composite primary key (only if >1 PK column) ──
    const pkCols = meta.primaryKeys.map((pk) => pk.column_name);
    if (pkCols.length > 1) {
        lines.push(
            `  PRIMARY KEY (${pkCols.map((c) => q(c, dbType)).join(", ")})`
        );
    } else if (pkCols.length === 1) {
        // Check if column def already has PK flag from type (e.g. SERIAL)
        const alreadyInline = meta.columns.some(
            (c) => c.name === pkCols[0] && c.is_primary_key
        );
        // Always emit explicit PK constraint for clarity
        if (!alreadyInline || meta.columns.length > 1) {
            lines.push(
                `  PRIMARY KEY (${q(pkCols[0], dbType)})`
            );
        }
    }

    // ── Unique constraints (multi-column grouped) ──
    const uniqueGroups = new Map<string, string[]>();
    for (const uc of meta.uniqueConstraints) {
        if (!uniqueGroups.has(uc.constraint_name)) {
            uniqueGroups.set(uc.constraint_name, []);
        }
        uniqueGroups.get(uc.constraint_name)!.push(uc.column_name);
    }
    for (const [constraintName, cols] of uniqueGroups) {
        lines.push(
            `  CONSTRAINT ${q(constraintName, dbType)} UNIQUE (${cols.map((c) => q(c, dbType)).join(", ")})`
        );
    }

    // ── Check constraints ──
    for (const cc of meta.checkConstraints) {
        const clause = cc.definition || cc.check_clause;
        if (clause) {
            lines.push(
                `  CONSTRAINT ${q(cc.constraint_name, dbType)} CHECK (${clause})`
            );
        }
    }

    // ── Foreign keys ──
    // Group multi-column FKs by constraint name
    const fkGroups = new Map<string, ForeignKeyInfo[]>();
    for (const fk of meta.foreignKeys) {
        if (!fkGroups.has(fk.constraint_name)) {
            fkGroups.set(fk.constraint_name, []);
        }
        fkGroups.get(fk.constraint_name)!.push(fk);
    }
    for (const [constraintName, fkCols] of fkGroups) {
        const srcCols = fkCols.map((f) => q(f.source_column, dbType)).join(", ");
        const tgtCols = fkCols.map((f) => q(f.target_column, dbType)).join(", ");
        const first = fkCols[0];
        const tgtRef = tableRef(first.target_schema, first.target_table, dbType);
        let fkDef = `  CONSTRAINT ${q(constraintName, dbType)} FOREIGN KEY (${srcCols}) REFERENCES ${tgtRef} (${tgtCols})`;
        if (first.delete_rule && first.delete_rule !== "NO ACTION") {
            fkDef += ` ON DELETE ${first.delete_rule}`;
        }
        if (first.update_rule && first.update_rule !== "NO ACTION") {
            fkDef += ` ON UPDATE ${first.update_rule}`;
        }
        lines.push(fkDef);
    }

    const body = lines.join(",\n");
    return `CREATE TABLE ${ref} (\n${body}\n);`;
}

/**
 * Generate CREATE INDEX statements for non-primary, non-unique indexes.
 */
export function generateCreateIndexSQL(
    schemaName: string,
    tableName: string,
    meta: TableMetadata,
    dbType: DbType
): string[] {
    // Group index columns by index_name
    const indexGroups = new Map<string, { cols: string[]; unique: boolean; type: string }>();
    for (const idx of meta.indexes) {
        // Skip primary key indexes and unique constraint indexes (already handled)
        if (idx.is_primary) continue;
        if (idx.is_unique) continue; // unique constraints handled above

        if (!indexGroups.has(idx.index_name)) {
            indexGroups.set(idx.index_name, { cols: [], unique: false, type: idx.index_type });
        }
        indexGroups.get(idx.index_name)!.cols.push(idx.column_name);
    }

    const statements: string[] = [];
    const ref = tableRef(schemaName, tableName, dbType);

    for (const [indexName, info] of indexGroups) {
        const cols = info.cols.map((c) => q(c, dbType)).join(", ");
        let stmt = `CREATE INDEX ${q(indexName, dbType)} ON ${ref} (${cols})`;
        // Add USING clause for non-default index types (postgres)
        if (dbType === "postgres" && info.type && info.type.toLowerCase() !== "btree") {
            stmt = `CREATE INDEX ${q(indexName, dbType)} ON ${ref} USING ${info.type} (${cols})`;
        }
        statements.push(stmt + ";");
    }

    return statements;
}

/**
 * Generate Postgres CREATE TYPE ... AS ENUM statements.
 */
export function generateEnumTypeSQL(
    enumTypes: { schema_name: string; enum_name: string; enum_value: string }[]
): string[] {
    if (!enumTypes || enumTypes.length === 0) return [];

    // Group enum values by schema_name + enum_name
    const enumGroups = new Map<string, { schema: string; name: string; values: string[] }>();
    for (const e of enumTypes) {
        const key = `${e.schema_name}.${e.enum_name}`;
        if (!enumGroups.has(key)) {
            enumGroups.set(key, { schema: e.schema_name, name: e.enum_name, values: [] });
        }
        enumGroups.get(key)!.values.push(e.enum_value);
    }

    return Array.from(enumGroups.values()).map((g) => {
        const vals = g.values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
        return `CREATE TYPE "${g.schema}"."${g.name}" AS ENUM (${vals});`;
    });
}

// ─── Full baseline from multiple schemas ────────────

/**
 * Generate a complete baseline migration SQL from all schemas.
 *
 * The output is a single migration file with:
 * - +up: CREATE TYPE (enums), CREATE TABLE, CREATE INDEX for every table
 * - +down: DROP TABLE in reverse order
 *
 * Tables are topologically sorted so that foreign key targets are created first.
 */
export function generateBaselineMigrationSQL(
    schemas: BaselineSchemaInput[],
    dbType: DbType
): { upSQL: string; downSQL: string } {
    const upParts: string[] = [];
    const dropParts: string[] = [];

    upParts.push("-- ============================================");
    upParts.push("-- Baseline migration: existing database schema");
    upParts.push("-- Generated by RelWave");
    upParts.push("-- ============================================");
    upParts.push("");

    for (const schema of schemas) {
        // ── Enum types (Postgres) ──
        const enumStmts = generateEnumTypeSQL(schema.enumTypes || []);
        if (enumStmts.length > 0) {
            upParts.push(`-- Enum types in schema: ${schema.schemaName}`);
            upParts.push(...enumStmts);
            upParts.push("");
        }

        // ── Sort tables: FKs targets first (topological) ──
        const sorted = topologicalSortTables(schema.schemaName, schema.tables);

        upParts.push(`-- Tables in schema: ${schema.schemaName}`);
        upParts.push("");

        for (const tableName of sorted) {
            const meta = schema.tables.get(tableName)!;

            // CREATE TABLE
            upParts.push(generateCreateTableSQL(
                schema.schemaName, tableName, meta, dbType, schema.enumTypes
            ));
            upParts.push("");

            // CREATE INDEX (non-PK, non-unique)
            const indexStmts = generateCreateIndexSQL(
                schema.schemaName, tableName, meta, dbType
            );
            if (indexStmts.length > 0) {
                upParts.push(...indexStmts);
                upParts.push("");
            }

            // DROP TABLE (reverse order for down migration)
            dropParts.unshift(
                `DROP TABLE IF EXISTS ${tableRef(schema.schemaName, tableName, dbType)} CASCADE;`
            );
        }
    }

    // Down also drops enum types
    for (const schema of schemas) {
        const enumStmts = generateEnumTypeSQL(schema.enumTypes || []);
        if (enumStmts.length > 0) {
            for (const stmt of enumStmts) {
                const typeName = stmt.match(/CREATE TYPE (.+?) AS ENUM/)?.[1];
                if (typeName) {
                    dropParts.push(`DROP TYPE IF EXISTS ${typeName} CASCADE;`);
                }
            }
        }
    }

    return {
        upSQL: upParts.join("\n"),
        downSQL: dropParts.join("\n"),
    };
}

// ─── Topological sort ───────────────────────────────

/**
 * Sort tables so that FK target tables come before source tables.
 * Falls back to alphabetical when no dependencies.
 */
function topologicalSortTables(
    schemaName: string,
    tables: SchemaTableMap
): string[] {
    const tableNames = Array.from(tables.keys());
    const deps = new Map<string, Set<string>>();

    for (const name of tableNames) {
        deps.set(name, new Set());
    }

    for (const [name, meta] of tables) {
        for (const fk of meta.foreignKeys) {
            // Only order within same schema, same table self-refs ignored
            if (fk.target_schema === schemaName && fk.target_table !== name) {
                if (deps.has(fk.target_table)) {
                    deps.get(name)!.add(fk.target_table);
                }
            }
        }
    }

    // Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const name of tableNames) inDegree.set(name, 0);
    for (const [, d] of deps) {
        for (const dep of d) {
            inDegree.set(dep, (inDegree.get(dep) ?? 0) + 0); // dep itself has no extra in-degree
        }
    }
    // Recalculate: in-degree = how many tables depend ON this table?
    // Actually we want: for each edge (A depends on B), B must come first
    // So in-degree of A = number of deps A has
    for (const [name, d] of deps) {
        inDegree.set(name, d.size);
    }

    const queue: string[] = [];
    for (const [name, deg] of inDegree) {
        if (deg === 0) queue.push(name);
    }
    queue.sort(); // Alphabetical tie-breaking

    const sorted: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(current);

        // Find all tables that depend on current
        for (const [name, d] of deps) {
            if (d.has(current)) {
                d.delete(current);
                inDegree.set(name, (inDegree.get(name) ?? 1) - 1);
                if (inDegree.get(name) === 0) {
                    // Insert sorted
                    const insertIdx = queue.findIndex((q) => q > name);
                    if (insertIdx === -1) queue.push(name);
                    else queue.splice(insertIdx, 0, name);
                }
            }
        }
    }

    // Any remaining (circular deps) — just append alphabetically
    for (const name of tableNames) {
        if (!sorted.includes(name)) sorted.push(name);
    }

    return sorted;
}

// ─── File I/O ───────────────────────────────────────

/**
 * Write a baseline migration file with real DDL.
 */
export function writeBaselineMigration(
    migrationsDir: string,
    version: string,
    name: string,
    upSQL?: string,
    downSQL?: string
): string {
    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const filename = `${version}_${name}.sql`;
    const filepath = path.join(migrationsDir, filename);

    const up = upSQL || "-- Baseline migration\n-- Existing schema assumed to be correct\n-- No-op";
    const down = downSQL || "-- Rollback not supported for baseline";

    const content = `-- ${filename}

-- +up
${up}

-- +down
${down}
`;

    fs.writeFileSync(filepath, content, "utf8");
    return filepath;
}

/**
 * Load local migration files from a directory.
 */
export async function loadLocalMigrations(migrationsDir: string) {
    const files = await fs.promises.readdir(migrationsDir);
    const migrations = files
        .filter((file) => file.endsWith(".sql"))
        .map((file) => {
            const version = file.split("_")[0];
            const name = file.split("_").slice(1).join("_").replace(/\.sql$/, "");
            return { version, name };
        });
    return migrations;
}
