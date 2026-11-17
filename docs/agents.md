# AI agents

[日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.ja.md)

An AI agent that can run shell commands can use `expl` directly. No MCP setup is needed.

## Teach the agent with a skill

`expl` prints a `SKILL.md` that describes itself. Save it where your agent reads skills. For Claude Code:

```bash
mkdir -p ~/.claude/skills/exploratory-expl
expl skill > ~/.claude/skills/exploratory-expl/SKILL.md

mkdir -p ~/.claude/skills/exploratory-expl-server
expl server skill > ~/.claude/skills/exploratory-expl-server/SKILL.md
```

`expl skill` is for Exploratory Desktop and `expl server skill` is for Exploratory Server. When `expl` can reach Desktop or the server, the output also carries the latest guidance from it, so prefer these commands.

The [skills](https://github.com/exploratory-io/exploratory-cli/tree/main/skills) folder holds copies made from the bundle without any connection. Use them to read the skill before installing `expl`, or to place the skill first. A check in this repository fails when the copies and the bundle differ.

## Tips for agents

- Use `--json` and read the exit code. See the exit code tables in the [Desktop guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md) and the [Server guide](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.md).
- Outside a terminal, operations with high risk do nothing without `--yes` (exit code 2). Add `--yes` only for an operation you have decided to run.
- Run `expl server tools list` or `expl tools list` to see what is available instead of guessing command names.

## `expl` or the plugin

| You want | Use |
|---|---|
| Scripts, CI, a shell-based agent | `expl` |
| An agent that works through MCP | the [Exploratory plugin](https://github.com/exploratory-io/exploratory) |
