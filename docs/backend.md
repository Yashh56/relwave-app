# Backend Plan & API

This document describes the backend plan for **DB Visualizer**. It includes the bridge architecture, IPC/JSON-RPC API (request/response + events), connector interface contract, data models, error handling, background worker tasks, admin endpoints, testing plan, and recommended dev scripts. Use this file as the single source of truth when implementing the bridge (Node or Rust) and connectors.

---

## Table of contents

1. Overview & goals
2. Bridge responsibilities
3. Deployment modes (Electron / Tauri)
4. Connector contract (TypeScript interface)
5. Data models
6. IPC / JSON-RPC API (methods + events)
7. Query session lifecycle
8. Backup & restore flow
9. Background workers & scheduling
10. Error codes & diagnostics
11. Logging & debug endpoints
12. Security considerations
13. Tests & CI plan
14. Example folder layout & starter scripts
15. Next steps / checklist

---

## 1. Overview & goals

**Purpose:** implement a local backend ("bridge") that handles all blocking or privileged tasks (database drivers, backups, filesystem, OS keychain). The renderer (UI) communicates via IPC. The bridge must be lightweight, secure, modular (connector-based), and well-tested.

**Goals**

* Provide a stable, small API for UI.
* Support streaming query results and cancellable operations.
* Isolate native drivers from the UI thread/process.
* Allow easy addition of new connectors.

---

## 2. Bridge responsibilities

* Manage persistent connection pools and ephemeral sessions
* Test connections, fetch metadata, run queries (with pagination/streaming)
* Export table/database using native dump tools or driver-level export
* Perform backups, restores, and schedule jobs
* Store non-sensitive app state and index backups
* Securely store/retrieve secrets via OS keychain or encrypted file
* Emit events for progress, result batches, and job status

---

## 3. Deployment modes (Electron / Tauri)

* **Electron**: Bridge may run in the main Node process or a separate child process. Node drivers are directly available.
* **Tauri**: Use a Rust bridge (preferred) or spawn a Node child process. For Node child process, keep IPC over stdio or a local socket.

IPC choices:

* Tauri: `invoke` commands or a local WebSocket/JSON-RPC server bound to `localhost`.
* Electron: `ipcMain` / `ipcRenderer` with JSON-RPC style payloads.

---

## 4. Connector contract (TypeScript)

Place connectors under `/bridge/connectors/<vendor>` and export a standard interface.

```ts
// connector.ts
export type ConnectionConfig = {
  id?: string;
  name?: string;
  type: string; // 'postgres' | 'mysql' | 'sqlite' | ...
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  socketPath?: string; // for local sockets
  ssl?: { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  ssh?: { host: string; port?: number; user: string; privateKey?: string; passphrase?: string };
  extra?: Record<string, any>;
}

export interface Connector {
  id: string;
  displayName: string;
  testConnection(config: ConnectionConfig): Promise<{ ok: boolean; message?: string }>;
  getMetadata(config: ConnectionConfig): Promise<SchemaMetadata>;
  runQuery(config: ConnectionConfig, sql: string, opts?: RunOptions): AsyncIterable<RowBatch>;
  cancelQuery?(sessionId: string): Promise<boolean>;
  exportTable?(config: ConnectionConfig, table: string, opts?: ExportOptions): Promise<BackupMetadata>;
  close?(config: ConnectionConfig): Promise<void>;
}
```

**Notes:**

* `runQuery` returns an AsyncIterable to support streaming batches. If environment doesn't support that, return a Promise that fulfills with a stream-like object.
* Provide helper functions for dialect-specific metadata (e.g., `getIndexes`, `getForeignKeys`).

---

## 5. Data models

Simplified JSON models used across the API.

### Connection

```json
{
  "id": "conn_123",
  "name": "Local Postgres",
  "type": "postgres",
  "host": "127.0.0.1",
  "port": 5432,
  "database": "dev",
  "user": "alice",
  "storedCredentials": true
}
```

### Session

```json
{
  "sessionId": "s_456",
  "connectionId": "conn_123",
  "user": "local_user",
  "startedAt": "2025-11-17T08:30:00Z",
  "status": "running" // running | cancelled | finished | error
}
```

### QueryResult batch

