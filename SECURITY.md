# Security

## Reporting a vulnerability

Email support@exploratory.io with "Security" in the subject. Please do not open a public issue.

## Supported versions

The latest version on npm, and the version of `expl` that ships in the current Exploratory Desktop.

## What `expl` stores

- Exploratory Server login: a token in `~/.exploratory/expl/server/<host>.json` (permission 0600; on Windows `%USERPROFILE%\.exploratory\expl\server\<host>.json`).
- Exploratory Desktop connection: `expl` reads the connection details and token that Desktop writes under `~/.exploratory/agent/`. It does not write them.
- The default project and the list of commands from the last time Desktop was reached are saved under `~/.exploratory/agent/`.

## Whom `expl` talks to

- The Exploratory Desktop running on your computer.
- The Exploratory Server you sign in to. Sign-in uses the browser (OAuth with PKCE) and returns to a temporary port on `127.0.0.1`.

## What you can do

- Revoke a token with `expl server token revoke`, sign out with `expl server logout`, or revoke access in Connected AI Apps on the server.
- `--verbose` never prints tokens, but review its output before you paste it anywhere.

## What is sent or recorded

`expl` sends no usage analytics of its own. It talks only to Exploratory Desktop on your computer and to the Exploratory Server you sign in to.

- **Exploratory Desktop.** Commands go to the Desktop app over a local connection on your computer. Desktop keeps a log of each tool call on your computer (tool name, parameter names without their values, result, duration) and deletes it after 90 days. While you are signed in and AI features are on, Desktop also sends one usage record for each tool call to the exploratory.io server you are signed in to, as it does for the Desktop MCP (never for local data catalog tools). A record holds the tool name and its arguments (which can include formulas and values you entered), success or failure with the error type and message, the size of the result (not the content), the duration, the Desktop version, the client name and version, and the session and item IDs.
- **Exploratory Server (`expl server`).** The server records the following. It records the same when an AI app connects to Exploratory through MCP.
  - **Tokens:** stored as hashes, not as plain text, with the creation time, expiry and last use. You can see and revoke them in Connected AI Apps.
  - **Data access log:** the item, your user ID and email address, the channel (`cli`), the operation, the client name, the IP address, the result and error code, and the duration. Kept for 90 days by default (1 to 400 days, set on the server).
  - **Server log:** each tool call (email address, client, result, row count, duration), and when a token is created or deleted.
  - **Errors of failed calls:** the time, the tool call and the error are collected to improve the product.
