"use strict";
// Reads and writes the version sections of CHANGELOG.md.
// A section is "## <npm version> - <date>" followed by a blank line and "Built from the `expl` in Exploratory Desktop <x.y.z>."
// (the form given in RELEASING.md and used by the 1.0.0 section).
const fs = require("node:fs");
const path = require("node:path");

const PLACEHOLDER = "No release has been imported yet.";
// Text may follow the Desktop version, as in "Exploratory Desktop 17.0.1 (source commit a6025d748f).".
const SECTION_RE = /^## (\S+) - \S+\n\nBuilt from the `expl` in Exploratory Desktop (\d+\.\d+\.\d+)\b.*\.$/gm;

// Returns the sections of the text, newest first, as [{ version, desktopVersion }].
function sections(text) {
  return [...text.replace(/\r\n/g, "\n").matchAll(SECTION_RE)].map((m) => ({ version: m[1], desktopVersion: m[2] }));
}

// Returns the text with a section for `version` built from `desktopVersion`, dated `date` (YYYY-MM-DD), at the top.
// Keeps the text when that section is already there; throws when it names another Desktop version.
function addSection(text, version, desktopVersion, date) {
  text = text.replace(/\r\n/g, "\n");
  const same = sections(text).find((s) => s.version === version);
  if (same) {
    if (same.desktopVersion !== desktopVersion) {
      throw new Error("CHANGELOG.md already has " + version + " built from Exploratory Desktop " + same.desktopVersion + ", but this build is " + desktopVersion + ".");
    }
    return text;
  }
  const entry = "## " + version + " - " + date + "\n\nBuilt from the `expl` in Exploratory Desktop " + desktopVersion + ".\n";
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
  if (top.version !== version) return "The top section of CHANGELOG.md is " + top.version + ", but package/package.json is " + version + ".";
  return null;
}

module.exports = { sections, addSection, checkChangelog };