```json
{
  "sessionId": "s_456",
  "batchIndex": 0,
  "rows": [ {"id":1, "name":"a"}, ...],
  "columns": [ {"name":"id", "type":"integer"}, ... ],
  "complete": false
}
```

### BackupMetadata

```json
{
  "id": "b_101",
  "connectionId": "conn_123",
  "path": "/path/to/backup.sql.gz",
  "type": "full",
  "size": 1234567,
  "createdAt": "2025-11-17T09:00:00Z"
}
```

---

## 6. IPC / JSON-RPC API (methods + events)

Use a small set of methods and event channels. Methods return a standard envelope: `{ ok: boolean, error?: {...}, data?: ... }`.

### Methods (request → response)

* `connection.create(config)` → `{ ok, data: Connection }`

* `connection.test(config)` → `{ ok, data: { ok: boolean, message?: string } }`

* `connection.list()` → `{ ok, data: Connection[] }`

* `connection.delete(id)` → `{ ok }`

* `connection.update(id, config)` → `{ ok, data: Connection }`

* `metadata.listSchemas(connectionId)` → `{ ok, data: SchemaMetadata }`

* `metadata.tableInfo(connectionId, tableName)` → `{ ok, data: TableInfo }`

* `query.createSession(connectionId)` → `{ ok, data: { sessionId } }`

* `query.run(sessionId, sql, opts?)` → `{ ok, data: { sessionId } }`  // results streamed via events

* `query.cancel(sessionId)` → `{ ok }`

* `query.fetchMore(sessionId, cursorToken)` → `{ ok, data: { rows, complete } }` (optional)

* `backup.create(connectionId, options)` → `{ ok, data: BackupMetadata }`  // background job

* `backup.list(connectionId?)` → `{ ok, data: BackupMetadata[] }`

* `backup.restore(backupId, options)` → `{ ok }`  // background job

* `secret.store(key, value)` → `{ ok }`  // store in keychain or encrypted file

* `secret.get(key)` → `{ ok, data }`

* `health.ping()` → `{ ok, data: { uptime, version } }`

### Events (bridge → UI)

Use event channels or JSON-RPC notifications:

* `query.result` `{ sessionId, batchIndex, rows, columns, complete }`
* `query.done` `{ sessionId, rows, timeMs, status }`
* `query.error` `{ sessionId, error }`
* `backup.progress` `{ jobId, percent, status }`
* `backup.done` `{ jobId, metadata }`
* `connector.status` `{ connectionId, status }`  // e.g., connectivity changes

**Example: run & stream**

1. UI: `query.createSession(connId)` → `{ sessionId: s1 }`
2. UI: `query.run(s1, 'SELECT ...')` → `{ ok: true }`
3. Bridge emits `query.result` events with batches
4. Bridge emits `query.done` when complete
5. UI may call `query.cancel(s1)` to cancel

---

## 7. Query session lifecycle

1. `createSession` reserves resources and returns `sessionId`.
2. `run` starts the query; bridge uses driver-specific cursor/stream.
3. Bridge emits `query.result` events (batches). Each batch contains `rows` and `columns` metadata.
4. If user cancels, `cancel` attempts to cancel via driver API, bridge marks session cancelled and emits `query.error` or `query.done` with status.
5. On completion, `query.done` emitted and bridge frees resources.

Session cleanup: bridge must track sessions and release resources after inactivity timeout.

---

## 8. Backup & restore flow

**Create Backup**

* UI calls `backup.create` with options: `{ type: 'full'|'table', tables?:[], compress?:true }`.
* Bridge starts a background job (worker) and responds with jobId.
* Worker runs a dump command or driver export and streams progress via `backup.progress`.
* On completion, worker emits `backup.done` and records metadata in local index.

**Restore**

* UI calls `backup.restore(backupId, options)`.
* Bridge copies/streams file to DB host (if remote), runs restore process, emitting progress.
* On success `backup.restore.done` or `backup.done` emitted.

---

## 9. Background workers & scheduling

* Worker pool for long-running tasks (backups, exports)
* Use a job queue (in-memory + persisted index) with jobs persisted to app DB to survive restarts
* Scheduling: store cron-like rules per backup job; a scheduler thread/worker checks due jobs and enqueues

Job states: `queued` → `running` → `success` | `failed` | `cancelled`

