# Exploratory Desktop

[日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)

These commands talk to the Exploratory Desktop that is running and signed in on your computer, over the same local connection AI agents use. `expl` has no login of its own. Desktop writes the connection details under `~/.exploratory/agent/`, and `expl` reads them there. The first time, Desktop shows a request to approve `expl`; approve it in the app (`expl` waits up to 2 minutes). `expl` itself keeps its credential: on macOS and Linux in the OS keychain (or, when no keychain is available, in a file with permission 0600 under `~/.exploratory/agent/`), and on Windows in a file protected by the OS. Later runs do not ask again. Set `EXPLORATORY_AGENT_TOKEN` to a paired credential (it starts with `expc_`) to use a credential of your own, and `EXPLORATORY_HOME` to use another Exploratory home folder.

In Desktop, open **System Settings > MCP / CLI** and turn on **Enable CLI**. With **Allow create, edit and delete** off, `expl` can only read. If the CLI is off, `expl` exits with code 4.

If Desktop is not running, `expl` says so and exits with code 3. `expl --help` still works.

## Commands

Commands have the form `expl <noun> <verb>` and are generated from the tools the running Desktop offers. Run `expl tools list` to see all of them and `expl tools describe <command>` for the flags of one.

```bash
expl status
expl project list
expl project use "Sales Analysis"
expl dashboard get d123 --json
```

A command that needs exactly one id takes it as the first argument. When a required id is missing, `expl` lists the candidates it can find and exits with code 2. A command that needs a project works on one project: `--project`, then the `EXPL_PROJECT` environment variable, then the project chosen with `expl project use`. The project must be open in Desktop.

Built-in commands: `status`, `tools list`, `tools describe`, `call <tool_name>`, `project use`, `lang`, `skill`, `completion`, `server ...`, `help`.

## Passing arguments

| Kind of input | How | Example |
|---|---|---|
| String, number, choice | `--kebab-case <value>` | `--title "Sales 2026"` |
| Boolean | `--flag` or `--no-flag` | `--include-data` |
| List of values | repeat the flag | `--tag sales --tag weekly` |
| Object or list of objects | a JSON string or `@file` | `--pages @pages.json` |
| Long text | `@file` | `--content @report.md` |

Give the whole input as JSON with `--input <file>` or `--input -` (standard input). A flag given together with `--input` wins. An unknown flag is an error (exit code 2) with a suggestion.

## Global flags

They can be placed before or after the command.

| Flag | What it does |
|---|---|
| `--project <id\|name>` | The project to work on |
| `--json` | Print the result as JSON, as the tool returned it |
| `--yes`, `-y` | Skip the confirmation of an operation that is hard to undo |
| `--no-wait` | Do not wait for a long operation; print its ids and exit |
| `--timeout <seconds>` | Longest time to wait. Without it, a tool call waits up to 120 seconds for the answer, and waiting for a long operation to finish has no overall limit |
| `--quiet`, `-q` | No progress output |
| `--verbose` | Print what is sent and received to standard error (tokens are never printed) |
| `--input <file\|->` | Give the whole input as JSON from a file or standard input |
| `--output <file>` | Where to save an image result, such as `chart get-image` |
| `--help`, `-h` | Help |
| `--version` | Version |

## Confirmation

Operations with high risk (publishing, deleting and so on; see the RISK column of `expl tools list`) ask first.

| Situation | What happens |
|---|---|
| In a terminal, without `--yes` | `Continue? [y/N]`; `y` or `yes` (any case) runs it, anything else cancels (exit code 1) |
| Not in a terminal, without `--yes` | Nothing runs; exit code 2 |
| With `--yes` | `expl` runs without asking |

`--yes` skips only the question from `expl` itself. Exploratory Desktop also asks you to confirm before it runs a high-risk call. You can skip that in **System Settings > MCP / CLI** with the two switches **Run changes, deletions and publishing without asking** and **Run code and AI processing without asking**. A run with nobody at the keyboard (CI, for example) needs these settings.

## Long operations

By default `expl` waits until the operation finishes, however long it takes, and writes progress to standard error. Give `--timeout <seconds>` to set an overall limit. With `--no-wait` it prints the `execution_id` and `operation_id` at once; check later with `expl execution get <execution_id> --operation-id <operation_id>`. Ctrl+C while waiting cancels the operation (exit code 130).

## Output

Standard output carries the result; progress, warnings, the confirmation and errors go to standard error. The exception is `--json`: a failure is then printed on standard output as `{"success": false, "error_code": ..., "message": ...}`. The text `expl` writes itself follows the language of Desktop (`expl lang ja` or `expl lang en`); The structure of the `--json` output and its `error_code`, the exit codes and the flag names do not depend on it; the `message` text in JSON does.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | The operation failed, a confirmation was declined, or a timeout |
| 2 | Wrong usage: an unknown flag, unreadable JSON, a missing `--yes` outside a terminal |
| 3 | Desktop or Server cannot be reached |
| 4 | Authentication or permission |
| 130 | Interrupted with Ctrl+C |

A reader closing the pipe (`expl ... | head -1`) is not an error and exits with 0.

## Troubleshooting

| Symptom | What to do |
|---|---|
| `expl: command not found` | Open a new terminal; see the [install guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.md) |
| Exit code 3 | Start Exploratory Desktop and try again |
| Exit code 4 | Sign in to Exploratory Desktop, approve the request for `expl` that Desktop shows, or turn on **Enable CLI** in **System Settings > MCP / CLI** |
| `PROJECT_NOT_OPEN` | Open the project: `expl project open <id>` |
| Odd results | Add `--verbose` |
