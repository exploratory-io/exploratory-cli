"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "check-links.cjs");
const BASE = "https://github.com/exploratory-io/exploratory-cli/blob/main/";

// Creates a temp tree and runs the check on it.
function run(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chk-ln-"));
  for (const [n, t] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, n)), { recursive: true });
    fs.writeFileSync(path.join(dir, n), t);
  }
  return spawnSync(process.execPath, [SCRIPT, "--root", dir], { encoding: "utf8" });
}

test("valid relative, absolute and anchor links pass", () => {
  const r = run({
    "a.md": "# Top\n[b](docs/b.md) [anchor](docs/b.md#second-part) [self](#top) [abs](" + BASE + "docs/b.md) [web](https://example.com/x)\n",
    "docs/b.md": "# B\n## Second part\n",
  });
  assert.strictEqual(r.status, 0, r.stderr);
});

test("a link to a missing file fails", () => {
  const r = run({ "a.md": "[x](nope.md)\n" });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /missing target/);
});

test("an absolute link to a missing file fails", () => {
  assert.notStrictEqual(run({ "a.md": "[x](" + BASE + "nope.md)\n" }).status, 0);
});

test("a missing heading anchor fails", () => {
  const r = run({ "a.md": "[x](b.md#nothing)\n", "b.md": "# B\n" });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /anchor/);
});

test("links inside code fences and placeholder targets are skipped", () => {
  assert.strictEqual(run({ "a.md": "```\n[x](nope.md)\n```\n[y](__SOME_URL__)\n" }).status, 0);
});
