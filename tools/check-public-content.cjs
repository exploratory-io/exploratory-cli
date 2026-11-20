#!/usr/bin/env node
"use strict";
// Checks that tracked content is safe to publish.
// Usage: node tools/check-public-content.cjs [--history | --range <rev-range>] [--root <dir>]
//  default   : scan every file from `git ls-files -co --exclude-standard` (the bundle included)
//  --history : scan every commit on every ref (messages, authors, and all added and removed lines)
//  --range   : same as --history for a revision range such as origin/main..HEAD
// Pattern rules are below. Internal names are read from the untracked file .internal-words in the root
// (one word per line; kept only on the maintainer's machine, so CI applies the pattern rules only); they are never printed:
// findings show only the file, the line and the position of the word in the list.
// The patterns below are written so that this file does not match them.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MIN_FILES = 3;
const ALLOWED_EMAIL = [/^support@exploratory\.io$/i, /@users\.noreply\.github\.com$/i, /^noreply@github\.com$/i];
const ALLOWED_HOSTS = ["exploratory.io", "www.exploratory.io"];

const RULES = [
  { name: "home directory path", re: /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/ },
  { name: "issue number with five digits", re: /#\d{5}(?!\d)/ },
  { name: "internal plan path", re: /docs\/plan[s]\b/ },
  { name: "owner TODO marker", re: /TODO\(owne[r]\)/ },
  { name: "status word", re: /未検[証]|\bunrelease[d]\b/i },
  { name: "development build marker", re: /The "eva[l]" devtool|source[M]appingURL/ },
  { name: "unscoped package name", re: /\bnpx\s+(?:-\S+\s+)*exp[l](?![\w/.-])|\bnpm\s+(?:i|install)\s+(?:-\S+\s+)*exp[l](?![\w/.-])/ },
];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const HOST_RE = /\b(?:[a-z0-9-]+\.)+exploratory\.io\b/gi;

// Returns the words of a word list text (one per line, blank lines ignored).
function parseWords(text) {
  return [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
}

// Returns the internal word list (array of strings) from the untracked file, or [] when it is not there.
function loadWords(root) {
  const f = path.join(root, ".internal-words");
  return fs.existsSync(f) ? parseWords(fs.readFileSync(f, "utf8")) : [];
}

// Builds one case-insensitive, word-bounded regex per word.
function wordRegexes(words) {
  return words.map((w) => new RegExp("(?<![A-Za-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9])", "i"));
}

// Scans one line and returns the names of the rules it breaks.
function scanLine(line, wordRes) {
  const hits = [];
  for (const r of RULES) if (r.re.test(line)) hits.push(r.name);
  for (const m of line.match(EMAIL_RE) || []) {
    if (!ALLOWED_EMAIL.some((re) => re.test(m))) { hits.push("email address"); break; }
  }
  for (const m of line.match(HOST_RE) || []) {
    if (!ALLOWED_HOSTS.includes(m.toLowerCase())) { hits.push("subdomain of the product site"); break; }
  }
  wordRes.forEach((re, i) => { if (re.test(line)) hits.push("internal word #" + (i + 1)); });
  return hits;
}

// Scans a text and returns findings as strings "<label>:<line>: <rule>".
function scanText(label, text, wordRes) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const h of scanLine(line, wordRes)) out.push(label + ":" + (i + 1) + ": " + h);
  });
  return out;
}

// Lists repository files: git when available, otherwise a directory walk.
function listFiles(root) {
  if (fs.existsSync(path.join(root, ".git"))) {
    const o = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
    return o.split("\0").filter((f) => f && fs.existsSync(path.join(root, f)));
  }
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== ".git" && e.name !== "node_modules") walk(path.join(d, e.name)); }
      else if (e.name !== ".internal-words") files.push(path.relative(root, path.join(d, e.name)).split(path.sep).join("/"));
    }
  })(root);
  return files;
}

// Scans the current files. Returns { findings, count }.
function scanFiles(root, wordRes) {
  const files = listFiles(root);
  const findings = [];
  for (const f of files) {
    const buf = fs.readFileSync(path.join(root, f));
    if (buf.includes(0)) continue;
    findings.push(...scanText(f, buf.toString("utf8"), wordRes));
  }
  return { findings, count: files.length };
}

// Scans commit metadata and every changed line (including deleted content) of the given revisions.
function scanHistory(root, wordRes, range) {
  const SEP = "\u0001COMMIT\u0001";
  const fmt = SEP + "%H%n%an%n%ae%n%cn%n%ce%n%B%n\u0001BODYEND\u0001";
  const args = ["log", "-p", "-m", "--text", "--no-ext-diff", "--no-textconv", "--format=" + fmt];
  args.push(...(range ? [range] : ["--all"]));
  const out = execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 30 });
  const findings = [];
  let n = 0;
  for (const chunk of out.split(SEP).slice(1)) {
    n += 1;
    const [head, ...rest] = chunk.split("\n");
    const hash = head.slice(0, 7);
    const [an, ae, cn, ce] = rest.slice(0, 4);
    for (const e of [ae, ce]) {
      if (!ALLOWED_EMAIL.some((re) => re.test(e))) findings.push("commit " + hash + ": author or committer email is not a noreply address");
    }
    const body = rest.slice(4).join("\n");
    const [msg, patch = ""] = body.split("\u0001BODYEND\u0001");
    for (const [label, text] of [["name", an + "\n" + cn], ["message", msg], ["diff", patch]]) {
      for (const f of scanText("commit " + hash + " " + label, text, wordRes)) findings.push(f);
    }
  }
  return { findings, count: n };
}

function main(argv) {
  const ri = argv.indexOf("--root");
  const root = path.resolve(ri >= 0 ? argv[ri + 1] : path.join(__dirname, ".."));
  const words = loadWords(root);
  if (words.length === 0) console.error("Notice: no .internal-words file; only the pattern rules were applied.");
  const wordRes = wordRegexes(words);
  const rangeIdx = argv.indexOf("--range");
  let result;
  if (argv.includes("--history")) result = scanHistory(root, wordRes, null);
  else if (rangeIdx >= 0) result = scanHistory(root, wordRes, argv[rangeIdx + 1]);
  else result = scanFiles(root, wordRes);
  const history = argv.includes("--history") || rangeIdx >= 0;
  if (!history && result.count < MIN_FILES) { console.error("Only " + result.count + " file(s) were found; expected at least " + MIN_FILES + "."); return 1; }
  if (result.findings.length) { console.error(result.findings.join("\n")); console.error(result.findings.length + " finding(s)."); return 1; }
  console.log("OK: " + result.count + (history ? " commit(s)" : " file(s)") + " checked.");
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { scanLine, scanText, scanFiles, parseWords, wordRegexes, RULES };
