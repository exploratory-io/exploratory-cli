"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "check-public-content.cjs");
const j = (...p) => p.join("");

// Samples are assembled from pieces so that this file itself does not match any rule.
const SAMPLES = {
  "home path (unix)": j("/Us", "ers/", "someone", "/work"),
  "home path (windows)": j("C:\\Us", "ers\\", "someone", "\\work"),
  "home path (linux)": j("/ho", "me/", "someone", "/work"),
  "issue number": j("see #", "12", "345"),
  "plan path": j("docs/", "plans/x.md"),
  "owner todo": j("TODO(", "owner)", ": x"),
  "status word (ja)": j("未", "検証"),
  "status word (en)": j("Un", "released"),
  "dev build (eval)": j("The \"e", "val\" devtool has been used"),
  "dev build (sourcemap)": j("//# source", "MappingURL=x.map"),
  "email": j("someone", "@", "example.com"),
  "subdomain": j("https://internal.", "exploratory.io/x"),
  "unscoped npx": j("np", "x ", "expl", " status"),
  "unscoped npm install": j("npm ins", "tall -g ", "expl"),
  "unscoped npx with a version": j("np", "x ", "expl", "@1.2.3 status"),
  "unscoped npx with an option": j("np", "x -y ", "expl", " status"),
  "unscoped npm install with a version": j("npm ins", "tall -g ", "expl", "@1.2.3"),
};
const CLEAN = [
  "Run npx @scope/expl@1.0.0 status",
  "npm install -g @scope/expl",
  "Write to support@exploratory.io or https://exploratory.io/docs",
  "Contact 1234567+someone@users.noreply.github.com",
  "Issue #123 and /home/<name>/ placeholder",
];

// Creates a git repo with the given files and the given author email; returns its path.
function tmpRepo(files, email = "1+x@users.noreply.github.com") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chk-pc-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=x", "-c", "user.email=" + email, "-c", "commit.gpgsign=false", ...a], { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  const all = { "a.md": "a\n", "b.md": "b\n", "c.md": "c\n", ...files };
  for (const [n, t] of Object.entries(all)) fs.writeFileSync(path.join(dir, n), t);
  git("add", ".");
  git("commit", "-q", "-m", "init");
  return { dir, git };
}
function run(dir, args = [], env = {}) {
  const e = { ...process.env, ...env };
  delete e.CI;
  return spawnSync(process.execPath, [SCRIPT, "--root", dir, ...args], { encoding: "utf8", env: { ...e, ...env } });
}
// Writes the untracked word list into a test repo, ignored the same way as in this repo.
function setWords(dir, text) {
  fs.writeFileSync(path.join(dir, ".internal-words"), text);
  fs.mkdirSync(path.join(dir, ".git", "info"), { recursive: true });
  fs.appendFileSync(path.join(dir, ".git", "info", "exclude"), ".internal-words\n");
}

test("a clean repository passes", () => {
  const { dir } = tmpRepo({ "d.md": CLEAN.join("\n") });
  assert.strictEqual(run(dir).status, 0);
});

for (const [name, text] of Object.entries(SAMPLES)) {
  test("fails on: " + name, () => {
    const { dir } = tmpRepo({ "d.md": text + "\n" });
    const r = run(dir);
    assert.notStrictEqual(r.status, 0, text);
    assert.match(r.stderr, /d\.md:1:/);
  });
}

test("an internal word fails as a word and passes inside another word, and is never printed", () => {
  const w = j("zork", "mid");
  const hit = tmpRepo({ "d.md": "this is " + w + " here\n" });
  setWords(hit.dir, w + "\n");
  const r = run(hit.dir);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /internal word #1/);
  assert.ok(!r.stderr.includes(w) && !r.stdout.includes(w));
  const part = tmpRepo({ "d.md": "pre" + w + "post and " + w + "s\n" });
  setWords(part.dir, w + "\n");
  assert.strictEqual(run(part.dir).status, 0);
});

test("without a word list it passes in CI with a notice, and the patterns still apply", () => {
  const { dir } = tmpRepo({});
  const r = run(dir, [], { CI: "true" });
  assert.strictEqual(r.status, 0);
  assert.match(r.stderr, /only the pattern rules/);
  const bad = tmpRepo({ "d.md": SAMPLES.email + "\n" });
  assert.notStrictEqual(run(bad.dir, [], { CI: "true" }).status, 0);
});

test("fewer than three files fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chk-pc-"));
  fs.writeFileSync(path.join(dir, "a.md"), "a\n");
  assert.notStrictEqual(run(dir).status, 0);
});

test("--history finds words in a deleted file", () => {
  const w = j("zork", "mid");
  const { dir, git } = tmpRepo({ "gone.md": "secret " + w + "\n" });
  git("rm", "-q", "gone.md");
  git("commit", "-q", "-m", "remove");
  setWords(dir, w);
  assert.strictEqual(run(dir).status, 0, "current files are clean");
  const r = run(dir, ["--history"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /internal word #1/);
});

test("--history finds a word that enters only through a merge", () => {
  const w = j("zork", "mid");
  const { dir, git } = tmpRepo({});
  git("checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "s.md"), "side\n");
  git("add", "s.md");
  git("commit", "-q", "-m", "side");
  git("checkout", "-q", "-");
  fs.writeFileSync(path.join(dir, "m.md"), "main\n");
  git("add", "m.md");
  git("commit", "-q", "-m", "main");
  try { git("merge", "--no-commit", "--no-ff", "side"); } catch (e) { /* a merge stopped before commit exits 0; ignore */ }
  fs.writeFileSync(path.join(dir, "evil.md"), "added in the merge " + w + "\n");
  git("add", "evil.md");
  git("commit", "-q", "-m", "merge");
  setWords(dir, w);
  const r = run(dir, ["--history"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /internal word #1/);
});

test("--history finds a non-noreply author email", () => {
  const { dir } = tmpRepo({}, j("someone", "@", "example.com"));
  const r = run(dir, ["--history"]);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /not a noreply address/);
});

test("--history passes on a clean history", () => {
  const { dir } = tmpRepo({});
  assert.strictEqual(run(dir, ["--history"]).status, 0);
});
