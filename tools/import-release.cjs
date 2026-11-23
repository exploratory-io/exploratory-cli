#!/usr/bin/env node
"use strict";
// Imports a release build into package/ and rebuilds skills/.
// Usage: node tools/import-release.cjs --tam <tam checkout> [--ref <commit>] --version <x.y.z> [--root <dir>]
//        node tools/import-release.cjs --from <folder> --version <x.y.z> [--root <dir>]
// --tam builds the expl bundle of a tam commit (default origin/master) in a temporary clone and imports it like --from;
// the tam checkout itself is not changed.
// <folder> must contain cli/expl.bundle.js and package.json, as Exploratory.app/Contents/Resources/app.nw of a release
// build does. --version is the npm version of this package, which is independent of Desktop; the version in the folder's
// package.json (x.y.z, or x.y.z_<platform> as in 17.0.5_MAC_ARM) is the Desktop build it came from, and its x.y.z is
// written as the first line of the version's section in CHANGELOG.md. After the import, check-public-content runs with the
// internal word list .internal-words of the root, which must exist and hold at least one word.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { runExpl, SKILLS } = require("./expl-runner.cjs");
const { scanFiles, parseWords, wordRegexes } = require("./check-public-content.cjs");
const { addSection } = require("./changelog.cjs");

// Marks a development build (devtool "eval" output or a source map reference), checked after MAP_LINK is dropped.
const DEV_BUILD_MARKER = /The "eva[l]" devtool|source[M]appingURL/;
// The last line of a release build's bundle, which links expl.bundle.js.map kept next to it in the app (at most one newline
// after it). The npm package does not ship the .map, so the import drops exactly this line; a link to another file, a
// link followed by more lines or blank lines, and any other source map reference still mark a development build.
const MAP_LINK = /\n\/\/# source[M]appingURL=expl\.bundle\.js\.map\n?$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
// A release build names its version with the platform, as 17.0.5_MAC_ARM; the x.y.z before it is the Desktop version.
const DESKTOP_VERSION = /^(\d+\.\d+\.\d+)(?:_[A-Z0-9_]+)?$/;

// Throws when the bundle looks like a development build.
function assertProductionBundle(text) {
  if (DEV_BUILD_MARKER.test(text)) throw new Error("The bundle looks like a development build; import a production build.");
}

// Throws unless the files under root pass check-public-content with a non-empty .internal-words. Never prints the words.
function checkInternalWords(root) {
  const f = path.join(root, ".internal-words");
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch (e) { throw new Error("Cannot read " + f + " (" + e.code + "); the internal word list is required for an import."); }
  const words = parseWords(text);
  if (words.length === 0) throw new Error(f + " is empty; the internal word list is required for an import.");
  const { findings } = scanFiles(root, wordRegexes(words));
  if (findings.length) throw new Error(findings.join("\n") + "\n" + findings.length + " finding(s) by check-public-content.");
}

// Imports the build as npm version `version` and rewrites skills/. `commit` (10 digits) names the tam master commit
// the build came from, for the CHANGELOG line. Returns { version, desktopVersion }.
function importRelease(from, root, version, commit) {
  if (!SEMVER.test(String(version))) throw new Error("--version must be x.y.z: " + version);
  const bundleSrc = path.join(from, "cli", "expl.bundle.js");
  const pkgSrc = path.join(from, "package.json");
  if (!fs.existsSync(bundleSrc)) throw new Error("Not found: " + bundleSrc);
  if (!fs.existsSync(pkgSrc)) throw new Error("Not found: " + pkgSrc);
  const buildVersion = JSON.parse(fs.readFileSync(pkgSrc, "utf8")).version;
  const m = DESKTOP_VERSION.exec(String(buildVersion));
  if (!m) throw new Error("The version in the build's package.json is not x.y.z or x.y.z_<platform>: " + buildVersion);
  const desktopVersion = m[1];
  const text = fs.readFileSync(bundleSrc, "utf8").replace(MAP_LINK, "");
  assertProductionBundle(text);
  // Built before anything is written, so that a section naming another Desktop version stops the import untouched.
  const changelog = path.join(root, "CHANGELOG.md");
  const today = new Date().toISOString().slice(0, 10);
  const newChangelog = addSection(fs.readFileSync(changelog, "utf8"), version, desktopVersion, today, commit);

  try {
    writeImport(root, text, version, changelog, newChangelog);
  } catch (e) {
    e.message += "\nThe import stopped part way. To undo it: git checkout HEAD -- package/cli/expl.bundle.js package/package.json skills CHANGELOG.md";
    throw e;
  }
  return { version, desktopVersion };
}

