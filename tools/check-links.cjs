#!/usr/bin/env node
"use strict";
// Checks relative links and heading anchors in the Markdown files of the repository.
// Absolute links to this repository's main branch (https://github.com/exploratory-io/exploratory-cli/blob|tree/main/...)
// are read as local files, so they also work on the npm page. Other http(s) links and placeholder markers are skipped.
// Usage: node tools/check-links.cjs [--root <dir>]
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SELF = /^https:\/\/github\.com\/exploratory-io\/exploratory-cli\/(?:blob|tree)\/main\/?/;
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Lists Markdown files under root (git when available, otherwise a directory walk).
function listMarkdown(root) {
  let files;
  if (fs.existsSync(path.join(root, ".git"))) {
    files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter((f) => f && fs.existsSync(path.join(root, f)));
  } else {
    files = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name !== ".git" && e.name !== "node_modules") walk(path.join(d, e.name)); }
        else files.push(path.relative(root, path.join(d, e.name)).split(path.sep).join("/"));
      }
    })(root);
  }
  return files.filter((f) => f.endsWith(".md"));
}

// Returns the text without fenced code blocks (lines are kept so that numbers stay right).
function stripFences(text) {
  let inFence = false;
  return text.split(/\r?\n/).map((l) => {
    if (/^\s*```/.test(l)) { inFence = !inFence; return ""; }
    return inFence ? "" : l;
  });
}

// GitHub-style slug of a heading.
function slug(h) {
  return h.trim().toLowerCase().replace(/[`*_~]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

// Returns the set of anchors of a Markdown file.
function anchors(file) {
  const set = new Set();
  const seen = {};
  for (const l of stripFences(fs.readFileSync(file, "utf8"))) {
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(l);
    if (!m) continue;
    let s = slug(m[1]);
    if (seen[s] !== undefined) { seen[s] += 1; s += "-" + seen[s]; } else seen[s] = 0;
    set.add(s);
  }
  return set;
}

// Checks the root and returns a list of problems.
function check(root) {
  const problems = [];
  for (const f of listMarkdown(root)) {
    const lines = stripFences(fs.readFileSync(path.join(root, f), "utf8"));
    lines.forEach((line, i) => {
      for (const m of line.matchAll(LINK_RE)) {
        let target = m[1];
        if (target.startsWith("__")) continue;
        let base = path.dirname(path.join(root, f));
        if (SELF.test(target)) { target = target.replace(SELF, ""); base = root; }
        else if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const [p, hash] = target.split("#");
        const dest = p ? path.resolve(base, decodeURIComponent(p)) : path.join(root, f);
        if (!fs.existsSync(dest)) { problems.push(f + ":" + (i + 1) + ": missing target " + m[1]); continue; }
        if (hash && dest.endsWith(".md") && fs.statSync(dest).isFile() && !anchors(dest).has(hash.toLowerCase())) {
          problems.push(f + ":" + (i + 1) + ": missing heading anchor " + m[1]);
        }
      }
    });
  }
  return problems;
}

function main(argv) {
  const i = argv.indexOf("--root");
  const root = path.resolve(i >= 0 ? argv[i + 1] : path.join(__dirname, ".."));
  const problems = check(root);
  if (problems.length) { console.error(problems.join("\n")); return 1; }
  console.log("OK: links checked in " + listMarkdown(root).length + " Markdown file(s).");
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { check };
