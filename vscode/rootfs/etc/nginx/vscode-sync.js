// njs handlers that persist VS Code's browser secret storage per HA user.
//
// VS Code web keeps extension secrets (GitHub/Copilot tokens etc.) encrypted
// in localStorage under `secrets.provider`.  The AES key is derived by the
// mint-key endpoint from the server's key half and the client half held in
// the HttpOnly `vscode-cli-secret-half` cookie.  Both the cookie and the
// localStorage blob are per browser, so every new browser, device or HA URL
// starts signed out.
//
// To make the session follow the HA user instead:
//   * cookie() replaces the client half with HMAC(secret, user id), so each HA
//     user gets the same AES key everywhere;
//   * save() stores the user's encrypted blob server-side;
//   * script() serves a script, injected into the workbench page, that seeds
//     localStorage with that blob before VS Code loads and sends every change
//     back to save().
//
// The user id comes from the X-Remote-User-Id header, which HA Supervisor
// ingress sets (and strips from client requests).  Without it everything
// falls back to stock VS Code behaviour.
import fs from 'fs';
import crypto from 'crypto';

const SYNC_DIR = '/data/vscode/sync';
const SECRET_COOKIE = 'vscode-cli-secret-half';

function userId(r) {
    const id = r.headersIn['X-Remote-User-Id'];
    return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

function secretsPath(id) {
    return `${SYNC_DIR}/${id}.secrets`;
}

// Cookie header for the upstream request, with the client key half pinned to
// a stable per-user value.  Encoded as URL-safe base64 with padding, which is
// what serve-web's SecretKeyPart::decode expects.
function cookie(r) {
    const original = r.headersIn.Cookie || '';
    const id = userId(r);
    const secret = process.env.VSCODE_SYNC_SECRET;
    if (!id || !secret) {
        return original;
    }

    const half = crypto.createHmac('sha256', secret)
        .update(`${SECRET_COOKIE}:${id}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const pairs = original.split(/;\s*/)
        .filter((p) => p && !p.startsWith(`${SECRET_COOKIE}=`));
    pairs.push(`${SECRET_COOKIE}=${half}`);
    return pairs.join('; ');
}

// Runs in the browser before the workbench.  The server copy is
// authoritative: a local blob from another user or an older key could not be
// decrypted anyway, and VS Code would delete it.  Removals are not synced, so
// a failed decrypt never wipes the server copy.
const CLIENT_SCRIPT = `(function (stored, endpoint) {
    var KEY = 'secrets.provider';
    var storage = window.localStorage;
    var setItem = Storage.prototype.setItem;
    try {
        if (stored === null) {
            storage.removeItem(KEY);
        } else {
            setItem.call(storage, KEY, stored);
        }
    } catch (err) {
        console.error('[ha-vscode] Could not restore secrets', err);
    }

    var last = stored;
    var pending = null;
    var inflight = false;

    // One request at a time, always sending the newest value, so writes
    // cannot land out of order.
    function flush() {
        if (pending === null) {
            inflight = false;
            return;
        }
        var value = pending;
        pending = null;
        inflight = true;
        fetch(endpoint, {
            method: 'PUT',
            body: value,
            credentials: 'same-origin',
            keepalive: value.length < 60000
        }).then(function (res) {
            if (!res.ok) {
                console.error('[ha-vscode] Saving secrets failed: HTTP ' + res.status);
            }
        }, function (err) {
            console.error('[ha-vscode] Saving secrets failed', err);
        }).then(flush);
    }

    Storage.prototype.setItem = function (key, value) {
        setItem.apply(this, arguments);
        if (this === storage && key === KEY && value !== last) {
            last = value;
            pending = String(value);
            if (!inflight) {
                flush();
            }
        }
    };
})`;

function script(r) {
    const id = userId(r);
    let body = '';

    if (id) {
        let stored = null;
        try {
            stored = fs.readFileSync(secretsPath(id), 'utf8');
        } catch (e) {
            if (e.code !== 'ENOENT') {
                r.error(`vscode-sync: reading secrets for ${id} failed: ${e}`);
            }
        }
        const endpoint = `${r.variables.ingress_entry}/_ha-vscode/secrets`;
        body = `${CLIENT_SCRIPT}(${JSON.stringify(stored)}, ${JSON.stringify(endpoint)});\n`;
    }

    r.headersOut['Content-Type'] = 'text/javascript; charset=utf-8';
    r.headersOut['Cache-Control'] = 'no-store';
    r.return(200, body);
}

function save(r) {
    const id = userId(r);
    if (!id) {
        r.return(403);
        return;
    }
    if (r.method !== 'PUT') {
        r.return(405);
        return;
    }

    // VS Code stores base64(clientKey | iv | ciphertext).
    const body = r.requestText || '';
    if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
        r.return(400);
        return;
    }

    const path = secretsPath(id);
    const tmp = `${path}.tmp`;
    try {
        fs.writeFileSync(tmp, body);
        fs.renameSync(tmp, path);
    } catch (e) {
        r.error(`vscode-sync: saving secrets for ${id} failed: ${e}`);
        r.return(500);
        return;
    }
    r.return(204);
}

export default { cookie, script, save };
