# DB Visualizer — Architecture

This `Architecture.md` describes the high-level and low-level architecture for **DB Visualizer** (desktop database visualization & management app). It covers components, data flow, connectors, security, deployment, packaging, scaling considerations, and developer workflows. Use this document to inform implementation, onboarding, and README-level technical details.

---

## Table of contents

1. Goals & non-goals
2. High-level architecture
3. Component breakdown
4. Data flow (common scenarios)
5. Connector design
6. Security model
7. Storage & persistence
8. Packaging & deployment
9. CI/CD and testing
10. Observability & telemetry
11. Performance & scaling
12. Extensibility & plugin model
13. Recovery, backups & migration
14. Risks & mitigations
15. Suggested folder layout

---

## 1. Goals & non-goals

**Primary goals**

* Provide an intuitive desktop app for exploring, querying, visualizing, and backing up databases (local & remote).
* Support common relational databases (Postgres, MySQL, SQLite) with secure remote connections (SSH/SSL).
* Keep the UI responsive by moving heavy or blocking database operations to a separate process.
* Produce small, secure binaries (Tauri preferred) while keeping a path for Electron if needed.

**Non-goals (initially)**

* Not a full DB management engine (no built-in replication, sharding, or data warehousing features).
* Not intended to host production DBs or manage cluster orchestration (no K8s control plane).

---

## 2. High-level architecture (overview)

```
+-----------------+          +---------------------+         +----------------+
|  Renderer/UI    | <----->  |  Local Bridge / IPC  | <---->  | DB Drivers /    |
|  (React + TS)   |  IPC     |  (Node/Rust process) |  CLI/API | Native Helpers  |
+-----------------+          +---------------------+         +----------------+
        ^  |                           |  ^                           |
        |  | WebView / RPC             |  | OS APIs / Spawn           | DB connections
        |  |                           |  |                          |
        v  |                           v  |                          v
+---------------------------------------------------------------+  +------------+
|                     Local System (OS)                         |  | Remote DBs |
|  - OS Keychain (optional)                                     |  | Docker VM  |
|  - Local files (app data)                                     |  | Cloud DBs   |
+---------------------------------------------------------------+  +------------+
```

**Main ideas:**

* UI runs in a web renderer (Tauri/Electron) and communicates with a local bridge via IPC/RPC.
* The bridge process handles database drivers, runs queries, reads metadata, and performs backups. This isolates native drivers and blocking IO from the UI thread.
* Use OS keychain for secure credential storage; fall back to encrypted local files.

---

## 3. Component breakdown

### 3.1 Renderer / UI

* Framework: React + TypeScript (Vite)
* Responsibilities:

  * Present schema explorer, SQL editor, result grid, visual builder, backups UI
  * Input validation, formatting
  * Command palette, keyboard shortcuts
  * Call bridge via IPC for all DB operations

### 3.2 Local Bridge / Backend Process

* Implemented either as:

  * Node process (Electron native or spawn in Tauri) — easier access to Node DB drivers, or
  * Rust process (preferred for Tauri) that exposes a small IPC/HTTP/JSON-RPC API and calls native helpers or bindings.
* Responsibilities:

  * Manage live DB connections and pools
  * Perform metadata queries (information_schema / PRAGMA)
  * Execute SQL queries with streaming/pagination
  * Run backups and restores (invoke `pg_dump`, `mysqldump`, or custom dump logic for SQLite)
  * Enforce query limits and sandboxing for packaged builds
  * Expose a stable IPC API to the renderer

### 3.3 DB Drivers & Helpers

* Use battle-tested drivers:

  * `pg` (node-postgres) for Postgres
  * `mysql2` for MySQL/MariaDB
  * `better-sqlite3` for SQLite (fast sync API)
* For Tauri/Rust path: consider `tokio-postgres`, `mysql_async`, and `rusqlite` or spawn CLI commands.

### 3.4 Storage

* App state: local SQLite or JSON files in OS-specific app-data dir
* Credentials: OS keychain preferred (macOS Keychain, Windows Credential Manager, Linux Secret Service). If unavailable, use an encrypted file (libsodium) with user-provided master password.
* Backups: user-chosen folder (allow cloud destinations via integrations)

### 3.5 IPC & Protocol

* Use JSON-RPC over the platform's IPC channel:

  * Tauri: `invoke` (Rust command handlers) or WebSocket to the bridge
  * Electron: `ipcRenderer` / `ipcMain`
* API surface should be small and stable: connect, disconnect, listSchemas, runQuery (with streaming), exportTable, startBackup, listBackups, restoreBackup.

---

## 4. Data flow (common scenarios)

### 4.1 Connect (UI → Bridge → DB)

1. User fills Add Connection form (host, port, username...).
2. UI sends `testConnection` to bridge.
3. Bridge attempts a connection using driver; returns success or error with diagnostics.
4. If user saves connection and opts to store credentials, bridge stores credentials in OS keychain or encrypted file.

### 4.2 Execute query (UI → Bridge → DB → UI)

1. UI sends `runQuery` with query text, connectionId, pagination params.
2. Bridge creates a session, runs the query with a cursor/stream and sends batched rows back via IPC events.
3. UI displays rows progressively; user can cancel the operation.
4. For long-running queries, bridge emits progress and final metrics (execution time, rows).

### 4.3 Backup (UI → Bridge → DB / CLI)

1. User chooses backup options (full/table/compression/destination).
2. Bridge spawns native dump tool (`pg_dump`, `mysqldump`) or runs a custom exporter.
3. Bridge streams backup file to the destination and records metadata.
4. UI shows progress and stores backup entry in local index.

