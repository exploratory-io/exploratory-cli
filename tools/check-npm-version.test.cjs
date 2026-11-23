"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { compareVersions } = require("./check-npm-version.cjs");

const TOOL = path.join(__dirname, "check-npm-version.cjs");
// Runs the tool against a file holding `content` as the output of `npm view ... versions --json`.
function run(version, content) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "npm-versions-")), "versions.json");
  fs.writeFileSync(f, content);
  return spawnSync(process.execPath, [TOOL, version, f], { encoding: "utf8" });
}

test("versions are ordered by the semver rules, pre-releases included", () => {
  const order = ["0.0.0-stage", "1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-rc.1", "1.0.0-rc.2", "1.0.0-rc.10", "1.0.0", "1.0.1", "1.10.0", "2.0.0"];
  for (let i = 0; i + 1 < order.length; i++) {
    assert.ok(compareVersions(order[i], order[i + 1]) < 0, order[i] + " < " + order[i + 1]);
    assert.ok(compareVersions(order[i + 1], order[i]) > 0, order[i + 1] + " > " + order[i]);
  }
  assert.strictEqual(compareVersions("1.0.0-rc.1", "1.0.0-rc.1"), 0);
});

test("build metadata is ignored", () => {
  assert.strictEqual(compareVersions("1.0.0+build.1", "1.0.0"), 0);
  assert.ok(compareVersions("1.0.1", "1.0.0+build.1") > 0);
  assert.ok(compareVersions("1.0.0-rc.1+b.2", "1.0.0-rc.2") < 0);
});

test("pre-release numbers beyond 2^53 are compared exactly", () => {
  assert.ok(compareVersions("1.0.0-rc.9007199254740993", "1.0.0-rc.9007199254740992") > 0);
  assert.ok(compareVersions("1.0.0-rc.9007199254740992", "1.0.0-rc.9007199254740993") < 0);
});

test("a version greater than every version on npm passes", () => {
  const r = run("1.0.0", JSON.stringify(["0.0.0-stage", "1.0.0-rc.1"]));
  assert.strictEqual(r.status, 0, r.stderr);
});

test("a version already on npm or lower fails", () => {
  for (const v of ["1.0.0-rc.1", "0.9.0", "1.0.0-beta"]) {
    const r = run(v, JSON.stringify(["0.0.0-stage", "1.0.0-rc.1"]));
    assert.strictEqual(r.status, 1, v);
    assert.match(r.stderr, /is not greater than the version\(s\) on npm/);
  }
});

test("a single version printed as a JSON string, and no version yet, are read", () => {
  assert.strictEqual(run("1.0.0", JSON.stringify("1.0.0")).status, 1);
  assert.strictEqual(run("1.0.0", "[]\n").status, 0);
});

test("broken: an empty output of npm view fails instead of passing as unpublished", () => {
  assert.notStrictEqual(run("1.0.0", "").status, 0);
});
