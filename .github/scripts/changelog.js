// Maintains vscode/CHANGELOG.md.
//
// Used by .github/workflows/vscode-update.yaml for Renovate VS Code bumps, and
// by hand:
//
//   node .github/scripts/changelog.js add <version>
//       Add the entry for a VS Code bump (<vscode version>.0): VS Code's
//       release highlights plus any unreleased add-on entries, folded in.
//   node .github/scripts/changelog.js notes <version>
//       Print a version's entry, e.g. for GitHub release notes.
//
// Entries are `## <add-on version>` sections, newest first. An entry is
// unreleased while no `v<version>` tag exists; unreleased entries above the
// newest released one ship with the next VS Code bump.
'use strict';

const NOTES_PAGE = 'https://code.visualstudio.com/updates';
const NOTES_SOURCE = 'https://raw.githubusercontent.com/microsoft/vscode-docs/main/release-notes';
const SITE = 'https://code.visualstudio.com';

function parse(text) {
  const parts = text.split(/^(?=## )/m);
  const preamble = parts[0].startsWith('## ') ? '' : parts.shift();
  const sections = parts.map((raw) => ({ version: raw.match(/^## (\S+)/)[1], raw }));
  return { preamble, sections };
}

function format(preamble, sections) {
  return [preamble.trimEnd(), ...sections.map((s) => s.raw.trimEnd())]
    .filter(Boolean)
    .join('\n\n') + '\n';
}

function body(raw) {
  return raw.replace(/^## .*\n/, '').trim();
}

/** The entry for `version`, without its heading, or null. */
function section(text, version) {
  const found = parse(text).sections.find((s) => s.version === version);
  return found ? body(found.raw) : null;
}

/** Makes the release notes' in-page and site-relative links absolute. */
function absolutize(md, page) {
  return md
    .replace(/\]\(#/g, `](${page}#`)
    .replace(/\]\(\/(?!\/)/g, `](${SITE}/`);
}

/**
 * Markdown summary of a VS Code release, from microsoft/vscode-docs: the
 * highlights of a minor release, or the "Update x.y.z" line of a
 * patch release. Falls back to just the link if the notes are not published
 * yet, so a release is never blocked on them.
 */
async function vscodeNotes(vscodeVersion, fetchImpl = fetch) {
  const [major, minor, patch] = vscodeVersion.split('.');
  const slug = `v${major}_${minor}`;
  const page = `${NOTES_PAGE}/${slug}`;

  let md = '';
  try {
    const res = await fetchImpl(`${NOTES_SOURCE}/${slug}.md`);
    if (res.ok) {
      md = await res.text();
    }
  } catch {
    // Fall through to the link-only entry.
  }

  const paragraphs = [];
  if (Number(patch) > 0) {
    const escaped = vscodeVersion.replace(/\./g, '\\.');
    const update = md.match(new RegExp(`^\\*\\*Update ${escaped}\\*\\*: *(.+)$`, 'm'));
    if (update) {
      paragraphs.push(update[1].trim());
    }
  } else {
    // Newer notes have a "Release highlights" section; older ones open with
    // a "Welcome to the x.y release" paragraph and bullets.
    const highlights = md.match(/^## Release highlights[ \t]*\n([\s\S]*?)(?=^<!--|^## )/m)
      || md.match(/^(Welcome to the [\s\S]*?)(?=^Happy Coding|^---|^<!--|^## )/m);
    if (highlights) {
      const blocks = highlights[1].split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
      const bullets = blocks.filter((b) => /^[*-] /.test(b)).map((b) => b.replace(/^[*-] /, '- '));
      paragraphs.push(...blocks.filter((b) => !/^[*-] /.test(b)));
      if (bullets.length) {
        paragraphs.push(bullets.join('\n'));
      }
    }
  }

  paragraphs.push(`[Full release notes](${page})`);
  return absolutize(paragraphs.join('\n\n'), page);
}

/**
 * Adds the entry for a VS Code bump. Unreleased entries above the newest
 * released one are folded in under "Add-on changes", since they ship with
 * this release. Returns the new changelog, or null if `version` already has
 * an entry.
 *
 * @param {string} text current changelog
 * @param {string} version add-on version, `<vscode version>.0`
 * @param {{ vscode: string, released: Set<string> }} opts VS Code notes
 *   (from vscodeNotes) and the add-on versions that have a release tag
 */
function addRelease(text, version, { vscode, released }) {
  const { preamble, sections } = parse(text);
  if (sections.some((s) => s.version === version)) {
    return null;
  }

  // Without any released entry there is no way to tell what is pending, so
  // fold nothing rather than everything.
  const firstReleased = sections.findIndex((s) => released.has(s.version));
  const pending = firstReleased === -1 ? [] : sections.slice(0, firstReleased);

  const vscodeVersion = version.split('.').slice(0, 3).join('.');
  const parts = [`## ${version}`, `### VS Code ${vscodeVersion}`, vscode];
  const addonChanges = pending.map((s) => body(s.raw)).filter(Boolean);
  if (addonChanges.length) {
    parts.push('### Add-on changes', addonChanges.join('\n'));
  }

  return format(preamble, [{ version, raw: parts.join('\n\n') }, ...sections.slice(pending.length)]);
}

module.exports = { addRelease, section, vscodeNotes };

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const { execFileSync } = require('child_process');

  const file = path.join(__dirname, '../../vscode/CHANGELOG.md');
  const [command, version] = process.argv.slice(2);
  const text = fs.readFileSync(file, 'utf8');

  (async () => {
    if (command === 'notes' && version) {
      const entry = section(text, version);
      if (entry === null) {
        throw new Error(`No changelog entry for ${version}`);
      }
      process.stdout.write(`${entry}\n`);
    } else if (command === 'add' && /^\d+\.\d+\.\d+\.0$/.test(version || '')) {
      const released = new Set(
        execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' })
          .split('\n').filter(Boolean).map((t) => t.slice(1)),
      );
      const vscode = await vscodeNotes(version.replace(/\.0$/, ''));
      const updated = addRelease(text, version, { vscode, released });
      if (updated === null) {
        throw new Error(`${version} already has a changelog entry`);
      }
      fs.writeFileSync(file, updated);
    } else {
      throw new Error('Usage: changelog.js notes <version> | add <vscode version>.0');
    }
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
