# ✅ **Backend Implementation — 15-Step Checklist**

Use this as your roadmap to build the entire backend/bridge.

### **1. Scaffold the bridge project**

- Create `/bridge` directory
- Use **TypeScript + ts-node** (dev) or Rust (if Tauri-native)
- Setup `package.json`, tsconfig, nodemon, and basic folder structure

### **2. Implement the Connector interface (shared contract)**

- Create `/bridge/connectors/connector.ts`
- Add `testConnection`, `getMetadata`, `runQuery`, `exportTable`, etc.

### **3. Implement the Postgres connector**

- Use `pg` driver
- Write:

  - `testConnection()`
  - `getMetadata()` (schemas, tables, columns)
  - `runQuery()` with cursor/streaming

- Add integration tests (via Docker Testcontainers)

### **4. Set up a simple IPC server (dev mode)**

- JSON-RPC over WebSocket or stdio
- Handle:

  - `query.run`
  - `connection.test`
  - `metadata.listSchemas`

- Respond using the standard envelope: `{ ok, data, error }`

### **5. Add a session manager**

- Generates session IDs
- Tracks active queries
- Handles timeout, cleanup, cancellation

### **6. Add query cancellation**

- For Postgres: use `client.query('CANCEL ...')` or a dedicated cancel connection
- Update `query.cancel(sessionId)`

### **7. Add streaming result support**

- Use cursor-based fetching
- Emit `query.result` events with batches
- Emit `query.done` when complete

### **8. Add metadata inspection**

Implement for Postgres:

- List tables
- List schemas
- Column definitions
- Foreign keys
- Indexes

Normalize metadata to a **consistent JSON structure** used across all DB types.

### **9. Add secrets storage**

- Prefer OS **keychain**: `keytar` (Node)
- Fallback: encrypted JSON using `libsodium` or AES
- Methods:

  - `secret.store(key, value)`
  - `secret.get(key)`

### **10. Add logging**

- JSON logs
- Rotating log files in app-data directory
- Log levels: debug / info / warn / error
- Include timestamps & sessionId

### **11. Add health check RPC**

- `health.ping()` returning:

  - uptime
  - version
  - CPU + memory usage

Good for debugging and for UI diagnostics.

### **12. Add backups (worker system)**

- Backup worker:

  - For Postgres: spawn `pg_dump`
  - For SQLite: copy file
  - For MySQL: spawn `mysqldump`

- Emit:

  - `backup.progress`
  - `backup.done`

- Store metadata in app data DB (SQLite)

### **13. Add restore functionality**

- Restore worker:

  - For Postgres: `psql` import
  - For MySQL: pipe SQL to mysql client
  - For SQLite: replace DB file

- Emit `backup.restore.progress` & `.done`

### **14. Add integration tests + CI**

- Spin DBs via Testcontainers
- Test metadata extraction
- Test streaming queries
- Test cancellation
- GitHub Actions matrix:

  - lint
  - unit tests
  - integration tests
  - build for mac/win/linux

### **15. Prepare for production bundling**

- Freeze IPC API surface
- Add type definitions for all RPC methods
- Implement graceful shutdown logic
- Integrate with Tauri/Electron main process
- Produce:

  - `bridge-build.js` (Electron) or
  - Rust binary (Tauri)

- Final manual QA:

  - Connect
  - Query
  - Backup
  - Restore
  - Cancel long queries
  - Simultaneous sessions

---