---

## 10. Error codes & diagnostics

Standardize errors with codes and optional `details`:

```json
{ "ok": false, "error": { "code": "DB_CONN_TIMEOUT", "message": "Connection timed out", "details": {"host":"..."} } }
```

Suggested codes:

* `DB_CONN_REFUSED`
* `DB_AUTH_FAILED`
* `DB_TIMEOUT`
* `QUERY_SYNTAX_ERROR`
* `QUERY_CANCELLED`
* `BACKUP_FAILED`
* `RESTORE_FAILED`
* `KEYCHAIN_UNAVAILABLE`

Provide human-readable message and optional `raw` diagnostic info (driver error message or stack) when in debug mode only.

---

## 11. Logging & debug endpoints

* Structured JSON logs written to rotating files under app data
* Support log level configuration: debug/info/warn/error
* Expose `health.ping()` and `debug.dumpState()` (opt-in) for support; dump should not include secrets

---

## 12. Security considerations

* Never return secrets in responses.
* Use keychain for storing secrets; if fallback encrypted file is used, require a master password.
* Validate and sanitize inputs from UI (e.g., paths for backups)
* Optionally restrict CLI tools used for dumps to signed binaries (platform dependent)
* On Windows/macOS, minimize privileges when spawning helpers

---

## 13. Tests & CI plan

### Unit tests

* Connector unit tests (mock driver) for `testConnection`, `getMetadata`, `runQuery` behavior
* Utilities: credential storage, config parsing

### Integration tests

* Use Docker Testcontainers to spin ephemeral DBs (Postgres, MySQL, SQLite) and run connector integration tests
* Test query streaming, cancellation, and backup/restore flows

### E2E tests

* Playwright for UI flows that exercise the bridge via IPC

### CI steps (GitHub Actions)

* Run lint & type-check
* Run unit & integration tests (use services for DBs)
* Build bridge artifact (Linux, macOS, Windows) in matrix
* Run smoke test on built artifact (basic health check)

---

## 14. Example folder layout & starter scripts

```
/bridge
  /connectors
    /postgres
      index.ts
      connector.ts
    /mysql
  /workers
    backupWorker.ts
  ipcServer.ts
  sessions.ts
  secrets.ts
  logger.ts
  package.json
/scripts
  start-dev.sh   # spawn bridge in dev mode
  test-integration.sh

# root package.json scripts
{
  "dev": "concurrently \"pnpm --filter renderer dev\" \"pnpm --filter bridge dev\"",
  "build": "pnpm -w build && pnpm -w build:bridge",
  "test": "pnpm -w test"
}
```

---

## 15. Next steps / checklist

* [ ] Scaffold bridge project with TypeScript + ts-node (dev)
* [ ] Implement Connector interface for Postgres (testConnection, getMetadata, runQuery streaming)
* [ ] Implement simple IPC server for dev (WebSocket/JSON-RPC)
* [ ] Add session manager with cancellation support
* [ ] Implement secrets storage using OS keychain (or `keytar` for Node)
* [ ] Add logging and health.ping endpoint
* [ ] Write connector unit tests and one integration test with ephemeral Postgres
* [ ] Document API with examples (copy relevant parts of this doc into `api.md`)

---

### Appendix A: Sample `runQuery` JSON-RPC interaction

**Request**

```json
{ "jsonrpc": "2.0", "method": "query.createSession", "params": { "connectionId": "conn_123" }, "id": 1 }
```

**Response**

```json
{ "jsonrpc": "2.0", "id": 1, "result": { "ok": true, "data": { "sessionId": "s_1" } } }
```

**Start run**

```json
{ "jsonrpc": "2.0", "method": "query.run", "params": { "sessionId": "s_1", "sql": "SELECT * FROM users" }, "id": 2 }
```

**Bridge events (notifications)**

```json
{ "jsonrpc": "2.0", "method": "query.result", "params": { "sessionId":"s_1", "batchIndex": 0, "rows": [{"id":1,"name":"yash"}], "columns":[{"name":"id","type":"int"},{"name":"name","type":"text"}], "complete": false } }
{ "jsonrpc": "2.0", "method": "query.done", "params": { "sessionId":"s_1", "rows": 100, "timeMs": 42, "status":"success" } }
```

---
