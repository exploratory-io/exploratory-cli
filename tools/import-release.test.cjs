"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fakeRelease, tmpRoot } = require("./fake-release.cjs");

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