---

## 5. Connector design

Design connectors as modules with the following contract:

```
interface Connector {
  id: string;
  displayName: string;
  testConnection(config): Promise<Result>;
  getMetadata(connection): Promise<SchemaMetadata>;
  runQuery(connection, query, opts): AsyncIterator<RowBatch> | Promise<Result>;
  exportTable(connection, tableName, opts): Promise<BackupMetadata>;
}
```

* Each connector handles driver instantiation, pooling, and dialect specifics.
* Dialect helpers translate metadata queries and normalize results for the UI.
* Keep connectors in `/bridge/connectors` so new connectors can be added without changing UI code.

---

## 6. Security model

### Threat model

* Protect credentials at rest.
* Minimize attack surface in packaged binaries (avoid embedding remote access keys).
* Prevent accidental destructive operations by the UI.

### Controls

* OS keychain for secrets; encrypted file fallback.
* Confirmations for destructive queries.
* Query sandboxing for public downloads (optional): disallow `DROP`/`TRUNCATE` or run in dry-run mode.
* Use TLS/SSL for DB connections when supported.
* Prefer SSH tunneling for remote single-host connections.

---

## 7. Storage & persistence

* App config (non-sensitive): JSON in OS app-data dir (e.g., `%APPDATA%/DBVisualizer` or `~/.local/share/db-visualizer`).
* User data (query history, saved snippets): local SQLite (fast queries, ACID).
* Backups: store file path and metadata in app data; backups themselves are stored where user picks.

---

## 8. Packaging & deployment

### Packaging choices

* **Tauri** (recommended): smaller binary sizes, Rust backend, secure defaults. Use `pnpm` + `vite` + `tauri`.
* **Electron** (alternative): wider driver compatibility, easy Node driver usage, larger bundle size.

### Platform specifics

* macOS: notarization & signing required for distribution
* Windows: code signing for SmartScreen reputation
* Linux: provide AppImage, deb, rpm as needed

### Auto-update

* Use a release server (GH Releases, S3) with an update protocol (Tauri has built-in updater or use electron-updater).
* Sign release metadata and binaries.

---

## 9. CI/CD and testing

### CI pipeline

* Linting: TypeScript + ESLint
* Unit tests: Jest for UI logic + bridge unit tests
* Integration tests: spin up ephemeral Postgres/MySQL via Docker (use `testcontainers`) and run connector tests
* Build: produce artifacts for all OS targets (use GitHub Actions or similar)
* Release: tag + create GH Release, upload installers

### Testing strategies

* Mock connectors for UI unit tests
* E2E tests with Playwright (UI flows: connect → run query → export)
* Load tests for bridge query streaming

---

## 10. Observability & telemetry

* Local logs: write to rotating log files under app data; allow user to view or export logs for support.
* Optional telemetry (opt-in): usage events (commands run, errors) sent to analytics backend (Sentry for errors, PostHog/Amplitude for usage).
* Health endpoints on bridge for debugging (exposed only to localhost, opt-in).

---

## 11. Performance & scaling

* UI: keep rendering efficient (virtualized tables for large result sets)
* Bridge: use connection pooling and streaming for results
* Background jobs: run heavy tasks (exports, scheduled backups) in separate worker processes
* Avoid loading entire result set into memory; use batching

---

## 12. Extensibility & plugin model

* Plugin API (v1): plugins are Node packages or Wasm modules that can:

  * Register new connectors
  * Register new visualizations
  * Add menu actions
* Plugins run in a sandboxed environment; they communicate with main bridge via a plugin bus (RPC)
* Store plugin metadata in a local registry (allow discovery from a marketplace)

---

## 13. Recovery, backups & migration

* Backup metadata stored in app DB; actual backups stored in user-chosen locations
* Provide an import tool to migrate saved connections & snippets to new install
* Auto-backup settings export/import

---

## 14. Risks & mitigations

* **Risk:** Storing credentials insecurely

  * **Mitigation:** Use OS keychain + encryption; provide explicit UI to manage secrets
* **Risk:** Long-running queries crash UI

  * **Mitigation:** All DB IO runs in bridge; support cancelation & timeouts
* **Risk:** Dialect differences cause query failures

  * **Mitigation:** Implement dialect normalization + clear error messages and show DB type in UI

---

## 15. Suggested folder layout

```
/src
  /renderer            # React UI source (Vite)
    /components
    /views
    /hooks
    main.tsx
  /bridge              # Bridge process code (Node or Rust)
    /connectors        # Connector modules
    /workers           # Background workers (backups, exports)
    ipc.ts
  /main                # Tauri or Electron setup
  /assets
  /docs
  /tests
  package.json
  tauri.conf.json     # if using Tauri
```

---

## Appendix: Example IPC API (JSON-RPC)

```
// Request
{
  "jsonrpc": "2.0",
  "method": "runQuery",
  "params": { "connectionId": "c1", "sql": "SELECT * FROM users LIMIT 100" },
  "id": 1
}

// Response (streamed via events)
{
  "jsonrpc": "2.0",
  "method": "query.result",
  "params": { "id": 1, "rows": [...], "complete": false }
}

// Final event
{ "jsonrpc": "2.0", "method": "query.done", "params": { "id": 1, "rows": 123, "timeMs": 420 } }
```

---

If you want, I can now:

* produce a visual architecture diagram (SVG) you can drop into `docs/`, or
* scaffold the bridge `Connector` interface and example Postgres connector (Node) starter code, or
* generate `tauri.conf.json` and package scripts for dev & build.

Which one next?
