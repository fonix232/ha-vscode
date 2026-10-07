# Changelog

## 1.141.0.0

### VS Code 1.141.0

This release makes it easier to manage agent sessions, protect agent workflows, edit columnar text, and work across GitHub Enterprise instances.

- [Clean up worktree storage](https://code.visualstudio.com/updates/v1_141#reclaim-storage-from-inactive-worktrees): Reclaim disk space from inactive agent session worktrees, on demand or automatically.
- [Cross-platform sandboxing](https://code.visualstudio.com/updates/v1_141#sandboxing-in-the-copilot-agent-host): Limit agent access to files and network resources on Windows, macOS, and Linux with terminal sandboxing.
- [Arrange sessions](https://code.visualstudio.com/updates/v1_141#arrange-sessions-in-a-grid): Compare and monitor multiple agent sessions side by side in a grid layout.
- [Continue external sessions](https://code.visualstudio.com/updates/v1_141#continue-local-external-copilot-sessions-without-reloading): Pick up local external Copilot and Codex conversations in VS Code without losing context.
- [Block pasting](https://code.visualstudio.com/updates/v1_141#spreading-block-pasting): Paste block rows across successive lines from a single cursor.
- [Multiple GitHub Enterprise instances](https://code.visualstudio.com/updates/v1_141#sign-in-to-multiple-github-enterprise-instances): Sign in to GHE.com and GitHub Enterprise Server accounts from the same VS Code window.

[Full release notes](https://code.visualstudio.com/updates/v1_141)

## 1.140.0.1

- Signed-in accounts (GitHub, Copilot and other extension credentials) now
  follow your Home Assistant user to every browser, device and HA URL. nginx
  pins VS Code's secret key half to the HA user and stores the encrypted
  secrets on the add-on (`/data/vscode/sync/`).
- You need to sign in to your accounts once more after this update.

## 1.140.0.0

### VS Code 1.140.0

This release expands agent workflows, improves worktree reuse, and adds enterprise AI controls.

- [Copilot harness](https://code.visualstudio.com/updates/v1_140#copilot-harness): Use the Copilot harness and get consistent agent behavior across Copilot products.
- [Multi-folder sessions (Experimental)](https://code.visualstudio.com/updates/v1_140#multi-folder-sessions-experimental): Work on tasks across multiple folders within a single agent session.
- [Remote delegation (Experimental)](https://code.visualstudio.com/updates/v1_140#delegate-tasks-to-remote-agent-hosts-experimental): Delegate tasks to connected remote agent hosts.
- [HydraFusion (Research Preview)](https://code.visualstudio.com/updates/v1_140#hydrafusion-model-orchestration-research-preview): Let multiple models draft, critique, and revise coding tasks without coordinating them yourself.
- [Shared worktree folders (Experimental)](https://code.visualstudio.com/updates/v1_140#reuse-ignored-folders-across-worktrees-experimental): Avoid repeated dependency installs and duplicated artifacts by reusing ignored folders across worktrees.
- [Enterprise controls](https://code.visualstudio.com/updates/v1_140#enterprise): Ensure everyone in your org follows AI version requirements and defaults.

[Full release notes](https://code.visualstudio.com/updates/v1_140)

## 1.139.1.0

### VS Code 1.139.1

The update addresses these [issues](https://github.com/microsoft/vscode/pulls?q=is%3Apr+milestone%3A1.139.1+is%3Aclosed+label%3Acandidate).

[Full release notes](https://code.visualstudio.com/updates/v1_139)

## 1.139.0.0

### VS Code 1.139.0

This release makes large agent session lists faster, extends Dev Container support to remote projects, and improves everyday editing.

- [Remote Dev Container sessions](https://code.visualstudio.com/updates/v1_139#run-agent-sessions-in-dev-containers-on-remote-hosts): Run agents inside your project's Dev Container on SSH, Tunnel, and WSL hosts.
- [Session list improvements](https://code.visualstudio.com/updates/v1_139#faster-session-list-loading): Load large session lists faster, fit more sessions on screen, and in-place session renaming.
- [Editor experience](https://code.visualstudio.com/updates/v1_139#editor-experience): Identify wrapped lines at a glance and avoid duplicate closing brackets as you type.

[Full release notes](https://code.visualstudio.com/updates/v1_139)

## 1.138.0.0

### VS Code 1.138.0

Welcome to the 1.138 release of Visual Studio Code. This release helps agents work in your project's development environment, gives Codex sessions more flexibility, and keeps completed sessions organized.

- [Agent sessions in Dev Containers](https://code.visualstudio.com/updates/v1_138#run-agent-sessions-in-local-dev-containers): Run agents with your project's tools and dependencies in a local Dev Container.
- [Expanded Codex harness](https://code.visualstudio.com/updates/v1_138#expanded-codex-support-in-the-agent-host): Continue Codex sessions across apps, choose between Copilot and ChatGPT subscriptions, and use VS Code tools.
- [Session cleanup (Preview)](https://code.visualstudio.com/updates/v1_138#keep-completed-sessions-organized-preview): Automatically mark merged sessions as done and optionally delete them after a grace period.

[Full release notes](https://code.visualstudio.com/updates/v1_138)

## 1.119.0.0

### VS Code 1.119.0

Welcome to the 1.119 release of Visual Studio Code. This release focuses on smoother agent interactions, enhanced observability, and more efficient trust and security controls.

- [Agent-browser interaction](https://code.visualstudio.com/updates/v1_119#sharing-browser-tabs-with-agents): Let agents discover and ask for integrated browser access.
- [Optimized token usage](https://code.visualstudio.com/updates/v1_119#optimized-token-usage-for-managing-todo-lists-experimental): Use a lightweight model to manage agent todo lists.
- [OpenTelemetry tracing](https://code.visualstudio.com/updates/v1_119#opentelemetry-tracing-for-agent-sessions): Monitor agent sessions with OpenTelemetry.
- [Trust and developer efficiency](https://code.visualstudio.com/updates/v1_119#trust-and-security): Get less interrupted by requests for network access or temp folder writes.
- [Markdown preview](https://code.visualstudio.com/updates/v1_119#swap-current-editor-to-markdown-preview): Quickly switch between Markdown source and preview.

[Full release notes](https://code.visualstudio.com/updates/v1_119)

## 1.118.1.2

- Fix: revert the `headers-more` nginx module from 1.118.1.1, which broke the VS Code installation in the image.

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