// Runs a command and returns its stdout; throws with its stderr when it fails.
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("`" + cmd + " " + args.join(" ") + "` failed (exit " + r.status + ")\n" + (r.stderr || (r.error && r.error.message) || ""));
  return r.stdout;
}

// Builds public/cli/expl.bundle.js in the tam clone `dir` with the expl-cli entry of the production webpack config.
// The source map is turned off, so the bundle has no source map link, as an imported release build has none once MAP_LINK is dropped.
function webpackBuild(dir) {
  run(process.execPath, [path.join(dir, "node_modules", "webpack", "bin", "webpack.js"), "--config", "webpack.production.config.js", "--config-name", "expl-cli", "--no-devtool"], dir);
}

// Builds the expl of `ref` in the tam checkout `tam` and imports it as npm version `version`. `build(dir)` must write
// public/cli/expl.bundle.js in the clone; it is webpackBuild except in the tests. Returns { version, desktopVersion, commit }.
function importFromTam(tam, ref, root, version, build = webpackBuild) {
  if (!SEMVER.test(String(version))) throw new Error("--version must be x.y.z: " + version);
  const commit = run("git", ["rev-parse", "--verify", ref + "^{commit}"], tam).trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tam-clone-"));
  try {
    run("git", ["clone", "--quiet", "--shared", "--no-checkout", tam, dir]);
    run("git", ["checkout", "--quiet", "--detach", commit], dir);
    for (const nm of ["node_modules", path.join("src", "node_modules")]) {
      fs.symlinkSync(path.join(tam, nm), path.join(dir, nm), "junction");
    }
    build(dir);
    // public/ of the commit holds package.json (the Desktop version) and the new cli/expl.bundle.js.
    const r = importRelease(path.join(dir, "public"), root, version, commit.slice(0, 10));
    return { ...r, commit: commit.slice(0, 10) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Writes the bundle, package.json, skills/ and CHANGELOG.md, then checks them with the internal word list.
function writeImport(root, text, version, changelog, newChangelog) {
  fs.mkdirSync(path.join(root, "package", "cli"), { recursive: true });
  fs.writeFileSync(path.join(root, "package", "cli", "expl.bundle.js"), text);
  const pkgFile = path.join(root, "package", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  pkg.version = version;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");

  for (const s of SKILLS) {
    const r = runExpl(root, s.args);
    if (r.status !== 0 || !r.stdout.trim()) throw new Error("`expl " + s.args.join(" ") + "` failed (exit " + r.status + ") while building skills/");
    const dir = path.join(root, "skills", s.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), r.stdout);
  }
  fs.writeFileSync(changelog, newChangelog);
  checkInternalWords(root);
}

function main(argv) {
  const get = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const from = get("--from");
  const tam = get("--tam");
  const version = get("--version");
  if (!version || !from === !tam) {
    console.error("Usage: node tools/import-release.cjs --tam <tam checkout> [--ref <commit>] --version <x.y.z> [--root <dir>]\n" +
      "       node tools/import-release.cjs --from <folder> --version <x.y.z> [--root <dir>]");
    return 2;
  }
  const root = path.resolve(get("--root") || path.join(__dirname, ".."));
  try {
    if (tam) {
      const r = importFromTam(path.resolve(tam), get("--ref") || "origin/master", root, version);
      console.log("Imported version " + r.version + " (built from tam master " + r.commit + ", Exploratory Desktop " + r.desktopVersion + ")");
      return 0;
    }
    const r = importRelease(path.resolve(from), root, version);
    console.log("Imported version " + r.version + " (built from Exploratory Desktop " + r.desktopVersion + ")");
    return 0;
  } catch (e) {
    console.error(e.message);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { importRelease, importFromTam };
