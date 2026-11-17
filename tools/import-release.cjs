#!/usr/bin/env node
"use strict";
// Imports a release build into package/ and rebuilds skills/.
// Usage: node tools/import-release.cjs --from <folder> --version <x.y.z> [--root <dir>]
// <folder> must contain cli/expl.bundle.js and package.json. --version is the npm version of this package, which is
// independent of Desktop; the version in the folder's package.json is the Desktop build it came from, and is only reported.
const fs = require("node:fs");
const path = require("node:path");
const { runExpl, SKILLS } = require("./expl-runner.cjs");

// Marks a development build (devtool "eval" output or a source map reference).
const DEV_BUILD_MARKER = /The "eva[l]" devtool|source[M]appingURL/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// Throws when the bundle looks like a development build.
function assertProductionBundle(text) {
  if (DEV_BUILD_MARKER.test(text)) throw new Error("The bundle looks like a development build; import a production build.");
}

// Imports the build as npm version `version` and rewrites skills/. Returns { version, desktopVersion }.
function importRelease(from, root, version) {
  if (!SEMVER.test(String(version))) throw new Error("--version must be x.y.z: " + version);
  const bundleSrc = path.join(from, "cli", "expl.bundle.js");
  const pkgSrc = path.join(from, "package.json");
  if (!fs.existsSync(bundleSrc)) throw new Error("Not found: " + bundleSrc);
  if (!fs.existsSync(pkgSrc)) throw new Error("Not found: " + pkgSrc);
  const desktopVersion = JSON.parse(fs.readFileSync(pkgSrc, "utf8")).version;
  if (!SEMVER.test(String(desktopVersion))) throw new Error("The version in the build's package.json is not x.y.z: " + desktopVersion);
  const text = fs.readFileSync(bundleSrc, "utf8");
  assertProductionBundle(text);

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
  return { version, desktopVersion };
}

function main(argv) {
  const get = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const from = get("--from");
  const version = get("--version");
  if (!from || !version) { console.error("Usage: node tools/import-release.cjs --from <folder> --version <x.y.z> [--root <dir>]"); return 2; }
  const root = path.resolve(get("--root") || path.join(__dirname, ".."));
  try {
    const r = importRelease(path.resolve(from), root, version);
    console.log("Imported version " + r.version + " (built from Exploratory Desktop " + r.desktopVersion + ")");
    return 0;
  } catch (e) {
    console.error(e.message);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { importRelease };
