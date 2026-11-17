# Contributing

The source of `expl` is developed together with Exploratory Desktop and is not in this repository. This repository holds the published package (`package/`), the documentation, and the release checks.

- Pull requests that fix the documentation (`README*.md`, `docs/`, `examples/`) are welcome.
- Report CLI bugs and requests as issues. Pull requests that change `package/` or `skills/` cannot be accepted, because those files are produced from a release build.
- Before you open a pull request, run `node --test`, `node tools/check-links.cjs` and `node tools/smoke.cjs`.
- Write commit messages in English. Do not include tokens, passwords, personal data or private hostnames in code, text or commit messages.
