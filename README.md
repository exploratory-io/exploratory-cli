# Exploratory CLI (`expl`)

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/README.md) | [日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/README.ja.md)

## About

`expl` is the command line for Exploratory. It runs the same operations that AI agents use, from a terminal, a shell script or a CI job. It works with Exploratory Server (exploratory.io) and with Exploratory Desktop.

**If you use Exploratory Desktop, you already have `expl`.** It is bundled with the app, `expl server` included, so you do not need this package. This package is for people without Desktop: Server-only users, CI jobs and servers.

## Install

You need Node.js 20 or later.

```bash
npx @exploratory/cli@<version> --version
npm install -g @exploratory/cli@<version>
```

The package is `@exploratory/cli`; the command it installs is `expl`. Pin the version you want in place of `<version>`. Desktop users and anyone who has both copies installed should read the [install guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.md).

## Sign in to Exploratory Server

```bash
expl server login
```

This opens your browser and saves a token on this computer. On a machine without a browser, run `expl server login --no-browser` and paste the redirect URL when asked. To use a server other than `https://exploratory.io`, pass `--url` or set `EXPL_SERVER_URL`.

## Quick start

```bash
expl server status
expl server tools list
expl server search "sales"
expl server fetch <id> --json
```

`expl server tools list` shows every command the server offers.

## Use in CI

Create a token once, on a computer where you are signed in:

```bash
expl server token create --name ci
```

Store it as a secret and pass it as `EXPL_SERVER_TOKEN`. An API key from Account Settings > API Keys works the same way. A GitHub Actions step looks like this; the full files are in [examples](https://github.com/exploratory-io/exploratory-cli/tree/main/examples).

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx @exploratory/cli@<version> server fetch <id> --json
  env:
    EXPL_SERVER_TOKEN: ${{ secrets.EXPL_SERVER_TOKEN }}
```

## Use with Exploratory Desktop

Commands such as `expl project list` and `expl chart get` talk to the Exploratory Desktop running on the same computer. Desktop must be running and signed in. If it is not running, `expl` exits with code 3; if you are signed out, lack permission, or the CLI is turned off in Desktop, with code 4. See the [Desktop guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md) for arguments, confirmations and flags.

## Use from AI agents

An agent can run `expl` from its shell. To teach Claude Code or Codex about it, save the skill that `expl` prints:

```bash
mkdir -p ~/.claude/skills/exploratory-expl
expl skill > ~/.claude/skills/exploratory-expl/SKILL.md
```

`expl server skill` prints the one for Exploratory Server. Copies of both are in [skills](https://github.com/exploratory-io/exploratory-cli/tree/main/skills). If you prefer MCP, use the [Exploratory plugin](https://github.com/exploratory-io/exploratory). See the [agents guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.md).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | The operation failed |
| 2 | Wrong usage |
| 3 | Desktop or Server cannot be reached |
| 4 | Authentication or permission |
| 130 | Interrupted with Ctrl+C |

## Documentation

- [Install](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.md)
- [Exploratory Server](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.md)
- [Exploratory Desktop](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md)
- [AI agents](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.md)
- [Exploratory CLI on exploratory.io](https://exploratory.io/cli)

## What is sent and recorded

`expl` sends no usage analytics of its own. It talks only to Exploratory Desktop on your computer and to the Exploratory Server you sign in to.

- **Exploratory Desktop.** Commands go to the Desktop app over a local connection on your computer. Desktop keeps a log of each tool call on your computer (tool name, parameter names without their values, result, duration) and deletes it after 90 days. While you are signed in and AI features are on, Desktop also sends one usage record for each tool call to the exploratory.io server you are signed in to, as it does for the Desktop MCP (never for local data catalog tools). A record holds the tool name and its arguments (which can include formulas and values you entered), success or failure with the error type and message, the size of the result (not the content), the duration, the Desktop version, the client name and version, and the session and item IDs.
- **Exploratory Server (`expl server`).** The server records the following. It records the same when an AI app connects to Exploratory through MCP.
  - **Tokens:** stored as hashes, not as plain text, with the creation time, expiry and last use. You can see and revoke them in Connected AI Apps.
  - **Data access log:** the item, your user ID and email address, the channel (`cli`), the operation, the client name, the IP address, the result and error code, and the duration. Kept for 90 days by default (1 to 400 days, set on the server).
  - **Server log:** each tool call (email address, client, result, row count, duration), and when a token is created or deleted.
  - **Errors of failed calls:** the time, the tool call and the error are collected to improve the product.

## Versions

This package has its own version, starting at 1.0.0. Each version is taken from the `expl` in an Exploratory Desktop release, and the [changelog](https://github.com/exploratory-io/exploratory-cli/blob/main/CHANGELOG.md) names which one. A new Server tool does not need a new CLI, because the command list is fetched from the server each time.

## Support and security

Questions and bug reports: see [SUPPORT.md](https://github.com/exploratory-io/exploratory-cli/blob/main/SUPPORT.md). Vulnerabilities: see [SECURITY.md](https://github.com/exploratory-io/exploratory-cli/blob/main/SECURITY.md); please do not open a public issue.

## About the source

The source of `expl` is developed together with Exploratory Desktop and is not in this repository. This repository holds the published package, the documentation and the release checks. Pull requests that fix the documentation are welcome; report CLI bugs as issues.

License: MIT
