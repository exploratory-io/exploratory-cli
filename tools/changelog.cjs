"use strict";
// Reads and writes the version sections of CHANGELOG.md.
// A section is "## <npm version> - <date>" followed by a blank line and a first line naming the source, either
// "Built from the `expl` in tam master <10-digit commit> (Exploratory Desktop <x.y.z>)." (an import with --tam) or
// "Built from the `expl` in Exploratory Desktop <x.y.z>." (an import with --from, and the 1.0.0 section).
const fs = require("node:fs");
const path = require("node:path");

const PLACEHOLDER = "No release has been imported yet.";
const HEADING_RE = /^## (\S+) - \d{4}-\d{2}-\d{2}$/;
// In the second form text may follow the Desktop version, as in "Exploratory Desktop 17.0.1 (source commit a6025d748f).".
const DESKTOP_RE = /^Built from the `expl` in (?:tam master [0-9a-f]{10} \(Exploratory Desktop (\d+\.\d+\.\d+)\)|Exploratory Desktop (\d+\.\d+\.\d+)\b.*)\.$/;
const FORMS = "\"Built from the `expl` in tam master <commit> (Exploratory Desktop <x.y.z>).\" or \"Built from the `expl` in Exploratory Desktop <x.y.z>.\"";

// Returns the first line of a section: with `commit` (10 digits of a tam master commit) the tam form, otherwise the Desktop form.
function sourceLine(desktopVersion, commit) {
  return commit
    ? "Built from the `expl` in tam master " + commit + " (Exploratory Desktop " + desktopVersion + ")."
    : "Built from the `expl` in Exploratory Desktop " + desktopVersion + ".";
}

// Returns every "## " heading of the text, newest first, as [{ version, desktopVersion, heading }].
// version is the first word after "## "; desktopVersion is null when the heading or its Desktop line is not in the form above.
function sections(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  lines.forEach((line, i) => {
    if (!line.startsWith("## ")) return;
    const h = HEADING_RE.exec(line);
    const d = lines[i + 1] === "" ? DESKTOP_RE.exec(lines[i + 2] || "") : null;
    out.push({ version: line.slice(3).trim().split(/\s+/)[0], desktopVersion: h && d ? d[1] || d[2] : null, heading: line });
  });
  return out;
}

// Returns the text with a section for `version` built from `desktopVersion` (and tam master `commit`, if given), dated
// `date` (YYYY-MM-DD), at the top. Keeps the text when that section is already there; throws when it names another
// Desktop version.
function addSection(text, version, desktopVersion, date, commit) {
  text = text.replace(/\r\n/g, "\n");
  const same = sections(text).find((s) => s.version === version);
  if (same) {
    if (!same.desktopVersion) throw new Error("Cannot read the section \"" + same.heading + "\" of CHANGELOG.md; it must be \"## <version> - <YYYY-MM-DD>\", a blank line and " + FORMS + ".");
    if (same.desktopVersion !== desktopVersion) {
      throw new Error("CHANGELOG.md already has " + version + " built from Exploratory Desktop " + same.desktopVersion + ", but this build is " + desktopVersion + ".");
    }
    return text;
  }
  const entry = "## " + version + " - " + date + "\n\n" + sourceLine(desktopVersion, commit) + "\n";
  const body = text.replace(PLACEHOLDER + "\n", "");
  const i = body.search(/^## /m);
  if (i < 0) return body.replace(/\n*$/, "\n\n") + entry;
  return body.slice(0, i) + entry + "\n" + body.slice(i);
}

// Returns null when the top section of CHANGELOG.md matches package/package.json, otherwise the reason.
// Before the first import (no section, version 0.0.0) it returns null.
function checkChangelog(root) {
  const version = JSON.parse(fs.readFileSync(path.join(root, "package", "package.json"), "utf8")).version;
  const top = sections(fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8"))[0];
  if (!top) return version === "0.0.0" ? null : "CHANGELOG.md has no section, but package/package.json is " + version + ".";
  if (!top.desktopVersion) return "Cannot read the top section \"" + top.heading + "\" of CHANGELOG.md; it must be \"## <version> - <YYYY-MM-DD>\", a blank line and " + FORMS + ".";
  if (top.version !== version) return "The top section of CHANGELOG.md is " + top.version + ", but package/package.json is " + version + ".";
  return null;
}

module.exports = { sections, addSection, checkChangelog };
