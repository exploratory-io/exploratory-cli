# AI エージェント

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.md)

シェルのコマンドを実行できる AI エージェントは、`expl` をそのまま使えます。MCP の設定は要りません。

## スキルで使い方を教える

`expl` は、コマンドの使い方をまとめた `SKILL.md` を出力します。これを、お使いのエージェントがスキルを読む場所に保存してください。Claude Code の場合は次のとおりです。

```bash
mkdir -p ~/.claude/skills/exploratory-expl
expl skill > ~/.claude/skills/exploratory-expl/SKILL.md

mkdir -p ~/.claude/skills/exploratory-expl-server
expl server skill > ~/.claude/skills/exploratory-expl-server/SKILL.md
```

`expl skill` は Exploratory Desktop 向け、`expl server skill` は Exploratory Server 向けです。Desktop やサーバーに接続できるときは、出力に接続先の最新の案内も加わるので、できるだけこのコマンドを使ってください。

[skills](https://github.com/exploratory-io/exploratory-cli/tree/main/skills) フォルダには、接続先の情報を含まない基本版のスキルがあります。`expl` を入れる前に中身を読みたいとき、またはスキルだけ先に置きたいときに使います。基本版のスキルとバンドルが食い違うと、このリポジトリの検査が失敗します。

## エージェント向けのヒント

- `--json` を付けて、終了コードを確認します。終了コードの表は [Desktop ガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)と [Server ガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.ja.md)にあります。
- ターミナル以外では、リスクの高い操作は `--yes` がないと何も実行せず、終了コード 2 で終わります。`--yes` は、実行すると決めた操作にだけ付けてください。
- コマンド名を推測せず、`expl server tools list` や `expl tools list` で使えるものを確認します。

## `expl` とプラグインの使い分け

| やりたいこと | 使うもの |
|---|---|
| スクリプト、CI、シェルで動くエージェント | `expl` |
| MCP で動くエージェント | [Exploratory のプラグイン](https://github.com/exploratory-io/exploratory) |
