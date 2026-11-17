# Install

[日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.ja.md)

There are two ways to get `expl`. Pick one; you do not need both.

## With Exploratory Desktop

`expl` is bundled with Exploratory Desktop, including `expl server`. Nothing else is needed, and Node.js is not required. When you start the production app, it puts `expl` on your PATH if it is not there yet. On macOS this happens only when the app is in `/Applications` or `~/Applications`; it may ask for administrator permission, and if you decline it uses `~/.local/bin` (add that folder to your PATH if needed). An existing command called `expl` that is not Exploratory's is never replaced. A development build does not install it. Open a new terminal and run:

```bash
expl --version
```

## With npm

Use this when you do not have Desktop: you only use Exploratory Server, or you run `expl` in CI or on a server. Node.js 20 or later is required.

```bash
npx @exploratory/cli@<version> --version
npm install -g @exploratory/cli@<version>
```

Replace `<version>` with the version you want. Always pin it in scripts. The package is `@exploratory/cli` and the command it installs is `expl`. Do not install a package named just `expl`: that name belongs to someone else.

An overview is on the [Exploratory CLI page](https://exploratory.io/cli) on exploratory.io.

## When two copies are installed

If you installed from npm and also have Desktop, check which one runs:

```bash
which -a expl        # macOS and Linux: every copy, the one that runs first
where expl           # Windows
expl --version
```

The first line of `expl --version` is `expl <version>`. It does not say how `expl` was installed, so use the paths above to tell the copies apart. If the first path is not the one you expect, put the folder you want first on your PATH, or remove the other copy.

If you have Desktop, you do not need a global npm install (`npx` with a pinned version in CI is fine). On a Mac where Node.js was installed with the installer from nodejs.org, npm puts commands in `/usr/local/bin`, the folder Desktop normally uses, so `npm install -g` stops with `EEXIST`. Do not run it again with `--force`: that replaces the `expl` that comes with Desktop. The other way round, if `expl` from npm is already in `/usr/local/bin`, Desktop leaves it in place and does not add its own.

## Remove

- npm: `npm uninstall -g @exploratory/cli`
- Desktop: remove the `expl` link or the Exploratory folder from your PATH. Desktop adds it again at the next start unless you decline when it asks.

## Next

- [Sign in to Exploratory Server](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.md)
- [Use with Exploratory Desktop](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md)
