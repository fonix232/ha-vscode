# Changelog

## 1.118.1.1

- Fix: auth (GitHub Copilot, Settings Sync) now survives addon restarts. nginx uses the `headers-more` module to rewrite the `vscode-secret-key-path` cookie to always reflect the current HA ingress token, so the mint-key endpoint is never stale.

## 1.118.1.0

- VS Code 1.118.1
- Fix page-refresh auth loss: nginx template with ingress path substitution routes `/_vscode-cli/mint-key` correctly through HA Supervisor ingress
- 4-part versioning (`{VSCODE_VERSION}.{ADDON_REVISION}`)

## 1.0.0

- Initial release
- Microsoft VS Code via `code serve-web`
- Home Assistant ingress integration
- Support for amd64 and aarch64
- Persistent extensions and settings storage
- Oh My Zsh with plugins
- Home Assistant CLI included
- Configurable workspace path, packages, and init commands
