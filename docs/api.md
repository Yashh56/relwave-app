# DB Visualizer — API Reference (Bridge IPC / JSON-RPC)

This `API.md` documents the stable IPC/JSON-RPC API that the **bridge** (local backend) exposes to the UI (renderer). It includes method signatures, request/response envelopes, events/notifications, error codes, streaming semantics, and example interactions. Use this as the canonical API for implementing the bridge and for the UI to interact reliably.

---

## Overview

* Transport: JSON-RPC-style messages over the platform IPC channel (Tauri `invoke`/commands, Electron `ipcRenderer` / `ipcMain`) **or** a local WebSocket/JSON-RPC server used in dev or testing.
* Message envelope: All method responses use a consistent envelope: `{ ok: boolean, data?: any, error?: { code: string, message: string, details?: any } }`.
* Streaming: long-running operations (queries, backups) stream progress/results via notifications/events. Each streaming operation is associated with a `sessionId` or `jobId`.
* Security: The API never returns stored secrets. Secrets are handled via dedicated secret methods which only return success/failure or the decrypted secret when explicitly requested by the caller that has permissions.

---

## Common types

```ts
type ConnectionConfig = {
  id?: string;
  name?: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql' | string;
  host?: string;
  port?: number;
  user?: string;
  password?: string; // not returned by list
  database?: string;
  socketPath?: string;
  ssl?: { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  ssh?: { host: string; port?: number; user?: string; privateKey?: string; passphrase?: string };
  extra?: Record<string, any>;
}

type SessionId = string;
type JobId = string;

type Row = Record<string, any>;

type RowBatch = {
  sessionId: SessionId;
  batchIndex: number;
  rows: Row[];
  columns: { name: string; type?: string }[];
  complete: boolean;
}
```

---

## Method list (RPC)

Each method is described with arguments and example response envelope. Methods should be synchronous for control and asynchronous (events) for streaming.

### `connection.create(config: ConnectionConfig)`

* Purpose: Create and persist a connection profile (does not test connection).
* Request: `{ config }`
* Response: `{ ok: true, data: Connection }` or `{ ok: false, error }`

### `connection.test(config: ConnectionConfig)`

* Purpose: Validate connectivity using provided config (does not store secrets unless requested by `connection.create` afterwards).
* Request: `{ config }`
* Response: `{ ok: true, data: { ok: boolean, message?: string } }`

### `connection.list()`

* Purpose: Return saved connection profiles (no passwords returned).
* Response: `{ ok: true, data: Connection[] }`

### `connection.update(id, partialConfig)`

* Purpose: Update a saved connection profile.
* Response: `{ ok: true, data: Connection }`

### `connection.delete(id)`

* Purpose: Remove saved connection profile and optionally its stored secret.
* Request: `{ id, deleteSavedSecret?: boolean }`
* Response: `{ ok: true }`

---

### Metadata methods

#### `metadata.listSchemas(connectionId)`

* Response: `{ ok: true, data: SchemaMetadata }`
* `SchemaMetadata` contains databases, schemas, tables, views and lightweight column metadata.

#### `metadata.tableInfo(connectionId, tableName)`

* Response: `{ ok: true, data: TableInfo }`
* `TableInfo` includes DDL, columns, indexes, FKs, row count (optional), sample values.

---

### Query methods

The general pattern is: create a session → run query → receive `query.result` events → receive `query.done`.

#### `query.createSession(connectionId)`

* Purpose: Reserve resources for query execution and return `sessionId`.
* Response: `{ ok: true, data: { sessionId } }`

#### `query.run(sessionId, sql, opts?)`

* Purpose: Start executing SQL. Results are streamed via `query.result` notifications.
* `opts` may include: `batchSize`, `maxRows`, `transaction: boolean`, `readonly: boolean`.
* Response: `{ ok: true }` (immediately) or `{ ok: false, error }`.

#### `query.cancel(sessionId)`

* Purpose: Request cancellation of a running query.
* Response: `{ ok: true }` if cancel request accepted; bridge will emit `query.error` or `query.done` with status.

#### `query.fetchMore(sessionId, cursorToken)` *(optional)*

* Purpose: Pull next batch if bridge uses server-side cursors and explicit fetching.
* Response: `{ ok: true, data: RowBatch }`

---

### Backup & restore

These run as background jobs emitting progress events.

#### `backup.create(connectionId, options)`

* Options: `{ type: 'full'|'tables', tables?: string[], compress?: boolean, destinationPath?: string }`
* Response: `{ ok: true, data: { jobId } }`
* Events: `backup.progress` `{ jobId, percent, status, message? }`, `backup.done` `{ jobId, metadata }`, `backup.error` `{ jobId, error }`

#### `backup.list(connectionId?)`

* Response: `{ ok: true, data: BackupMetadata[] }`

#### `backup.restore(jobId, options)`

* Response: `{ ok: true, data: { jobId: restoreJobId } }` (restore job has its own progress events)

---

### Secrets

These methods interact with the OS keychain or encrypted fallback.

#### `secret.store(key, value)`

