"use strict";
// Shared helper: runs package/bin/expl.js with an empty home and no network target.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SKILLS = [
  { dir: "exploratory-expl", args: ["skill"] },
  { dir: "exploratory-expl-server", args: ["server", "skill"] },
];

// Runs the package under <root> with the given arguments. Returns { status, stdout, stderr }.
function runExpl(root, args) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "expl-home-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, EXPLORATORY_HOME: home, EXPL_SERVER_URL: "http://127.0.0.1:9", NO_COLOR: "1" };
  delete env.EXPL_SERVER_TOKEN;
  delete env.EXPLORATORY_AGENT_TOKEN;
  try {
    const r = spawnSync(process.execPath, [path.join(root, "package", "bin", "expl.js"), ...args], { env, encoding: "utf8", timeout: 60000, cwd: home });
    return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

module.exports = { runExpl, SKILLS };
