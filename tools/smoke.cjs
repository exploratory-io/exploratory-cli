#!/usr/bin/env node
"use strict";
// Runs the packaged bundle with an empty home and checks it against package.json and skills/.
// Usage: node tools/smoke.cjs [--root <dir>]
const fs = require("node:fs");
const path = require("node:path");
const { runExpl, SKILLS } = require("./expl-runner.cjs");

// Returns a list of failure messages for the package under root, or null when the bundle is not there yet.
function smoke(root) {
  const version = JSON.parse(fs.readFileSync(path.join(root, "package", "package.json"), "utf8")).version;
  const hasBundle = fs.existsSync(path.join(root, "package", "cli", "expl.bundle.js"));
  if (!hasBundle) {
    if (version === "0.0.0") return null;
    return ["Version is " + version + " but package/cli/expl.bundle.js does not exist."];
  }
  const fails = [];
  const v = runExpl(root, ["--version"]);
  const first = v.stdout.split(/\r?\n/)[0];
  if (v.status !== 0) fails.push("`expl --version` exited " + v.status + ", expected 0.");
  if (first !== "expl " + version) fails.push("`expl --version` first line is \"" + first + "\", expected \"expl " + version + "\".");
  const p = runExpl(root, ["project", "list"]);
  if (p.status !== 3) fails.push("`expl project list` with an empty home exited " + p.status + ", expected 3.");
  const s = runExpl(root, ["server", "status"]);
  if (s.status !== 4) fails.push("`expl server status` without a login exited " + s.status + ", expected 4.");
  if (!(s.stdout + s.stderr).includes("expl server login")) fails.push("`expl server status` output does not mention `expl server login`.");
  for (const k of SKILLS) {
    const file = path.join(root, "skills", k.dir, "SKILL.md");
    if (!fs.existsSync(file)) { fails.push("Missing " + path.relative(root, file) + "."); continue; }
    const r = runExpl(root, k.args);
    if (r.status !== 0) fails.push("`expl " + k.args.join(" ") + "` exited " + r.status + ".");
    else if (r.stdout !== fs.readFileSync(file, "utf8")) fails.push("skills/" + k.dir + "/SKILL.md differs from the output of `expl " + k.args.join(" ") + "`.");
  }
  return fails;
}

function main(argv) {
  const i = argv.indexOf("--root");
  const root = path.resolve(i >= 0 ? argv[i + 1] : path.join(__dirname, ".."));
  const fails = smoke(root);
  if (fails === null) { console.log("No bundle yet (version 0.0.0); nothing to check."); return 0; }
  if (fails.length) { console.error(fails.join("\n")); return 1; }
  console.log("Smoke checks passed.");
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { smoke };
