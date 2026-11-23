# Releasing

This page is for the people who publish `expl` to npm. The package has its own version (semantic versioning, starting at 1.0.0). Its contents come from the `expl` of a commit on the tam master branch, and `CHANGELOG.md` records which commit and which Exploratory Desktop version that commit has.

## 1. Import from tam master

In a tam checkout with its `node_modules` installed (the root and `src/`), fetch first so that `origin/master` is current. Then, in this repository:

```bash
node tools/import-release.cjs --tam <tam checkout> [--ref <commit>] --version <x.y.z>
```

`--ref` defaults to `origin/master`. The script resolves it to a commit in the tam checkout, clones that commit into a temporary folder with `git clone --shared` (the tam checkout itself is not changed), links the checkout's `node_modules` and `src/node_modules` into the clone, and builds only the `expl-cli` entry of tam's `webpack.production.config.js`, without a source map. The Desktop version is the one of `public/package.json` in that commit. It then imports the bundle as described below, writing the first line of the section as "Built from the `expl` in tam master <10-digit commit> (Exploratory Desktop <Desktop version>).", and removes the temporary clone, also when a step fails.

To import the `expl` of a released Desktop, or a bundle built by hand, import its folder instead. It contains `package.json` and `cli/expl.bundle.js`; in a release build it is `Exploratory.app/Contents/Resources/app.nw` (mount the dmg read-only):

```bash
node tools/import-release.cjs --from <folder> --version <x.y.z>
```

The Desktop version is the one of that `package.json`: `x.y.z`, or `x.y.z_<platform>` as a release build names it (`17.0.5_MAC_ARM` is Desktop 17.0.5). The `expl` bundle is the same JavaScript on every platform, so one platform's build is enough. A release build's bundle ends with a comment line linking its source map `expl.bundle.js.map`; the package does not ship the map, so the import drops that last line and keeps the rest unchanged. Any other source map link still stops the import as a development build. The section's first line is then "Built from the `expl` in Exploratory Desktop <Desktop version>.".

Both forms copy the bundle to `package/cli/`, set the version in `package/package.json` to `--version`, rebuild the two files under `skills/` by running the bundle with an empty home, and add a section to the top of `CHANGELOG.md` (`## <version> - <date>` and the first line above). When `CHANGELOG.md` already has a section for that version, its Desktop version must be the one of the build, or the import stops before writing anything. After the import the script runs the content check with the internal word list `.internal-words` of the repository root (one word per line, never committed), and fails when that file is missing, empty or unreadable. It refuses a development build.

Then:

1. Write the notes of the version under its new section in `CHANGELOG.md`. A test checks that the top section has the version of `package/package.json`.
2. Run the full check (section 3).
3. Open a pull request. The pull request is the place to review what will be published.

## 2. Publish

`.github/workflows/publish.yml` runs only when started by hand, with the version as input. It checks out the tag `v<version>`, checks with `npm view` that the version is greater than every version already on npm (compared in semantic version order, pre-releases included), runs the tests, the content check, the link check and the smoke check, copies `README.md` and `LICENSE` into `package/`, verifies the file list of the package, and then stages the publish with `npm stage publish`. A maintainer approves the staged publish on npm with two-factor authentication.

Before the first publish: the repository is public, branch protection is set, and the package exists on npm with a trusted publisher configured for `publish.yml`. Limit that trusted publisher to staged publishing only, so that a workflow run cannot publish a version directly without an approval on npm (check the exact option in the npm package settings, because this was not verified).

After the approval:

1. Create the GitHub release from the matching `CHANGELOG.md` section.
2. Set the repository variable `NPM_PUBLISHED` to `true`, then run the `verify-install` workflow once.

## 3. Full check

```bash
node --test && node tools/check-public-content.cjs && node tools/check-links.cjs && node tools/smoke.cjs
```
