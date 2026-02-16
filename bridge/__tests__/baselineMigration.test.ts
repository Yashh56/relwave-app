import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import fs from "fs";
import path from "path";
import os from "os";
import {
    generateCreateTableSQL,
    generateCreateIndexSQL,
    generateEnumTypeSQL,
    generateBaselineMigrationSQL,
    writeBaselineMigration,
    loadLocalMigrations,
    TableMetadata,
    SchemaTableMap,
    BaselineSchemaInput,
} from "../src/utils/baselineMigration";

// ─── Test helpers ───────────────────────────────────

function makeMetadata(overrides: Partial<TableMetadata> = {}): TableMetadata {
    return {
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: [],
        uniqueConstraints: [],
        checkConstraints: [],
        ...overrides,
    };
}

let tempDir: string;

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
});

afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════
// generateCreateTableSQL
// ═══════════════════════════════════════════════════

describe("generateCreateTableSQL", () => {
    test("simple table with two columns (postgres)", () => {
        const meta = makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "name", type: "text", not_nullable: false, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        });
        const sql = generateCreateTableSQL("public", "users", meta, "postgres");

        expect(sql).toContain('CREATE TABLE "public"."users"');
        expect(sql).toContain('"id" integer NOT NULL');
        expect(sql).toContain('"name" text');
        expect(sql).toContain('PRIMARY KEY ("id")');
        expect(sql).toMatch(/\);$/);
    });

    test("simple table with two columns (mysql)", () => {
        const meta = makeMetadata({
            columns: [
                { name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "email", type: "varchar(255)", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        });
        const sql = generateCreateTableSQL("mydb", "accounts", meta, "mysql");

        expect(sql).toContain("CREATE TABLE `mydb`.`accounts`");
        expect(sql).toContain("`id` int NOT NULL");
        expect(sql).toContain("`email` varchar(255) NOT NULL");
        expect(sql).toContain("PRIMARY KEY (`id`)");
    });

    test("column with default value", () => {
        const meta = makeMetadata({
            columns: [
                { name: "active", type: "boolean", not_nullable: true, default_value: "true", is_primary_key: false, is_foreign_key: false },
            ],
        });
        const sql = generateCreateTableSQL("public", "flags", meta, "postgres");

        expect(sql).toContain('"active" boolean NOT NULL DEFAULT true');
    });

    test("composite primary key", () => {
        const meta = makeMetadata({
            columns: [
                { name: "user_id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "role_id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "user_id" }, { column_name: "role_id" }],
        });
        const sql = generateCreateTableSQL("public", "user_roles", meta, "postgres");

        expect(sql).toContain('PRIMARY KEY ("user_id", "role_id")');
    });

    test("unique constraints", () => {
        const meta = makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "email", type: "text", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
            uniqueConstraints: [
                { constraint_name: "uq_email", table_schema: "public", table_name: "users", column_name: "email", ordinal_position: 1 },
            ],
        });
        const sql = generateCreateTableSQL("public", "users", meta, "postgres");

        expect(sql).toContain('CONSTRAINT "uq_email" UNIQUE ("email")');
    });

    test("multi-column unique constraint", () => {
        const meta = makeMetadata({
            columns: [
                { name: "first_name", type: "text", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
                { name: "last_name", type: "text", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            uniqueConstraints: [
                { constraint_name: "uq_fullname", table_schema: "public", table_name: "people", column_name: "first_name", ordinal_position: 1 },
                { constraint_name: "uq_fullname", table_schema: "public", table_name: "people", column_name: "last_name", ordinal_position: 2 },
            ],
        });
        const sql = generateCreateTableSQL("public", "people", meta, "postgres");

        expect(sql).toContain('CONSTRAINT "uq_fullname" UNIQUE ("first_name", "last_name")');
    });

    test("check constraints", () => {
        const meta = makeMetadata({
            columns: [
                { name: "age", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            checkConstraints: [
                { constraint_name: "chk_age", table_schema: "public", table_name: "people", definition: "age >= 0" },
            ],
        });
        const sql = generateCreateTableSQL("public", "people", meta, "postgres");

        expect(sql).toContain('CONSTRAINT "chk_age" CHECK (age >= 0)');
    });

    test("foreign key constraint", () => {
        const meta = makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "user_id", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
            ],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [
                {
                    constraint_name: "fk_orders_user",
                    source_schema: "public",
                    source_table: "orders",
                    source_column: "user_id",
                    target_schema: "public",
                    target_table: "users",
                    target_column: "id",
                    update_rule: "NO ACTION",
                    delete_rule: "CASCADE",
                },
            ],
        });
        const sql = generateCreateTableSQL("public", "orders", meta, "postgres");

        expect(sql).toContain('CONSTRAINT "fk_orders_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id")');
        expect(sql).toContain("ON DELETE CASCADE");
        expect(sql).not.toContain("ON UPDATE"); // NO ACTION is omitted
    });

    test("foreign key with ON UPDATE rule", () => {
        const meta = makeMetadata({
            columns: [
                { name: "ref_id", type: "integer", not_nullable: false, default_value: "", is_primary_key: false, is_foreign_key: true },
            ],
            foreignKeys: [
                {
                    constraint_name: "fk_ref",
                    source_schema: "mydb",
                    source_table: "items",
                    source_column: "ref_id",
                    target_schema: "mydb",
                    target_table: "refs",
                    target_column: "id",
                    update_rule: "CASCADE",
                    delete_rule: "SET NULL",
                },
            ],
        });
        const sql = generateCreateTableSQL("mydb", "items", meta, "mysql");

        expect(sql).toContain("ON DELETE SET NULL");
        expect(sql).toContain("ON UPDATE CASCADE");
    });

    test("multi-column foreign key", () => {
        const meta = makeMetadata({
            columns: [
                { name: "a", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
                { name: "b", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
            ],
            foreignKeys: [
                {
                    constraint_name: "fk_composite",
                    source_schema: "public", source_table: "child",
                    source_column: "a", target_schema: "public", target_table: "parent",
                    target_column: "x", update_rule: "NO ACTION", delete_rule: "NO ACTION",
                },
                {
                    constraint_name: "fk_composite",
                    source_schema: "public", source_table: "child",
                    source_column: "b", target_schema: "public", target_table: "parent",
                    target_column: "y", update_rule: "NO ACTION", delete_rule: "NO ACTION",
                },
            ],
        });
        const sql = generateCreateTableSQL("public", "child", meta, "postgres");

        expect(sql).toContain('FOREIGN KEY ("a", "b") REFERENCES "public"."parent" ("x", "y")');
    });

    test("nullable column without default", () => {
        const meta = makeMetadata({
            columns: [
                { name: "bio", type: "text", not_nullable: false, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
        });
        const sql = generateCreateTableSQL("public", "profiles", meta, "postgres");

        expect(sql).toContain('"bio" text');
        expect(sql).not.toContain("NOT NULL");
        expect(sql).not.toContain("DEFAULT");
    });

    test("mariadb uses backtick quoting", () => {
        const meta = makeMetadata({
            columns: [
                { name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        });
        const sql = generateCreateTableSQL("testdb", "items", meta, "mariadb");

        expect(sql).toContain("`testdb`.`items`");
        expect(sql).toContain("`id` int NOT NULL");
    });
});

// ═══════════════════════════════════════════════════
// generateCreateIndexSQL
// ═══════════════════════════════════════════════════

describe("generateCreateIndexSQL", () => {
    test("non-primary, non-unique index", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "orders", index_name: "idx_orders_date", column_name: "order_date", is_unique: false, is_primary: false, index_type: "btree" },
            ],
        });
        const stmts = generateCreateIndexSQL("public", "orders", meta, "postgres");

        expect(stmts).toHaveLength(1);
        expect(stmts[0]).toContain('CREATE INDEX "idx_orders_date" ON "public"."orders" ("order_date")');
    });

    test("multi-column index", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "events", index_name: "idx_compound", column_name: "col_a", is_unique: false, is_primary: false, index_type: "btree" },
                { table_name: "events", index_name: "idx_compound", column_name: "col_b", is_unique: false, is_primary: false, index_type: "btree" },
            ],
        });
        const stmts = generateCreateIndexSQL("public", "events", meta, "postgres");

        expect(stmts).toHaveLength(1);
        expect(stmts[0]).toContain('"col_a", "col_b"');
    });

    test("skips primary key indexes", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "t", index_name: "pk_t", column_name: "id", is_unique: true, is_primary: true, index_type: "btree" },
            ],
        });
        const stmts = generateCreateIndexSQL("public", "t", meta, "postgres");

        expect(stmts).toHaveLength(0);
    });

    test("skips unique indexes (handled as constraints)", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "t", index_name: "uq_email", column_name: "email", is_unique: true, is_primary: false, index_type: "btree" },
            ],
        });
        const stmts = generateCreateIndexSQL("public", "t", meta, "postgres");

        expect(stmts).toHaveLength(0);
    });

    test("postgres non-btree index type includes USING clause", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "docs", index_name: "idx_gin_search", column_name: "search_vector", is_unique: false, is_primary: false, index_type: "gin" },
            ],
        });
        const stmts = generateCreateIndexSQL("public", "docs", meta, "postgres");

        expect(stmts).toHaveLength(1);
        expect(stmts[0]).toContain("USING gin");
    });

    test("mysql index does not use USING clause for non-btree", () => {
        const meta = makeMetadata({
            indexes: [
                { table_name: "docs", index_name: "idx_ft", column_name: "content", is_unique: false, is_primary: false, index_type: "fulltext" },
            ],
        });
        const stmts = generateCreateIndexSQL("mydb", "docs", meta, "mysql");

        expect(stmts).toHaveLength(1);
        expect(stmts[0]).not.toContain("USING");
    });

    test("empty indexes returns empty array", () => {
        const meta = makeMetadata({ indexes: [] });
        const stmts = generateCreateIndexSQL("public", "t", meta, "postgres");

        expect(stmts).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// generateEnumTypeSQL
// ═══════════════════════════════════════════════════

describe("generateEnumTypeSQL", () => {
    test("single enum type", () => {
        const enums = [
            { schema_name: "public", enum_name: "status", enum_value: "active" },
            { schema_name: "public", enum_name: "status", enum_value: "inactive" },
            { schema_name: "public", enum_name: "status", enum_value: "pending" },
        ];
        const stmts = generateEnumTypeSQL(enums);

        expect(stmts).toHaveLength(1);
        expect(stmts[0]).toContain('CREATE TYPE "public"."status" AS ENUM');
        expect(stmts[0]).toContain("'active'");
        expect(stmts[0]).toContain("'inactive'");
        expect(stmts[0]).toContain("'pending'");
    });

    test("multiple enum types", () => {
        const enums = [
            { schema_name: "public", enum_name: "color", enum_value: "red" },
            { schema_name: "public", enum_name: "color", enum_value: "blue" },
            { schema_name: "public", enum_name: "size", enum_value: "small" },
            { schema_name: "public", enum_name: "size", enum_value: "large" },
        ];
        const stmts = generateEnumTypeSQL(enums);

        expect(stmts).toHaveLength(2);
    });

    test("enum value with single quote is escaped", () => {
        const enums = [
            { schema_name: "public", enum_name: "txt", enum_value: "it's" },
        ];
        const stmts = generateEnumTypeSQL(enums);

        expect(stmts[0]).toContain("'it''s'");
    });

    test("empty enum types returns empty array", () => {
        expect(generateEnumTypeSQL([])).toHaveLength(0);
    });

    test("undefined enum types returns empty array", () => {
        expect(generateEnumTypeSQL(undefined as any)).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// generateBaselineMigrationSQL
// ═══════════════════════════════════════════════════

describe("generateBaselineMigrationSQL", () => {
    test("generates up and down SQL for a single schema", () => {
        const tables: SchemaTableMap = new Map();
        tables.set("users", makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "name", type: "text", not_nullable: false, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const schemas: BaselineSchemaInput[] = [
            { schemaName: "public", tables },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        expect(upSQL).toContain("Baseline migration");
        expect(upSQL).toContain('CREATE TABLE "public"."users"');
        expect(upSQL).toContain('"id" integer NOT NULL');
        expect(downSQL).toContain('DROP TABLE IF EXISTS "public"."users" CASCADE');
    });

    test("tables with FK dependencies are ordered correctly", () => {
        const tables: SchemaTableMap = new Map();

        // orders depends on users via FK
        tables.set("orders", makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "user_id", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
            ],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [{
                constraint_name: "fk_user", source_schema: "public", source_table: "orders",
                source_column: "user_id", target_schema: "public", target_table: "users",
                target_column: "id", update_rule: "NO ACTION", delete_rule: "CASCADE",
            }],
        }));

        tables.set("users", makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const schemas: BaselineSchemaInput[] = [
            { schemaName: "public", tables },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        // users should come before orders in CREATE
        const usersPos = upSQL.indexOf('"public"."users"');
        const ordersPos = upSQL.indexOf('"public"."orders"');
        expect(usersPos).toBeLessThan(ordersPos);

        // orders should come before users in DROP (reverse)
        const dropOrdersPos = downSQL.indexOf('"public"."orders"');
        const dropUsersPos = downSQL.indexOf('"public"."users"');
        expect(dropOrdersPos).toBeLessThan(dropUsersPos);
    });

    test("enum types appear before tables in up SQL", () => {
        const tables: SchemaTableMap = new Map();
        tables.set("items", makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "status", type: "item_status", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const schemas: BaselineSchemaInput[] = [
            {
                schemaName: "public",
                tables,
                enumTypes: [
                    { schema_name: "public", enum_name: "item_status", enum_value: "active" },
                    { schema_name: "public", enum_name: "item_status", enum_value: "archived" },
                ],
            },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        const enumPos = upSQL.indexOf("CREATE TYPE");
        const tablePos = upSQL.indexOf("CREATE TABLE");
        expect(enumPos).toBeLessThan(tablePos);

        // Down should drop enum types
        expect(downSQL).toContain("DROP TYPE IF EXISTS");
    });

    test("multiple schemas are included", () => {
        const publicTables: SchemaTableMap = new Map();
        publicTables.set("users", makeMetadata({
            columns: [
                { name: "id", type: "integer", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const analyticsTables: SchemaTableMap = new Map();
        analyticsTables.set("events", makeMetadata({
            columns: [
                { name: "id", type: "bigint", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "event_type", type: "text", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const schemas: BaselineSchemaInput[] = [
            { schemaName: "public", tables: publicTables },
            { schemaName: "analytics", tables: analyticsTables },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        expect(upSQL).toContain('"public"."users"');
        expect(upSQL).toContain('"analytics"."events"');
        expect(downSQL).toContain('"public"."users"');
        expect(downSQL).toContain('"analytics"."events"');
    });

    test("empty schema produces minimal output", () => {
        const schemas: BaselineSchemaInput[] = [
            { schemaName: "public", tables: new Map() },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        expect(upSQL).toContain("Baseline migration");
        expect(upSQL).not.toContain("CREATE TABLE");
        expect(downSQL).toBe("");
    });

    test("mysql output uses backtick quoting", () => {
        const tables: SchemaTableMap = new Map();
        tables.set("products", makeMetadata({
            columns: [
                { name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "price", type: "decimal(10,2)", not_nullable: true, default_value: "0.00", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        const schemas: BaselineSchemaInput[] = [
            { schemaName: "shop", tables },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "mysql");

        expect(upSQL).toContain("`shop`.`products`");
        expect(upSQL).toContain("`id` int NOT NULL");
        expect(upSQL).toContain("`price` decimal(10,2) NOT NULL DEFAULT 0.00");
        expect(downSQL).toContain("`shop`.`products`");
    });

    test("three-table chain: A -> B -> C ordered correctly", () => {
        const tables: SchemaTableMap = new Map();

        // C depends on B, B depends on A
        tables.set("table_c", makeMetadata({
            columns: [{ name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            { name: "b_id", type: "int", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true }],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [{
                constraint_name: "fk_c_b", source_schema: "s", source_table: "table_c",
                source_column: "b_id", target_schema: "s", target_table: "table_b",
                target_column: "id", update_rule: "NO ACTION", delete_rule: "NO ACTION",
            }],
        }));

        tables.set("table_a", makeMetadata({
            columns: [{ name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false }],
            primaryKeys: [{ column_name: "id" }],
        }));

        tables.set("table_b", makeMetadata({
            columns: [{ name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
            { name: "a_id", type: "int", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true }],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [{
                constraint_name: "fk_b_a", source_schema: "s", source_table: "table_b",
                source_column: "a_id", target_schema: "s", target_table: "table_a",
                target_column: "id", update_rule: "NO ACTION", delete_rule: "NO ACTION",
            }],
        }));

        const { upSQL } = generateBaselineMigrationSQL(
            [{ schemaName: "s", tables }], "mysql"
        );

        const posA = upSQL.indexOf("`s`.`table_a`");
        const posB = upSQL.indexOf("`s`.`table_b`");
        const posC = upSQL.indexOf("`s`.`table_c`");

        expect(posA).toBeLessThan(posB);
        expect(posB).toBeLessThan(posC);
    });
});

// ═══════════════════════════════════════════════════
// writeBaselineMigration
// ═══════════════════════════════════════════════════

describe("writeBaselineMigration", () => {
    test("writes file with correct filename format", () => {
        const filePath = writeBaselineMigration(tempDir, "1234567890", "baseline_existing_schema");

        expect(fs.existsSync(filePath)).toBe(true);
        expect(path.basename(filePath)).toBe("1234567890_baseline_existing_schema.sql");
    });

    test("writes no-op content when no SQL provided", () => {
        const filePath = writeBaselineMigration(tempDir, "100", "test_baseline");
        const content = fs.readFileSync(filePath, "utf8");

        expect(content).toContain("-- +up");
        expect(content).toContain("-- +down");
        expect(content).toContain("Baseline migration");
        expect(content).toContain("No-op");
    });

    test("writes provided upSQL and downSQL", () => {
        const upSQL = 'CREATE TABLE "public"."users" (\n  "id" integer NOT NULL\n);';
        const downSQL = 'DROP TABLE IF EXISTS "public"."users" CASCADE;';

        const filePath = writeBaselineMigration(tempDir, "200", "baseline", upSQL, downSQL);
        const content = fs.readFileSync(filePath, "utf8");

        expect(content).toContain("-- +up");
        expect(content).toContain(upSQL);
        expect(content).toContain("-- +down");
        expect(content).toContain(downSQL);
    });

    test("creates directory if it does not exist", () => {
        const nestedDir = path.join(tempDir, "nested", "dir");
        expect(fs.existsSync(nestedDir)).toBe(false);

        const filePath = writeBaselineMigration(nestedDir, "300", "test");
        expect(fs.existsSync(filePath)).toBe(true);
    });

    test("file content matches migration file format", () => {
        const filePath = writeBaselineMigration(
            tempDir, "400", "my_baseline",
            "CREATE TABLE t (id INT);",
            "DROP TABLE t;"
        );
        const content = fs.readFileSync(filePath, "utf8");

        // Should have the standard format: header comment, +up section, +down section
        const lines = content.split("\n");
        expect(lines[0]).toContain("400_my_baseline.sql");
        expect(content).toContain("-- +up");
        expect(content).toContain("CREATE TABLE t (id INT);");
        expect(content).toContain("-- +down");
        expect(content).toContain("DROP TABLE t;");
    });
});

// ═══════════════════════════════════════════════════
// loadLocalMigrations
// ═══════════════════════════════════════════════════

describe("loadLocalMigrations", () => {
    test("loads migration files from directory", async () => {
        // Create sample migration files
        fs.writeFileSync(path.join(tempDir, "001_init.sql"), "-- +up\n-- +down\n");
        fs.writeFileSync(path.join(tempDir, "002_add_users.sql"), "-- +up\n-- +down\n");

        const migrations = await loadLocalMigrations(tempDir);

        expect(migrations).toHaveLength(2);
        expect(migrations[0]).toEqual({ version: "001", name: "init" });
        expect(migrations[1]).toEqual({ version: "002", name: "add_users" });
    });

    test("handles multi-segment migration names", async () => {
        fs.writeFileSync(path.join(tempDir, "100_baseline_existing_schema.sql"), "-- +up\n-- +down\n");

        const migrations = await loadLocalMigrations(tempDir);

        expect(migrations).toHaveLength(1);
        expect(migrations[0]).toEqual({ version: "100", name: "baseline_existing_schema" });
    });

    test("ignores non-SQL files", async () => {
        fs.writeFileSync(path.join(tempDir, "001_init.sql"), "-- +up\n-- +down\n");
        fs.writeFileSync(path.join(tempDir, "README.md"), "# Notes");
        fs.writeFileSync(path.join(tempDir, "data.json"), "{}");

        const migrations = await loadLocalMigrations(tempDir);

        expect(migrations).toHaveLength(1);
    });

    test("empty directory returns empty array", async () => {
        const migrations = await loadLocalMigrations(tempDir);

        expect(migrations).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// Integration: full baseline pipeline
// ═══════════════════════════════════════════════════

describe("full baseline pipeline", () => {
    test("generate + write + load roundtrip", async () => {
        // 1. Build schema input
        const tables: SchemaTableMap = new Map();
        tables.set("users", makeMetadata({
            columns: [
                { name: "id", type: "serial", not_nullable: true, default_value: "nextval('users_id_seq'::regclass)", is_primary_key: true, is_foreign_key: false },
                { name: "email", type: "varchar(255)", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
                { name: "created_at", type: "timestamp", not_nullable: true, default_value: "now()", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
            uniqueConstraints: [
                { constraint_name: "uq_users_email", table_schema: "public", table_name: "users", column_name: "email", ordinal_position: 1 },
            ],
        }));

        tables.set("posts", makeMetadata({
            columns: [
                { name: "id", type: "serial", not_nullable: true, default_value: "nextval('posts_id_seq'::regclass)", is_primary_key: true, is_foreign_key: false },
                { name: "title", type: "varchar(500)", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
                { name: "user_id", type: "integer", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
            ],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [{
                constraint_name: "fk_posts_user", source_schema: "public", source_table: "posts",
                source_column: "user_id", target_schema: "public", target_table: "users",
                target_column: "id", update_rule: "NO ACTION", delete_rule: "CASCADE",
            }],
            indexes: [
                { table_name: "posts", index_name: "idx_posts_user_id", column_name: "user_id", is_unique: false, is_primary: false, index_type: "btree" },
            ],
        }));

        const schemas: BaselineSchemaInput[] = [
            {
                schemaName: "public",
                tables,
                enumTypes: [
                    { schema_name: "public", enum_name: "post_status", enum_value: "draft" },
                    { schema_name: "public", enum_name: "post_status", enum_value: "published" },
                ],
            },
        ];

        // 2. Generate SQL
        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "postgres");

        // 3. Write migration file
        const version = "1700000000000";
        const filePath = writeBaselineMigration(tempDir, version, "baseline_existing_schema", upSQL, downSQL);

        // 4. Load it back
        const migrations = await loadLocalMigrations(tempDir);
        expect(migrations).toHaveLength(1);
        expect(migrations[0].version).toBe(version);
        expect(migrations[0].name).toBe("baseline_existing_schema");

        // 5. Verify file content has all expected DDL
        const content = fs.readFileSync(filePath, "utf8");

        // Enum type first
        expect(content).toContain('CREATE TYPE "public"."post_status" AS ENUM');

        // Users table (created before posts due to FK ordering)
        expect(content).toContain('CREATE TABLE "public"."users"');
        expect(content).toContain('"email" varchar(255) NOT NULL');
        expect(content).toContain('CONSTRAINT "uq_users_email" UNIQUE ("email")');

        // Posts table
        expect(content).toContain('CREATE TABLE "public"."posts"');
        expect(content).toContain('FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id")');
        expect(content).toContain("ON DELETE CASCADE");

        // Index
        expect(content).toContain('CREATE INDEX "idx_posts_user_id"');

        // Down migration
        expect(content).toContain('DROP TABLE IF EXISTS "public"."posts" CASCADE');
        expect(content).toContain('DROP TABLE IF EXISTS "public"."users" CASCADE');
        expect(content).toContain('DROP TYPE IF EXISTS');

        // Correct ordering: users CREATE before posts CREATE
        const usersCreatePos = content.indexOf('CREATE TABLE "public"."users"');
        const postsCreatePos = content.indexOf('CREATE TABLE "public"."posts"');
        expect(usersCreatePos).toBeLessThan(postsCreatePos);
    });

    test("mysql full baseline roundtrip", async () => {
        const tables: SchemaTableMap = new Map();
        tables.set("categories", makeMetadata({
            columns: [
                { name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "name", type: "varchar(100)", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
        }));

        tables.set("products", makeMetadata({
            columns: [
                { name: "id", type: "int", not_nullable: true, default_value: "", is_primary_key: true, is_foreign_key: false },
                { name: "category_id", type: "int", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: true },
                { name: "sku", type: "varchar(50)", not_nullable: true, default_value: "", is_primary_key: false, is_foreign_key: false },
            ],
            primaryKeys: [{ column_name: "id" }],
            foreignKeys: [{
                constraint_name: "fk_product_cat", source_schema: "shop", source_table: "products",
                source_column: "category_id", target_schema: "shop", target_table: "categories",
                target_column: "id", update_rule: "NO ACTION", delete_rule: "RESTRICT",
            }],
            uniqueConstraints: [
                { constraint_name: "uq_sku", table_schema: "shop", table_name: "products", column_name: "sku", ordinal_position: 1 },
            ],
        }));

        const schemas: BaselineSchemaInput[] = [
            { schemaName: "shop", tables },
        ];

        const { upSQL, downSQL } = generateBaselineMigrationSQL(schemas, "mysql");
        const filePath = writeBaselineMigration(tempDir, "9999", "baseline", upSQL, downSQL);
        const content = fs.readFileSync(filePath, "utf8");

        expect(content).toContain("`shop`.`categories`");
        expect(content).toContain("`shop`.`products`");
        expect(content).toContain("FOREIGN KEY (`category_id`) REFERENCES `shop`.`categories` (`id`)");
        expect(content).toContain("ON DELETE RESTRICT");
        expect(content).toContain('CONSTRAINT `uq_sku` UNIQUE (`sku`)');

        // Verify ordering
        const catPos = content.indexOf("`shop`.`categories`");
        const prodPos = content.indexOf("`shop`.`products`");
        expect(catPos).toBeLessThan(prodPos);
    });
});
