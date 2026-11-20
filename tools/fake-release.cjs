"use strict";
// Test helper: builds a fake release folder whose bundle answers like the real one for the smoke checks.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Returns the path of a folder with cli/expl.bundle.js and package.json. `extra` is appended to the bundle.
// opts.fixedVersion: the bundle prints this version whatever package.json says. opts.versionExit: exit code of --version.
function fakeRelease(version, extra = "", skillBody = "SKILL BODY", opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-release-"));
  fs.mkdirSync(path.join(dir, "cli"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", version }) + "\n");
  const bundle = [
    "const a = process.argv.slice(2);",
    "const v = " + (opts.fixedVersion ? JSON.stringify(opts.fixedVersion) : "require('../package.json').version") + ";",
    "const j = a.join(' ');",
    "if (j === '--version') { console.log('expl ' + v); process.exit(" + (opts.versionExit || 0) + "); }",
    "if (j === 'skill') { console.log(" + JSON.stringify(skillBody) + " + ' desktop ' + v); process.exit(0); }",
    "if (j === 'server skill') { console.log(" + JSON.stringify(skillBody) + " + ' server ' + v); process.exit(0); }",
    "if (j === 'project list') { console.error('Start Exploratory Desktop'); process.exit(3); }",
    "if (j === 'server status') { console.error('Not logged in. Run expl server login'); process.exit(4); }",
    "process.exit(2);",
    extra,
  ].join("\n");
  fs.writeFileSync(path.join(dir, "cli", "expl.bundle.js"), bundle + "\n");
  return dir;
}

// A made-up internal word for the tests; the real list is never used here.
const FAKE_WORD = "zqxfakeword";

// Copies the package skeleton (bin and package.json) of this repository into a new temp root, with a CHANGELOG.md
// that has no section yet and an .internal-words holding FAKE_WORD.
function tmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cli-root-"));
  const src = path.join(__dirname, "..", "package");
  fs.mkdirSync(path.join(root, "package", "bin"), { recursive: true });
  fs.copyFileSync(path.join(src, "bin", "expl.js"), path.join(root, "package", "bin", "expl.js"));
  // The version is set explicitly so that the tests do not depend on the version of the real package.json.
  const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
  pkg.version = "0.0.0";
  fs.writeFileSync(path.join(root, "package", "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "CHANGELOG.md"), "# Changelog\n\nIntro.\n\nNo release has been imported yet.\n");
  fs.writeFileSync(path.join(root, ".internal-words"), FAKE_WORD + "\n");
  return root;
}

module.exports = { fakeRelease, tmpRoot, FAKE_WORD };
