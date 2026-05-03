# AI Agent Guidelines — ha-vscode

Home Assistant add-on that runs the official Microsoft VS Code binary in web
mode, served through the HA Supervisor ingress.

---

## Repository layout

```
vscode/
  config.yaml          # Add-on manifest; version must equal VSCODE_VERSION in Dockerfile
  build.yaml           # Base image per architecture (amd64, aarch64)
  Dockerfile           # Single-stage build; installs VS Code .deb + nginx
  DOCS.md              # User-facing documentation
  CHANGELOG.md         # Human-readable changelog
  rootfs/
    etc/
      nginx/
        nginx-vscode.conf      # nginx reverse proxy: port 1337 → 127.0.0.1:1338
      s6-overlay/s6-rc.d/
        init-user/             # Installs packages, sets up SSH/git, runs init_commands
        init-vscode/           # Creates /data/vscode/* directories, seeds settings
        nginx-vscode/          # s6 longrun: nginx on port 1337
        vscode/                # s6 longrun: `code serve-web` on 127.0.0.1:1338
        vscode-tunnel/         # s6 longrun: `code tunnel` (optional, off by default)
        user/contents.d/       # Bundle membership for each service above
    root/
      .vscode-settings/
        settings.json          # Default settings seeded on first start
.github/
  renovate.json                # Tracks VSCODE_VERSION in Dockerfile via github-releases
  workflows/
    build.yaml                 # Builds & pushes ghcr.io images on GitHub release
    vscode-update.yaml         # Auto-updates config.yaml when Renovate bumps Dockerfile
```

---

## Key architectural decisions

### Why nginx sits in front of `code serve-web`

HA Supervisor strips the ingress URL prefix before forwarding requests to the
add-on container. The VS Code CLI proxy sets a `vscode-secret-key-path` cookie
that encodes the full ingress path; the browser then POSTs to that path to
derive an AES encryption key for localStorage secrets. Because the path is
stripped, the request reaches the add-on as `/_vscode-cli/mint-key`, which the
CLI proxy does not recognise — returning a 404.

VS Code interprets a non-network 404 as a permanent failure and calls
`localStorage.removeItem('secrets.provider')`, wiping all stored tokens (GitHub
Copilot auth, etc.) on every page load.

**Fix:** nginx on port 1337 proxies to `code serve-web` on `127.0.0.1:1338`
and strips `Set-Cookie` from every response (`proxy_hide_header Set-Cookie`).
Without the cookie, the workbench falls back to storing secrets server-side via
the remote extension host, which persists to `/data/vscode/server-data`.

Do not remove or bypass nginx. Do not add `--user-data-dir` to `code
serve-web` — that flag is not accepted in web mode.

### Persistent paths (all under `/data/vscode/`)

| Path | Contents |
|---|---|
| `server-data/` | VS Code server state (extensions, global storage) — passed via `--server-data-dir` |
| `cli-data/` | CLI metadata, connection token, key halves — passed via `--cli-data-dir` |
| `user-data/` | User settings (settings.json, keybindings, snippets) |
| `extensions/` | Reserved for future extension pre-installation |
| `tunnel-data/` | Reserved for tunnel mode |

### S6 service startup order

```
base → init-user → init-vscode → nginx-vscode → vscode
                                              → vscode-tunnel
```

`vscode` depends on `nginx-vscode` being ready so nginx owns port 1337 before
the health check (`curl http://127.0.0.1:1337/healthz`) fires.

### Version synchronisation

`vscode/config.yaml#version` must always equal `VSCODE_VERSION` in
`vscode/Dockerfile`. The `vscode-update.yaml` workflow enforces this
automatically for Renovate PRs. When bumping manually, update both.

---

## Rules for making changes

1. **Never change the ingress port (1337).** It is declared in `config.yaml`
   (`ingress_port: 1337`) and matched by the Docker `HEALTHCHECK`. nginx must
   always own this port.

2. **Always pass `--server-base-path` to `code serve-web`** using
   `$(bashio::addon.ingress_entry)`. Without it, the workbench generates asset
   URLs that bypass ingress entirely.

3. **Do not add new apt packages to the `RUN` layer without a
   `# hadolint ignore=DL3008` comment** — the base image does not pin apt
   package versions, and hadolint will fail the build.

4. **Keep the nginx config in `/etc/nginx/nginx-vscode.conf`**, not in
   `/etc/nginx/nginx.conf` — the base image may ship its own nginx.conf.

5. **Both `amd64` and `aarch64` must be supported.** VS Code is downloaded as
   an architecture-specific `.deb` inside the Dockerfile `RUN` layer.

6. **Renovate manages `VSCODE_VERSION` only.** Do not add other version
   tracking to `renovate.json` unless explicitly asked. The base image version
   in `build.yaml` and `Dockerfile` is managed separately if needed.

7. **s6 service scripts must be executable (`chmod +x`).** Files under
   `s6-rc.d/*/run` and `s6-rc.d/*/finish` are shell scripts and must have the
   execute bit set.

8. **Do not commit the `src/` directory.** It is used only for temporary
   source-code research and is not part of the add-on.

---

## Common tasks

### Bump VS Code manually
1. Update `ARG VSCODE_VERSION="<new>"` in `vscode/Dockerfile`.
2. Update `version: <new>` in `vscode/config.yaml`.
3. Add an entry to `vscode/CHANGELOG.md`.
4. Commit, push, create a GitHub release to trigger the build workflow.

### Add a new s6 service `<svc>`
1. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/type` → `longrun`
2. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/run` (executable)
3. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/finish` (executable)
4. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/dependencies.d/<dep>` for each
   dependency.
5. Create `rootfs/etc/s6-overlay/s6-rc.d/user/contents.d/<svc>` to register it
   in the bundle.

### Test the nginx config syntax locally
```bash
docker run --rm -v "$PWD/vscode/rootfs/etc/nginx/nginx-vscode.conf:/etc/nginx/nginx-vscode.conf" \
  nginx:alpine nginx -t -c /etc/nginx/nginx-vscode.conf
```
