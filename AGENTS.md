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
        nginx-vscode.conf.tmpl # nginx reverse proxy: port 1337 → 127.0.0.1:1338
        vscode-sync.js         # njs: per-HA-user secret storage sync
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
  renovate.json                # Tracks VSCODE_VERSION in Dockerfile + config.yaml version
  scripts/
    changelog.js               # Writes CHANGELOG entries (VS Code notes + add-on changes)
  workflows/
    build.yaml                 # Builds & pushes ghcr.io images (release or dispatch)
    vscode-update.yaml         # Verifies, merges, releases & builds Renovate VS Code PRs
```

---

## Key architectural decisions

### Why nginx sits in front of `code serve-web`

HA Supervisor strips the ingress URL prefix before forwarding requests to the
add-on container. VS Code registers its `/_vscode-cli/` handlers (including
the `mint-key` AES key endpoint) under the full ingress path set via
`--server-base-path`. Without restoring that prefix, the `mint-key` POST
returns 404/503 and VS Code cannot derive the AES key for localStorage secret
storage — losing GitHub Copilot auth and all other extension credentials on
every page load.

**Fix:** nginx on port 1337 proxies to `code serve-web` on `127.0.0.1:1338`.
At container start-up the `nginx-vscode/run` script reads the current ingress
entry via `bashio::addon.ingress_entry` and substitutes it into
`nginx-vscode.conf.tmpl` (placeholder `@@INGRESS@@`), producing a runtime
config at `/tmp/nginx-vscode.conf`. The generated config adds a dedicated
`location /_vscode-cli/` block that prepends the ingress path before
forwarding to VS Code, making the `mint-key` endpoint reachable.

The HA ingress token rotates on every add-on restart. VS Code sets a fresh
`vscode-secret-key-path` cookie on the very next HTTP response (the page
load), so the browser self-heals automatically on first access after a
restart.

### Per-user secret storage sync

VS Code web keeps extension secrets encrypted in browser `localStorage`
(`secrets.provider`). The AES key comes from `mint-key`:
`SHA256(server half + client half)`. The client half is the HttpOnly
`vscode-cli-secret-half` cookie, and VS Code **deletes** the blob when it
cannot decrypt it. Left as is, every browser, device and HA URL starts
signed out.

`rootfs/etc/nginx/vscode-sync.js` (njs, `libnginx-mod-http-js`) ties secrets
to the HA user instead, keyed by the `X-Remote-User-Id` header that Supervisor
ingress sets and strips from client requests:

- **Pinned key half.** `js_set $vscode_cookie` replaces the cookie's client
  half with `HMAC(/data/vscode/sync-key, user id)` on every upstream request.
  Each user then derives the same AES key everywhere.
- **Injected script.** `sub_filter` on `location = /` (the workbench page)
  injects `<script src="…/_ha-vscode/sync.js">`. The script is same-origin,
  so the workbench CSP allows it.
- **Restore.** `sync.js` seeds `localStorage` with the user's stored blob
  before the workbench loads.
- **Save.** `sync.js` wraps `Storage.prototype.setItem` and PUTs changes to
  `/_ha-vscode/secrets`, which writes `/data/vscode/sync/<user id>.secrets`.
  Removals are not synced, so a failed decrypt never wipes the server copy.
- **Workers.** nginx workers run as `www-data`; `init-vscode` chowns
  `/data/vscode/sync`.

Without the header (no Supervisor), all of this falls back to stock VS Code
behaviour.

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
| `sync/` | Per-HA-user encrypted secret storage blobs (owned by `www-data`) |
| `sync-key` | HMAC key for per-user secret key halves (generated once) |

### S6 service startup order

```
base → init-user → init-vscode → nginx-vscode → vscode
                                              → vscode-tunnel
```

`vscode` depends on `nginx-vscode` being ready so nginx owns port 1337 before
the health check (`curl http://127.0.0.1:1337/healthz`) fires.

### Version synchronisation

The add-on version format is `{VSCODE_VERSION}.{ADDON_REVISION}` (e.g.
`1.118.1.0`, `1.118.1.1`).  The fourth component is the add-on revision and
allows releasing fixes to the add-on itself without waiting for a new VS Code
version.  HA's `AwesomeVersion` library treats this as a 4-part `SIMPLEVER`
and sorts it correctly (unlike `-1` SemVer pre-release suffixes, which sort
*lower* than the base version).

`vscode/config.yaml#version` is the single source of truth.  Renovate bumps
`VSCODE_VERSION` in the Dockerfile and resets `config.yaml` to
`{NEW_VERSION}.0` in the same PR (two regex managers sharing the
`microsoft/vscode` dependency).  The `vscode-update.yaml` workflow then checks
the two agree, adds the changelog entry to the PR, merges it, creates the
`v{version}` release and dispatches `build.yaml`.

