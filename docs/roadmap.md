# 🧭 DB Visualizer — Roadmap

This roadmap outlines the planned development milestones for the **DB Visualizer** application. It is divided into clear phases: MVP, Alpha, Beta, and V1. Each phase contains specific backend, bridge, UI, and packaging tasks. Use this roadmap to track progress and prioritize development.

---

# 🚀 Milestone 1 — MVP (Minimum Viable Product)

**Goal:** A functional Tauri + Node bridge system that can connect to a database, run queries, and stream results.

### ✅ Core Features

- Basic Tauri shell
- Bridge process (Node.js) spawned via Tauri
- JSON-RPC communication over stdio
- Postgres connector (testConnection + basic query)
- Cursor-based streaming for large queries
- Session Manager (create/cancel sessions)
- Display query results in UI

### 📌 Tasks

- Implement `/bridge` TypeScript project
- Add JSON-RPC wrapper for stdin/stdout
- Implement `connection.test`
- Implement `query.createSession`
- Implement `query.run` w/ streaming
- Implement simple error handling
- Add Tauri spawn + message forwarding
- Build basic query editor UI

---

# 🧪 Milestone 2 — Alpha

**Goal:** Reliable backend with metadata browsing and essential safety features.

### 🔧 Backend Improvements

- Metadata: tables, columns, FK, indexes
- Basic query cancellation
- Health checks (`health.ping`)
- Automatic restart watchdog if bridge crashes
- OS keychain support (`keytar`)

### 🖥 UI Improvements

- Schema explorer panel
- Tabbed query editor
- Result table virtualization
- Query error formatting

### 📌 Tasks

- Add PG metadata extraction
- Add session timeout cleanup
- Add watchdog + restart logic
- Implement `keytar` secure storage
- Improve UI for results + errors

---

# 🧷 Milestone 3 — Beta

**Goal:** A polished local database client with backups, restores, and logging.

### 🗄 Backend

- Backup job worker

  - Full DB backups
  - Table-level backups

- Restore job worker
- Rotating log files
- Graceful shutdown (close connections + sessions)

### 🖥 UI

- Backup management screen
- Backup progress UI
- Connection management screen
- App settings UI

### 📌 Tasks

- Implement backup.create + backup.progress
- Implement restore workflow
- Add persistent logging to file system
- Add settings (paths, logs, theme)

---

# 🎁 Milestone 4 — V1 Release

**Goal:** Production-ready app with packaging, multi-platform support, and documentation.

### 📦 Packaging

- Bundle Node backend or binary-compile bridge
- Tauri bundling for macOS, Windows, Linux
- App icons, branding, auto-updates (optional)

### 📖 Documentation

- Full docs site (GitHub Pages)
- API.md fully updated
- Developer guide
- Contribution guide

### 📌 Tasks

- Finalize packaging approach
- Build cross-platform artifacts
- Test app on all platforms
- Complete documentation site

---

# 🌟 Future Enhancements (Post-V1)

- Additional connectors: MySQL, SQLite, MSSQL
- ER diagram auto-generation
- AI-powered query assistant
- Natural language → SQL
- Query explanation system
- Visual query builder
- Multi-window support

---

# ✔️ Summary

This roadmap gives a clear and structured path from MVP to production-level release. Each milestone builds on the previous one, ensuring stable growth and maintainability.
