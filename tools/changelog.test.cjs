"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { sections, addSection, checkChangelog } = require("./changelog.cjs");
const { tmpRoot } = require("./fake-release.cjs");

const D = "2026-11-20";
const read = (f) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

test("the top section of this repository's CHANGELOG.md matches package/package.json", () => {
  assert.strictEqual(checkChangelog(path.join(__dirname, "..")), null);
});

test("before the first import, no section and version 0.0.0 pass", () => {
  assert.strictEqual(checkChangelog(tmpRoot()), null);
});

test("the first section replaces the placeholder line and names the Desktop version on its first line", () => {
  const text = addSection("# Changelog\n\nIntro.\n\nNo release has been imported yet.\n", "1.0.0", "16.6.1", D);
  assert.strictEqual(text, "# Changelog\n\nIntro.\n\n## 1.0.0 - 2026-11-20\n\nBuilt from the `expl` in Exploratory Desktop 16.6.1.\n");
});

test("a new section goes above the older ones, whose text after the Desktop version is kept", () => {
  const old = "# Changelog\n\nIntro.\n\n## 1.0.0 - 2026-11-18\n\nBuilt from the `expl` in Exploratory Desktop 17.0.1 (source commit a6025d748f).\n\nNotes of 1.0.0.\n";
  const two = addSection(old, "1.0.1", "17.0.2", D);
  assert.deepStrictEqual(sections(two), [{ version: "1.0.1", desktopVersion: "17.0.2" }, { version: "1.0.0", desktopVersion: "17.0.1" }]);
  assert.ok(two.endsWith(old.slice(old.indexOf("## 1.0.0"))));
});

test("a section that is already there with the same Desktop version is kept as it is", () => {
  const one = addSection("# Changelog\n\nIntro.\n", "1.0.0", "16.6.1", D) + "\nNotes.\n";
  assert.strictEqual(addSection(one, "1.0.0", "16.6.1", D), one);
});

test("a section that is already there with another Desktop version is refused", () => {
  const one = addSection("# Changelog\n\nIntro.\n", "1.0.0", "16.6.1", D);
  assert.throws(() => addSection(one, "1.0.0", "16.7.0", D), /already has 1\.0\.0 built from Exploratory Desktop 16\.6\.1, but this build is 16\.7\.0/);
});

test("broken: changing the version in package/package.json alone fails", () => {
  const root = tmpRoot();
  const cl = path.join(root, "CHANGELOG.md");
  fs.writeFileSync(cl, addSection(read(cl), "1.0.0", "16.6.1", D));
  const pf = path.join(root, "package", "package.json");
  const pkg = JSON.parse(read(pf));
  pkg.version = "1.0.0";
  fs.writeFileSync(pf, JSON.stringify(pkg));
  assert.strictEqual(checkChangelog(root), null);
  pkg.version = "1.0.1";
  fs.writeFileSync(pf, JSON.stringify(pkg));
  assert.match(checkChangelog(root), /top section of CHANGELOG\.md is 1\.0\.0, but package\/package\.json is 1\.0\.1/);
});

test("broken: changing the version of the top CHANGELOG section alone fails", () => {
  const root = tmpRoot();
  const pf = path.join(root, "package", "package.json");
  const pkg = JSON.parse(read(pf));
  pkg.version = "1.0.0";
  fs.writeFileSync(pf, JSON.stringify(pkg));
  const cl = path.join(root, "CHANGELOG.md");
  assert.match(checkChangelog(root), /has no section, but package\/package\.json is 1\.0\.0/);
  fs.writeFileSync(cl, addSection(read(cl), "1.0.1", "16.6.1", D));
  assert.match(checkChangelog(root), /top section of CHANGELOG\.md is 1\.0\.1, but package\/package\.json is 1\.0\.0/);
});

test("a CHANGELOG.md with Windows line endings is read the same way", () => {
  const text = addSection("# Changelog\n\nIntro.\n", "1.0.0", "16.6.1", D).replace(/\n/g, "\r\n");
  assert.deepStrictEqual(sections(text), [{ version: "1.0.0", desktopVersion: "16.6.1" }]);
});
