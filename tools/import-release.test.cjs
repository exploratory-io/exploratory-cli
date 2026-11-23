"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fakeRelease, tmpRoot, FAKE_WORD } = require("./fake-release.cjs");
const { sections } = require("./changelog.cjs");
const { importFromTam } = require("./import-release.cjs");

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

// The source map link of a release build, split so that this file does not hold the marker the content check looks for.
const MAP = "//# source" + "MappingURL=";

test("a release build named with its platform (17.0.5_MAC_ARM) is imported as Desktop 17.0.5", () => {
  const root = tmpRoot();
  const r = imp(root, fakeRelease("17.0.5_MAC_ARM"), "1.0.0");
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Imported version 1\.0\.0 \(built from Exploratory Desktop 17\.0\.5\)/);
  assert.deepStrictEqual(changelogOf(root), [{ version: "1.0.0", desktopVersion: "17.0.5" }]);
  assert.strictEqual(smoke(root).status, 0, smoke(root).stderr);
});

test("import refuses a build version that is neither x.y.z nor x.y.z_<platform>", () => {
  for (const v of ["17.0", "17.0.5-rc.1", "17.0.5_", "v17.0.5", "17.0.5_mac"]) {
    const root = tmpRoot();
    const r = imp(root, fakeRelease(v), "1.0.0");
    assert.notStrictEqual(r.status, 0, v);
    assert.match(r.stderr, /not x\.y\.z or x\.y\.z_<platform>/, v);
    assert.ok(!fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")), v);
  }
});

test("import drops the source map link a release build ends with and keeps the rest byte for byte", () => {
  // A release build ends with the link and no newline; one trailing newline is dropped with it too.
  for (const ending of ["", "\n"]) {
    const root = tmpRoot();
    const from = fakeRelease("17.0.5_MAC_ARM", MAP + "expl.bundle.js.map");
    const file = path.join(from, "cli", "expl.bundle.js");
    const src = fs.readFileSync(file, "utf8").replace(/\n$/, "") + ending;
    fs.writeFileSync(file, src);
    const r = imp(root, from, "1.0.0");
    assert.strictEqual(r.status, 0, r.stderr);
    const got = fs.readFileSync(path.join(root, "package", "cli", "expl.bundle.js"), "utf8");
    assert.strictEqual(got, src.slice(0, src.indexOf("\n" + MAP)), JSON.stringify(ending));
    assert.strictEqual(smoke(root).status, 0, smoke(root).stderr);
  }
});

test("import still refuses a source map link that is not the last line, is inline, names another file or has blank lines after it", () => {
  const links = [
    MAP + "expl.bundle.js.map\nconsole.log(1);", // not the last line
    MAP + "data:application/json;base64,e30=", // inline
    MAP + "other.bundle.js.map", // another file
    MAP + "expl.bundle.js.map\n\n", // followed by blank lines
  ];
  for (const extra of links) {
    const root = tmpRoot();
    const r = imp(root, fakeRelease("17.0.5_MAC_ARM", extra), "1.0.0");
    assert.notStrictEqual(r.status, 0, extra);
    assert.match(r.stderr, /development build/, extra);
    assert.ok(!fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")), extra);
  }
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

// A fake tam checkout: a git repository whose commits hold public/package.json with the given Desktop versions, the
// last one checked out, with untracked node_modules/ and src/node_modules/. Returns { tam, commits }.
const git = (cwd, ...args) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@users.noreply.github.com", "-c", "core.autocrlf=false", ...args], { cwd, encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim();
};
function fakeTam(...desktopVersions) {
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "fake-tam-"));
  git(tam, "init", "--quiet");
  fs.mkdirSync(path.join(tam, "public"));
  fs.mkdirSync(path.join(tam, "src"));
  fs.writeFileSync(path.join(tam, "src", "app.js"), "\n");
  fs.writeFileSync(path.join(tam, ".gitignore"), "node_modules/\n");
  const commits = desktopVersions.map((v) => {
    fs.writeFileSync(path.join(tam, "public", "package.json"), JSON.stringify({ name: "x", version: v }) + "\n");
    git(tam, "add", "-A");
    git(tam, "commit", "--quiet", "-m", v);
    return git(tam, "rev-parse", "HEAD");
  });
  fs.mkdirSync(path.join(tam, "node_modules"));
  fs.mkdirSync(path.join(tam, "src", "node_modules"));
  return { tam, commits };
}

// A build step for the tests: writes the fake bundle where webpack would, and records the clone it ran in.
function fakeBuild(seen) {
  return (dir) => {
    seen.dir = dir;
    seen.desktopVersion = JSON.parse(fs.readFileSync(path.join(dir, "public", "package.json"), "utf8")).version;
    seen.nodeModules = fs.realpathSync(path.join(dir, "node_modules"));
    fs.mkdirSync(path.join(dir, "public", "cli"), { recursive: true });
    fs.copyFileSync(path.join(fakeRelease("0.0.0"), "cli", "expl.bundle.js"), path.join(dir, "public", "cli", "expl.bundle.js"));
  };
}

test("--tam builds the commit of origin/master by default and names it in the CHANGELOG, leaving the checkout as it was", () => {
  const { tam, commits } = fakeTam("17.0.1", "17.0.2");
  git(tam, "update-ref", "refs/remotes/origin/master", commits[0]);
  const root = tmpRoot();
  const seen = {};
  const r = importFromTam(tam, "origin/master", root, "1.0.1", fakeBuild(seen));
  assert.deepStrictEqual(r, { version: "1.0.1", desktopVersion: "17.0.1", commit: commits[0].slice(0, 10) });
  assert.strictEqual(seen.desktopVersion, "17.0.1");
  assert.strictEqual(seen.nodeModules, fs.realpathSync(path.join(tam, "node_modules")));
  assert.ok(fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").includes("Built from the `expl` in tam master " + commits[0].slice(0, 10) + " (Exploratory Desktop 17.0.1).\n"));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, "package", "package.json"), "utf8")).version, "1.0.1");
  assert.strictEqual(smoke(root).status, 0, smoke(root).stderr);
  assert.ok(!fs.existsSync(seen.dir), "the temporary clone is removed");
  assert.strictEqual(git(tam, "rev-parse", "HEAD"), commits[1]);
  assert.strictEqual(git(tam, "status", "--porcelain"), "");
});

test("--ref picks another tam commit", () => {
  const { tam, commits } = fakeTam("17.0.1", "17.0.2");
  const root = tmpRoot();
  const r = importFromTam(tam, "HEAD", root, "1.0.1", fakeBuild({}));
  assert.strictEqual(r.desktopVersion, "17.0.2");
  assert.strictEqual(r.commit, commits[1].slice(0, 10));
});

test("broken: a failing build stops the import, writes nothing and still removes the temporary clone", () => {
  const { tam } = fakeTam("17.0.2");
  const root = tmpRoot();
  let dir;
  assert.throws(() => importFromTam(tam, "HEAD", root, "1.0.1", (d) => { dir = d; throw new Error("webpack failed"); }), /webpack failed/);
  assert.ok(dir && !fs.existsSync(dir), "the temporary clone is removed");
  assert.ok(!fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js")));
});

test("an unknown --ref fails before cloning", () => {
  const { tam } = fakeTam("17.0.2");
  let built = false;
  assert.throws(() => importFromTam(tam, "no-such-ref", tmpRoot(), "1.0.1", () => { built = true; }), /rev-parse/);
  assert.strictEqual(built, false);
});

test("the command needs exactly one of --from and --tam", () => {
  const root = tmpRoot();
  const neither = spawnSync(process.execPath, [IMPORT, "--version", "1.0.1", "--root", root], { encoding: "utf8" });
  assert.strictEqual(neither.status, 2);
  const both = spawnSync(process.execPath, [IMPORT, "--from", fakeRelease("17.0.2"), "--tam", ".", "--version", "1.0.1", "--root", root], { encoding: "utf8" });
  assert.strictEqual(both.status, 2);
});
