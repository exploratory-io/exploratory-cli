"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fakeRelease, tmpRoot, FAKE_WORD } = require("./fake-release.cjs");
const { sections } = require("./changelog.cjs");

const IMPORT = path.join(__dirname, "import-release.cjs");
const SMOKE = path.join(__dirname, "smoke.cjs");
const imp = (root, from, version = "1.2.3") => spawnSync(process.execPath, [IMPORT, "--from", from, "--version", version, "--root", root], { encoding: "utf8" });
const smoke = (root) => spawnSync(process.execPath, [SMOKE, "--root", root], { encoding: "utf8" });

test("import copies the bundle, sets the version and builds both skills", () => {
  const root = tmpRoot();
  const r = imp(root, fakeRelease("1.2.3"));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, "package", "package.json"), "utf8")).version, "1.2.3");
  assert.match(fs.readFileSync(path.join(root, "skills", "exploratory-expl", "SKILL.md"), "utf8"), /desktop 1\.2\.3/);
  assert.match(fs.readFileSync(path.join(root, "skills", "exploratory-expl-server", "SKILL.md"), "utf8"), /server 1\.2\.3/);
  assert.strictEqual(smoke(root).status, 0, smoke(root).stderr);
});

test("the npm version comes from --version, not from the Desktop build, which is only reported", () => {
  const root = tmpRoot();
  const r = imp(root, fakeRelease("17.0.0"), "1.0.0");
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, "package", "package.json"), "utf8")).version, "1.0.0");
  assert.match(r.stdout, /Imported version 1\.0\.0 \(built from Exploratory Desktop 17\.0\.0\)/);
  assert.strictEqual(smoke(root).status, 0, smoke(root).stderr);
});

test("import refuses a missing or malformed --version", () => {
  const root = tmpRoot();
  const from = fakeRelease("17.0.0");
  const none = spawnSync(process.execPath, [IMPORT, "--from", from, "--root", root], { encoding: "utf8" });
  assert.strictEqual(none.status, 2);
  const bad = imp(root, from, "1.0");
  assert.notStrictEqual(bad.status, 0);
  assert.match(bad.stderr, /--version must be x\.y\.z/);
  assert.ok(!fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")));
});

const changelogOf = (root) => sections(fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8")).map((x) => ({ version: x.version, desktopVersion: x.desktopVersion }));

test("import writes a CHANGELOG section for the npm version whose first line names the Desktop version", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("16.6.1"), "1.0.0").status, 0);
  assert.strictEqual(imp(root, fakeRelease("16.6.2"), "1.0.1").status, 0);
  assert.deepStrictEqual(changelogOf(root), [{ version: "1.0.1", desktopVersion: "16.6.2" }, { version: "1.0.0", desktopVersion: "16.6.1" }]);
  assert.ok(!fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").includes("No release has been imported yet."));
});

test("importing the same version from the same Desktop build again keeps one section", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("16.6.1"), "1.0.0").status, 0);
  const r = imp(root, fakeRelease("16.6.1"), "1.0.0");
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(changelogOf(root), [{ version: "1.0.0", desktopVersion: "16.6.1" }]);
});

test("broken: a CHANGELOG section with another Desktop version stops the import before anything is written", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("16.6.1"), "1.0.0").status, 0);
  const cl = path.join(root, "CHANGELOG.md");
  fs.writeFileSync(cl, fs.readFileSync(cl, "utf8").replace("Desktop 16.6.1.", "Desktop 16.5.0."));
  const bundle = fs.readFileSync(path.join(root, "package", "cli", "expl.bundle.js"), "utf8");
  const r = imp(root, fakeRelease("16.6.1", "// new build"), "1.0.0");
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /already has 1\.0\.0 built from Exploratory Desktop 16\.5\.0, but this build is 16\.6\.1/);
  assert.doesNotMatch(r.stderr, /To undo it/);
  assert.strictEqual(fs.readFileSync(path.join(root, "package", "cli", "expl.bundle.js"), "utf8"), bundle);
});

test("broken: importing without .internal-words fails", () => {
  const root = tmpRoot();
  fs.rmSync(path.join(root, ".internal-words"));
  const r = imp(root, fakeRelease("1.2.3"));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /Cannot read .*\.internal-words \(ENOENT\); the internal word list is required/);
  assert.match(r.stderr, /To undo it: git checkout HEAD -- package\/cli\/expl\.bundle\.js package\/package\.json skills CHANGELOG\.md/);
});

test("importing with an empty .internal-words fails", () => {
  const root = tmpRoot();
  fs.writeFileSync(path.join(root, ".internal-words"), "\n  \r\n");
  const r = imp(root, fakeRelease("1.2.3"));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /\.internal-words is empty/);
});

test("an internal word in an imported file fails the import without printing the word", () => {
  const root = tmpRoot();
  const r = imp(root, fakeRelease("1.2.3", "", "SKILL BODY " + FAKE_WORD));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /skills\/exploratory-expl\/SKILL\.md:1: internal word #1/);
  assert.ok(!(r.stdout + r.stderr).includes(FAKE_WORD));
});

test("import refuses a development build", () => {
  const root = tmpRoot();
  const marker = "/* ATTENTION: The \"" + "eval\" devtool has been used */";
  const r = imp(root, fakeRelease("1.2.3", marker));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /development build/);
  assert.ok(!fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")));
});

test("smoke: no bundle and version 0.0.0 passes with a notice", () => {
  const r = smoke(tmpRoot());
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /No bundle yet/);
});

test("smoke: a version without a bundle fails", () => {
  const root = tmpRoot();
  const f = path.join(root, "package", "package.json");
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  p.version = "1.0.0";
  fs.writeFileSync(f, JSON.stringify(p));
  assert.notStrictEqual(smoke(root).status, 0);
});

test("smoke: changing one character of a skill fails", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("1.2.3")).status, 0);
  const f = path.join(root, "skills", "exploratory-expl", "SKILL.md");
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("BODY", "BODX"));
  const r = smoke(root);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /differs/);
});

test("smoke: a --version exit code other than 0 fails", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("1.2.3", "", "SKILL BODY", { versionExit: 9 })).status, 0);
  const r = smoke(root);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /--version`? exited 9/);
});

test("smoke: a wrong version line fails with the version comparison message", () => {
  const root = tmpRoot();
  assert.strictEqual(imp(root, fakeRelease("1.2.3", "", "SKILL BODY", { fixedVersion: "1.2.3" })).status, 0);
  const f = path.join(root, "package", "package.json");
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  p.version = "9.9.9";
  fs.writeFileSync(f, JSON.stringify(p));
  const r = smoke(root);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /first line is "expl 1\.2\.3", expected "expl 9\.9\.9"/);
});