Renovate treats a PR as edited, and stops updating it, as soon as a commit by
any other author lands on its branch.  The changelog commit is therefore made
as `github-actions[bot]`, which `renovate.json` lists in `gitIgnoredAuthors`.
Do not push to Renovate branches under any other identity, and keep that entry
in place.  When Renovate rewrites the branch (new version, conflict), the
commit is dropped and the next workflow run adds it again.

Releases created with `GITHUB_TOKEN` do not trigger other workflows, which is
why the build is dispatched explicitly rather than relying on the release
event.  Releases created manually still trigger `build.yaml` via `release`.

When bumping the Dockerfile manually, update `config.yaml` to
`{NEW_VERSION}.0` as well.

### Changelog

`vscode/CHANGELOG.md` is what HA shows in the add-on store, and each entry
is also used as the release notes for its GitHub release.  It has one
`## <add-on version>` entry per release, newest first.

- **VS Code bumps** (`.0`) are written by `.github/scripts/changelog.js`:
  - a `### VS Code x.y.z` section with the release highlights from
    `microsoft/vscode-docs` (or the "Update x.y.z" line for patch releases)
    and a link to the full notes;
  - a `### Add-on changes` section with every entry above the newest tagged
    one, since those were never released on their own.  They ship with this
    VS Code bump.
- **Add-on revisions** are written by hand: add a
  `## <version>` entry with user-facing bullets in the same change that bumps
  the revision (rule 9).  If it is not released on its own, the next VS Code
  bump folds it in.

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

4. **Keep the nginx config template in `/etc/nginx/nginx-vscode.conf.tmpl`**, not
   `/etc/nginx/nginx.conf` — the base image may ship its own nginx.conf. The
   `nginx-vscode/run` script substitutes `@@INGRESS@@` with the current ingress
   entry at container start-up and writes the result to `/tmp/nginx-vscode.conf`.

5. **Both `amd64` and `aarch64` must be supported.** VS Code is downloaded as
   an architecture-specific `.deb` inside the Dockerfile `RUN` layer.

6. **Renovate manages `VSCODE_VERSION` only** (in the Dockerfile and the
   matching `config.yaml` version). Do not add other version tracking to
   `renovate.json` unless explicitly asked (`gitIgnoredAuthors` is required by
   the changelog step, see Version synchronisation). The CI build uses the Dockerfile's
   `BUILD_FROM` default; do not pass `BUILD_FROM` from the workflow.

7. **s6 service scripts must be executable (`chmod +x`).** Files under
   `s6-rc.d/*/run` and `s6-rc.d/*/finish` are shell scripts and must have the
   execute bit set.

8. **Do not commit the `src/` directory.** It is used only for temporary
   source-code research and is not part of the add-on.

9. **Bump the add-on revision on every functional change.** Whenever you modify
   any file under `vscode/` (rootfs, Dockerfile, config, etc.) increment the
   last component of `version` in `vscode/config.yaml` by 1
   (e.g. `1.118.1.0` → `1.118.1.1`). This ensures users receive the update
   via HA's add-on store. Do not bump the revision for changes that only affect
   CI workflows, documentation, or Renovate config.  Add a matching
   `## <version>` entry to `vscode/CHANGELOG.md` in the same change.

---

## Common tasks

### Bump VS Code manually
1. Update `ARG VSCODE_VERSION="<new>"` in `vscode/Dockerfile`.
2. Update `version: <new>.0` in `vscode/config.yaml`.
3. Run `node .github/scripts/changelog.js add <new>.0` to write the
   changelog entry (needs the release tags fetched locally: `git fetch --tags`).
4. Commit, push, then create the release, which triggers the build workflow:
   `gh release create v<new>.0 --title "VS Code <new>.0" --notes "$(node .github/scripts/changelog.js notes <new>.0)"`.

### Release an add-on fix without a new VS Code version
1. Increment the last component of `version` in `vscode/config.yaml`
   (e.g. `1.118.1.0` → `1.118.1.1`).
2. Add a `## <version>` entry to `vscode/CHANGELOG.md`.
3. Commit, push, then create the release, which triggers the build workflow:
   `gh release create v<version> --title "VS Code <version>" --notes "$(node .github/scripts/changelog.js notes <version>)"`.

### Add a new s6 service `<svc>`
1. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/type` → `longrun`
2. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/run` (executable)
3. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/finish` (executable)
4. Create `rootfs/etc/s6-overlay/s6-rc.d/<svc>/dependencies.d/<dep>` for each
   dependency.
5. Create `rootfs/etc/s6-overlay/s6-rc.d/user/contents.d/<svc>` to register it
   in the bundle.

### Test the nginx config syntax locally
The config needs the njs module, so test it in the add-on image:
```bash
docker build --build-arg BUILD_ARCH=aarch64 -t ha-vscode-test vscode
docker run --rm --entrypoint bash ha-vscode-test -c \
  'sed "s|@@INGRESS@@|/test|g" /etc/nginx/nginx-vscode.conf.tmpl > /tmp/n.conf && nginx -t -c /tmp/n.conf'
```
