<div align="center">

<img src="public/wave.png" alt="RelWave Logo" width="140" />

# RelWave

### Modern Database Management & Visualization

_A powerful, cross-platform desktop tool built with Tauri, React, and TypeScript_

[![Version](https://img.shields.io/badge/version-0.1.0--beta.5-0066ff?style=for-the-badge)](https://github.com/Relwave/relwave-app/releases)
[![License](https://img.shields.io/badge/license-MIT-00cc66?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgray?style=for-the-badge)](https://github.com/Relwave/relwave-app/releases)


[**📥 Download**](https://github.com/Relwave/relwave-app/releases) • [**✨ Features**](#-features) • [**🚀 Quick Start**](#-quick-start) • [**📚 Documentation**](#-documentation)

<img src="https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Screenshot+Placeholder" alt="RelWave Screenshot" width="100%" style="border-radius: 8px; margin: 20px 0;" />

</div>

---

## 🎯 Why RelWave?

Unlike web-based database tools, **RelWave runs natively on your desktop** with direct connections to your databases, offering:

<table>
<tr>
<td width="33%" align="center">
<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/database.svg" width="48" /><br/>
<strong>Native Performance</strong><br/>
Direct database connections without web overhead
</td>
<td width="33%" align="center">
<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/lock.svg" width="48" /><br/>
<strong>Enhanced Security</strong><br/>
Encrypted credentials stored locally
</td>
<td width="33%" align="center">
<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/settings.svg" width="48" /><br/>
<strong>Full Control</strong><br/>
Complete offline functionality
</td>
</tr>
</table>

## ✨ Features

<details open>
<summary><b>🗄️ Multi-Database Support</b></summary>
<br/>

- **PostgreSQL** - Full support for advanced features
- **MySQL** - Complete MySQL 5.7+ compatibility
- **MariaDB** - Optimized for MariaDB-specific features

</details>

<details open>
<summary><b>📊 Visual Database Tools</b></summary>
<br/>

- **ER Diagrams** - Auto-generate entity-relationship diagrams
- **Schema Explorer** - Intuitive table and column browsing
- **Data Visualization** - Built-in charts and graphs
- **Query Builder** - Visual query construction

</details>

<details open>
<summary><b>⚡ Developer-Friendly</b></summary>
<br/>

- **SQL Editor** - Syntax highlighting and auto-completion
- **Export Data** - CSV, JSON, and SQL formats
- **Connection Management** - Save and organize multiple databases
- **Auto-Updates** - Stay up-to-date automatically

</details>

## 🚀 Quick Start

### 📥 Installation

<table>
<tr>
<th width="20%">Platform</th>
<th width="30%">Download</th>
<th width="50%">Description</th>
</tr>
<tr>
<td><img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/windows.svg" width="20" /> <b>Windows</b></td>
<td><code>.exe</code> | <code>.msi</code></td>
<td>NSIS installer (recommended) or MSI package</td>
</tr>
<tr>
<td><img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/folder-linux.svg" width="20" /> <b>Linux</b></td>
<td><code>.deb</code> | <code>.AppImage</code></td>
<td>Debian package or portable AppImage</td>
</tr>
</table>

👉 **[Download the latest release →](https://github.com/Relwave/relwave-app/releases)**

### 🛠️ Build from Source

<details>
<summary>Click to expand build instructions</summary>

#### Prerequisites

```bash
# Required tools
- Node.js 18+
- pnpm
- Rust (for Tauri)
```

#### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Relwave/relwave-app.git
cd relwave-app

# 2. Install dependencies
pnpm install

# 3. Install bridge dependencies
cd bridge && pnpm install && cd ..

# 4. Run in development mode
pnpm tauri dev
```

#### Building for Production

**Windows:**

```bash
cd bridge && pnpm build && cd ..
npx pkg ./bridge/dist/index.cjs --target node18-win-x64 \
  --output ./src-tauri/resources/bridge-x86_64-pc-windows-msvc.exe
pnpm tauri build
```

**Linux:**

```bash
# Install dependencies
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# Build
cd bridge && pnpm build && cd ..
npx pkg ./bridge/dist/index.cjs --target node18-linux-x64 \
  --output ./src-tauri/resources/bridge-x86_64-unknown-linux-gnu
pnpm tauri build
```

</details>

## 📚 Documentation

### 🏗️ Architecture

RelWave uses a **bridge architecture** for optimal performance:

The application uses a **bridge architecture**:

```
┌─────────────────┐     JSON-RPC     ┌─────────────────┐
│   Tauri/React   │ <──────────────> │  Node.js Bridge │
│    Frontend     │   stdin/stdout   │   (pg, mysql2)  │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │    Databases    │
                                     │ PostgreSQL/MySQL│
                                     └─────────────────┘
```

**Benefits:**

- 🚀 Native database drivers without Rust bindings
- 🔒 Process isolation for enhanced security
- 🎯 Optimized for each database type

### 📁 Project Structure

```
RelWave/
├── 🎨 src/                      # React frontend
│   ├── components/              # UI components
│   │   ├── chart/               # Visualization components
│   │   ├── er-diagram/          # ER diagram renderer
│   │   ├── query-builder/       # Visual query builder
│   │   └── schema-explorer/     # Schema navigation
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API layer
│   └── types/                   # TypeScript definitions
│
├── 🌉 bridge/                   # Database bridge (Node.js)
│   ├── src/
│   │   ├── connectors/          # Database drivers
│   │   ├── handlers/            # JSON-RPC handlers
│   │   ├── queries/             # SQL templates
│   │   └── services/            # Business logic
│   └── __tests__/               # Test suite
│
└── 🦀 src-tauri/                # Tauri backend (Rust)
    ├── src/                     # Rust source
    ├── capabilities/            # Permissions
    └── resources/               # Bundled assets
```

### ⚙️ Configuration

**Database Connections:**

| Platform | Configuration Path                 |
| -------- | ---------------------------------- |
| Windows  | `%APPDATA%\relwave\databases.json` |
| Linux    | `~/.relwave/databases.json`        |

> 🔐 **Security Note:** Credentials are encrypted and stored separately using machine-specific keys

**Environment Variables:**

| Variable       | Purpose                           |
| -------------- | --------------------------------- |
| `RELWAVE_HOME` | Override default config directory |

## 🧪 Testing

<details>
<summary><b>Running the Test Suite</b></summary>

### Prerequisites

**Start test databases with Docker:**

```bash
cd bridge
docker-compose -f docker-compose.test.yml up -d
```

**Configure environment variables** (create `bridge/.env`):

```env
# PostgreSQL
REAL_POSTGRES_HOST=localhost
REAL_POSTGRES_PORT=5432
REAL_POSTGRES_USER=testuser
REAL_POSTGRES_PASSWORD=testpass
REAL_POSTGRES_DATABASE=testdb

# MySQL
REAL_MYSQL_HOST=localhost
REAL_MYSQL_PORT=3306
REAL_MYSQL_USER=testuser
REAL_MYSQL_PASSWORD=testpass
REAL_MYSQL_DATABASE=testdb

# MariaDB
REAL_MARIADB_HOST=localhost
REAL_MARIADB_PORT=3307
REAL_MARIADB_USER=testuser
REAL_MARIADB_PASSWORD=testpass
REAL_MARIADB_DATABASE=testdb
```

### Run Tests

```bash
cd bridge
pnpm test
```

### Test Coverage

- ✅ Database service operations
- ✅ Connection management
- ✅ PostgreSQL integration
- ✅ MySQL integration
- ✅ MariaDB integration
- ✅ Query result caching
- ✅ Encryption & persistence

</details>

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **💾 Commit** your changes: `git commit -m 'Add amazing feature'`
4. **📤 Push** to the branch: `git push origin feature/amazing-feature`
5. **🎉 Open** a Pull Request

### 📋 Contribution Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 🔄 Auto-Updates

RelWave keeps itself up-to-date automatically:

- ✅ Checks for updates on startup
- ✅ Downloads in the background
- ✅ Prompts to install when ready
- ✅ Cryptographically signed releases

## 🛠️ Built With

<table>
<tr>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tauri/tauri-original.svg" width="48" />

<b>Tauri</b><br/>
<sub>Desktop Framework</sub>

</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" width="48" />

<b>React</b><br/>
<sub>UI Library</sub>

</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" width="48" /><br/>
<b>TypeScript</b><br/>
<sub>Type Safety</sub>
</td>
<td align="center" width="20%">
<img src="https://reactflow.dev/img/favicon.ico" width="48" /><br/>
<b>React Flow</b><br/>
<sub>Diagrams</sub>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" width="48" /><br/>
<b>Tailwind CSS</b><br/>
<sub>Styling</sub>
</td>
</tr>
</table>

### Special Thanks To
- [**Freepik**](https://www.freepik.com) - Logo design (via [Flaticon](https://www.flaticon.com))

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 💙 Visualize Your Database with RelWave ✨

**[⭐ Star us on GitHub](https://github.com/Relwave/relwave-app)** • **[🐛 Report Bug](https://github.com/Relwave/relwave-app/issues)** • **[💡 Request Feature](https://github.com/Relwave/relwave-app/issues)**

<sub>Made with ❤️ by the RelWave team</sub>

</div>
