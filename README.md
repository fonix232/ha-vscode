# VS Code (Microsoft) - Home Assistant Add-on

Microsoft Visual Studio Code running in your browser, integrated
into the Home Assistant frontend.

## About

This add-on installs the **Microsoft VS Code binary** (not code-server)
and runs it using `code serve-web`. This means full extension compatibility,
including **GitHub Copilot**, **Copilot Chat**, and all other marketplace
extensions that don't work with code-server.

The approach is based on [nerasse/my-code-server](https://github.com/nerasse/my-code-server),
packaged as a Home Assistant add-on following the conventions of
[hassio-addons/addon-vscode](https://github.com/hassio-addons/addon-vscode).

## Features

- **Microsoft VS Code** — the real Visual Studio Code, not a fork
- **Full extension support** — GitHub Copilot, Copilot Chat, and all marketplace extensions
- **Home Assistant integration** — accessible through the HA sidebar via ingress
- **Persistent storage** — extensions and settings survive restarts
- **Oh My Zsh** — pre-configured terminal with syntax highlighting and autosuggestions
- **Home Assistant CLI** — `ha` command available in the terminal
- **Architecture support** — amd64 and aarch64

## Installation

### As an Add-on Repository

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the three-dot menu (⋮) in the top right and select **Repositories**
3. Add this repository URL:
   ```
   https://github.com/fonix232/ha-vscode
   ```
4. Click **Add**, then find "VS Code (Microsoft)" in the store
5. Click **Install**

### Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `config_path` | Workspace directory to open | `/config` |
| `packages` | Additional apt packages to install on startup | `[]` |
| `init_commands` | Shell commands to run before VS Code starts | `[]` |
| `log_level` | Log verbosity (trace/debug/info/warning/error/fatal) | — |

### Example configuration

```yaml
config_path: /config
packages:
  - mariadb-client
  - mosquitto-clients
init_commands:
  - git config --global user.name "My Name"
  - git config --global user.email "my@email.com"
```

## Key Differences from Community Add-on (code-server)

| Feature | This Add-on | Community Add-on |
|---------|------------|-----------------|
| VS Code binary | Microsoft VS Code | code-server (OSS fork) |
| GitHub Copilot | ✅ Full support | ❌ Not supported |
| Copilot Chat | ✅ Full support | ❌ Not supported |
| Marketplace extensions | ✅ All extensions | ⚠️ Open VSX only |
| License | Microsoft EULA | MIT |

## Architecture Support

- **amd64** (x86_64) — ✅ Fully supported
- **aarch64** (arm64) — ✅ Supported

## License

MIT License — see [LICENSE](LICENSE) for details.

The VS Code binary itself is subject to the
[Microsoft Software License Terms](https://code.visualstudio.com/License/).
