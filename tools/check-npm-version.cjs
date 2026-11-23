#!/usr/bin/env node
"use strict";
// Checks that a version is greater than every version already on npm.
// Usage: node tools/check-npm-version.cjs <version> <file>
// <file> holds the output of `npm view @exploratory/cli versions --json`: a JSON array, a single JSON string, or [] when
// the package is not on npm yet. Versions are compared by the semver rules, pre-releases included (1.0.0-rc.1 < 1.0.0);
// build metadata (+...) is ignored.
const fs = require("node:fs");

// Returns a negative number, 0 or a positive number as a is lower than, equal to or greater than b.
function compareVersions(a, b) {
  const [ma, pa] = split(a);
  const [mb, pb] = split(b);
  for (let i = 0; i < 3; i++) if (ma[i] !== mb[i]) return ma[i] - mb[i];
  if (!pa.length || !pb.length) return pb.length - pa.length;
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === y) continue;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    // Numeric identifiers have no leading zeros, so the longer one is greater; this also keeps numbers beyond 2^53 exact.
    if (nx && ny) return x.length !== y.length ? x.length - y.length : (x < y ? -1 : 1);
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return pa.length - pb.length;
}

// Splits "x.y.z-pre.N+build" into [[x, y, z], ["pre", "N"]], dropping the build metadata.
function split(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v));
  if (!m) throw new Error("Not a version: " + v);
  return [[Number(m[1]), Number(m[2]), Number(m[3])], m[4] ? m[4].split(".") : []];
}

function main(argv) {
  const [version, file] = argv;
  if (!version || !file) { console.error("Usage: node tools/check-npm-version.cjs <version> <file>"); return 2; }
  // An empty output is not "nothing published": the workflow writes [] itself only for E404.
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const published = [].concat(parsed);
  const higher = published.filter((p) => compareVersions(version, p) <= 0);
  if (higher.length) { console.error(version + " is not greater than the version(s) on npm: " + higher.join(", ")); return 1; }
  console.log("OK: " + version + " is greater than the " + published.length + " version(s) on npm.");
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { compareVersions };
