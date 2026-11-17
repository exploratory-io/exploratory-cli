# Exploratory Server

[日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.ja.md)

`expl server` calls the tools of Exploratory Server (exploratory.io) without Exploratory Desktop.

## Sign in

```bash
expl server login
expl server status
expl server logout
```

`login` opens your browser. When the terminal is not interactive, `expl` does not open a browser and prints the URL instead. With `--no-browser`, you open the URL yourself and paste the redirect URL back. The token is saved under `~/.exploratory/expl/server/` (one file per host, permission 0600; on Windows under `%USERPROFILE%\.exploratory\expl\server\`). A saved login is used only for the same origin (scheme, host and port). On a standard port, a later login to the same host replaces the saved file.

If the token is revoked (for example in Connected AI Apps on the server), the next call exits with code 4 and tells you to run `expl server login`. `expl server logout` removes only the saved copy; an API key you saved with `--with-token` keeps working until you revoke it in Account Settings > API Keys.

### Signing in with `--no-browser`

Use this on a machine where `expl` cannot open a browser, such as a remote server.

1. Run `expl server login --no-browser`. It prints a URL that starts with `https://exploratory.io/oauth/authorize?` and waits.
2. Open that URL in a browser, sign in and allow access.
3. The browser then goes to a page that cannot be reached. That is expected.
4. Copy the URL in the browser's address bar. It starts with `http://127.0.0.1/callback?code=`. Do not paste the first URL from step 1.
5. Paste it into the terminal and press Enter. `Logged in to ... as ...` means you are signed in.

The code in that URL works only once and expires 60 seconds after the browser reaches that page, so paste it right away. If signing in fails, start again from step 1.

## Tokens and API keys for CI

```bash
expl server token create --name ci
expl server token create --name ci --expires 90
expl server token list
expl server token revoke ci
```

`token create` needs a login made with `expl server login`. `--expires <days>` sets how long the token is valid.

Pass a token, or an API key (create one in Account Settings > API Keys; it starts with `exp_pat_`), with the `EXPL_SERVER_TOKEN` environment variable. The `--token` flag was removed: `expl server` refuses it and exits with code 2.

To save an API key for later calls, run `expl server login --with-token`. It asks for the key without showing it, or reads it from standard input. You cannot combine it with `--no-browser`. Order of precedence: `EXPL_SERVER_TOKEN`, then what `expl server login` (or `--with-token`) saved.

## Server URL

Order of precedence: `--url`, then `EXPL_SERVER_URL`, then the host whose saved login is the most recent (a token refresh updates it too), then `https://exploratory.io`.

## Server-only flags

| Flag | What it does |
|---|---|
| `--url <url>` | The server to call |
| `--with-token` | With `login`: save an API key that is read from standard input (or asked for without echo) |
| `--output <file>`, `-o <file>` | Where to save a file result, such as a data frame export or a chart image |
| `--no-browser` | Do not open a browser while signing in |

`--project` is not used with `expl server`. The other global flags in the [Desktop guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md) work the same way. `--timeout` is the longest time for one HTTP request to the server (default 300 seconds).

## Commands

Run `expl server tools list` to see the available commands; the list comes from the server each time. `search` and `fetch` take no verb: `expl server search <query>`, `expl server fetch <id>`.

By default the output is for people: tables for lists, the text for `fetch`, and the URL last. `--json` prints the server's result as JSON.

```bash
expl server search "sales"
expl server fetch <id> --json
```

## In CI

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx @exploratory/cli@<version> server fetch <id> --json
  env:
    EXPL_SERVER_TOKEN: ${{ secrets.EXPL_SERVER_TOKEN }}
    EXPL_SERVER_URL: https://exploratory.io
```

Complete files: [GitHub Actions](https://github.com/exploratory-io/exploratory-cli/blob/main/examples/github-actions.yml), [Bitbucket Pipelines](https://github.com/exploratory-io/exploratory-cli/blob/main/examples/bitbucket-pipelines.yml).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | The operation failed |
| 2 | Wrong usage |
| 3 | The server cannot be reached (network, an HTML error page, and so on) |
| 4 | Not logged in, or the token was rejected |
| 130 | Interrupted with Ctrl+C |
