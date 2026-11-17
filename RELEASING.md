# Releasing

This page is for the people who publish `expl` to npm. The package has its own version (semantic versioning, starting at 1.0.0). Its contents always come from the `expl` in a released Exploratory Desktop build, and `CHANGELOG.md` records which one.

## 1. Import a release build

Get the folder of the production build. It contains `package.json` and `cli/expl.bundle.js`.

```bash
node tools/import-release.cjs --from <folder> --version <x.y.z>
```

The script copies the bundle to `package/cli/`, sets the version in `package/package.json` to `--version`, reports the Desktop version found in the folder's `package.json`, and rebuilds the two files under `skills/` by running the bundle with an empty home. It refuses a development build.

Then:

1. Add a section to `CHANGELOG.md` (`## <version> - <date>`, first line "Built from the `expl` in Exploratory Desktop <Desktop version>.").
2. Run the full check (section 3).
3. Open a pull request. The pull request is the place to review what will be published.

## 2. Publish

`.github/workflows/publish.yml` runs only when started by hand, with the version as input. It checks out the tag `v<version>`, runs the tests, the link check and the smoke check, copies `README.md` and `LICENSE` into `package/`, verifies the file list of the package, and then stages the publish with `npm stage publish`. A maintainer approves the staged publish on npm with two-factor authentication.

Before the first publish: the repository is public, branch protection is set, and the package exists on npm with a trusted publisher configured for `publish.yml`. Limit that trusted publisher to staged publishing only, so that a workflow run cannot publish a version directly without an approval on npm (check the exact option in the npm package settings, because this was not verified).

After the approval:

1. Create the GitHub release from the matching `CHANGELOG.md` section.
2. Set the repository variable `NPM_PUBLISHED` to `true`, then run the `verify-install` workflow once.

## 3. Full check

```bash
node --test && node tools/check-links.cjs && node tools/smoke.cjs
```