* Purpose: Store a secret (e.g., password). Bridge may map this to OS keychain and store a reference in the connection profile.
* Response: `{ ok: true }`

#### `secret.get(key)`

* Purpose: Retrieve secret (decrypted). **Only** allowed by privileged callers (renderer process in foreground with user consent).
* Response: `{ ok: true, data: { value } }` or `{ ok: false, error }`

#### `secret.delete(key)`

* Purpose: Remove stored secret.
* Response: `{ ok: true }`

---

### Health & admin

#### `health.ping()`

* Response: `{ ok: true, data: { uptimeSec, version, pid, memoryUsage } }`

#### `debug.dumpState()` *(opt-in, debug only)*

* Returns non-sensitive bridge state useful for diagnostics (active sessions, job queue length). Must never include secrets.
* Response: `{ ok: true, data: { sessions: [...], jobs: [...] } }`

---

## Events / Notifications (bridge → UI)

All events are JSON-RPC notifications (`method` field) or platform-native IPC events. Event payloads follow the shapes below:

### `query.result`

```json
{ "method": "query.result", "params": { "sessionId": "s1", "batchIndex": 0, "rows": [...], "columns": [...], "complete": false } }
```

### `query.done`

```json
{ "method": "query.done", "params": { "sessionId": "s1", "rows": 200, "timeMs": 420, "status": "success" } }
```

### `query.error`

```json
{ "method": "query.error", "params": { "sessionId": "s1", "error": { "code": "QUERY_SYNTAX_ERROR", "message": "..." } } }
```

### `backup.progress`

```json
{ "method": "backup.progress", "params": { "jobId": "b1", "percent": 42, "status": "running" } }
```

### `backup.done`

```json
{ "method": "backup.done", "params": { "jobId": "b1", "metadata": { "path": "..." } } }
```

### `connector.status`

* Emitted on connectivity changes: `{ method: 'connector.status', params: { connectionId, status: 'connected'|'disconnected'|'error', message? } }`

---

## Error model

All methods return a standardized `error` object when `ok` is `false`:

```json
{ "ok": false, "error": { "code": "DB_CONN_TIMEOUT", "message": "Connection timed out", "details": { "host": "..." } } }
```

Suggested error codes (non-exhaustive):

* `DB_CONN_REFUSED`
* `DB_AUTH_FAILED`
* `DB_TIMEOUT`
* `QUERY_SYNTAX_ERROR`
* `QUERY_CANCELLED`
* `BACKUP_FAILED`
* `RESTORE_FAILED`
* `KEYCHAIN_UNAVAILABLE`

The `details` field may contain driver raw message or diagnostic fields; include only in debug logs or when user enables advanced diagnostics.

---

## Streaming semantics & recommended batch sizes

* Default `batchSize`: 100–1000 rows depending on expected row width. Allow client to override per `query.run`.
* Batches emitted in order with increasing `batchIndex` starting at 0.
* `complete` set to `true` on the last batch.
* If streaming fails mid-way, bridge emits `query.error` with `sessionId` and error details.

---

## Example full interaction (JSON-RPC style)

1. Create session

```json
{ "jsonrpc": "2.0", "method": "query.createSession", "params": { "connectionId": "conn_123" }, "id": 1 }
```

Response:

```json
{ "jsonrpc": "2.0", "id": 1, "result": { "ok": true, "data": { "sessionId": "s_1" } } }
```

2. Run query

```json
{ "jsonrpc": "2.0", "method": "query.run", "params": { "sessionId": "s_1", "sql": "SELECT * FROM users LIMIT 500", "opts": { "batchSize": 100 } }, "id": 2 }
```

Bridge emits `query.result` notifications for batches and a `query.done` at the end.

---

## Transport notes

* **Tauri**: prefer `invoke` for simple calls, but consider WebSocket with JSON-RPC for streaming scenarios. Tauri command handlers are synchronous; use events for notifications.
* **Electron**: use `ipcMain.handle()` for requests and `ipcRenderer.send()` / events for notifications. For heavy tasks consider a separate child process to avoid blocking the main process.
* **WebSocket (dev/testing)**: WebSocket JSON-RPC server is useful for automated tests and remote-control/testing tools; ensure local-only binding and authentication.

---

## Versioning & compatibility

* Version the API in the bridge (e.g., `apiVersion: "1.0"`) and include in `health.ping()`.
* Maintain backward-compatible additions; breaking changes must increment major API version and be documented.

---

## Appendix: TypeScript type snippets

(Useful to paste into renderer-side typings)

```ts
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: any } };

export type QueryRunOpts = { batchSize?: number; maxRows?: number; transaction?: boolean; readonly?: boolean };

export type BackupOptions = { type: 'full'|'tables'; tables?: string[]; compress?: boolean; destinationPath?: string };
```

---

If you want, I can now:

* generate client-side TypeScript bindings (`api-client.ts`) that wrap the IPC calls into typed functions, or
* scaffold an example minimal bridge server that implements the `connection.test` and `query.createSession` / `query.run` flows for Postgres (TypeScript).
