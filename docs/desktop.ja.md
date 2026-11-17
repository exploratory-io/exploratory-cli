# Exploratory Desktop

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.md)

このページのコマンドは、同じコンピューターで起動していてログイン済みの Exploratory Desktop を、AI エージェントと同じ接続方法で操作します。`expl` 自身にログインの仕組みはありません。Desktop が `~/.exploratory/agent/` に書いた接続先を、`expl` が読みます。初回は Desktop に `expl` を許可するかどうかの確認が表示されるので、アプリで許可してください（`expl` は最長 2 分待ちます）。認証情報を保存するのは `expl` 自身です。macOS と Linux では OS のキーチェーンに保存します（キーチェーンが使えない環境では、`~/.exploratory/agent/` の下に権限 0600 のファイルとして保存します）。Windows では、OS が保護するファイルに保存します。以後の実行では、もう確認されません。自分で用意した認証情報を使うときは、環境変数 `EXPLORATORY_AGENT_TOKEN` にペアリング済みの認証情報（`expc_` で始まります）を設定します。別の Exploratory のホームフォルダを使うときは `EXPLORATORY_HOME` を設定します。

Desktop の**システム設定 > MCP / CLI** で、**CLI を有効にする**をオンにします。**作成、変更、削除を許可する**がオフのときは、`expl` は読み取りだけができます。CLI が無効のときは、`expl` は終了コード 4 で終わります。

Desktop が起動していないと、`expl` はそのことを伝えて終了コード 3 で終わります。`expl --help` は Desktop がなくても使えます。

## コマンド

コマンドは `expl <名詞> <動詞>` の形で、起動中の Desktop が提供するツールから作られます。すべてのコマンドは `expl tools list`、1 つのコマンドのフラグは `expl tools describe <command>` で確認できます。

```bash
expl status
expl project list
expl project use "Sales Analysis"
expl dashboard get d123 --json
```

ID をちょうど 1 つ必要とするコマンドは、最初の引数として ID を受け取ります。必要な ID が足りないときは、見つかった候補を一覧にして終了コード 2 で終わります。プロジェクトを必要とするコマンドは、1 つのプロジェクトに対して動きます。指定は `--project`、環境変数 `EXPL_PROJECT`、`expl project use` で選んだプロジェクトの順に優先されます。プロジェクトは Desktop で開いている必要があります。

組み込みのコマンドは、`status`、`tools list`、`tools describe`、`call <tool_name>`、`project use`、`lang`、`skill`、`completion`、`server ...`、`help` です。

## 引数の渡し方

| 入力の種類 | 渡し方 | 例 |
|---|---|---|
| 文字列、数値、選択肢 | `--kebab-case <value>` | `--title "Sales 2026"` |
| 真偽値 | `--flag` または `--no-flag` | `--include-data` |
| 値のリスト | フラグを繰り返す | `--tag sales --tag weekly` |
| オブジェクト、オブジェクトのリスト | JSON 文字列か `@file` | `--pages @pages.json` |
| 長い文章 | `@file` | `--content @report.md` |

入力全体を JSON で渡すには、`--input <file>` か `--input -`（標準入力）を使います。`--input` と同時に指定したフラグが優先されます。未知のフラグはエラー（終了コード 2）で、近い名前を提案します。

## 共通フラグ

コマンドの前でも後ろでも指定できます。

| フラグ | 内容 |
|---|---|
| `--project <id\|name>` | 対象のプロジェクト |
| `--json` | ツールが返した結果を JSON で出力する |
| `--yes`、`-y` | 取り消しにくい操作の確認を省く |
| `--no-wait` | 時間のかかる操作を待たず、ID を出力して終了する |
| `--timeout <seconds>` | 待つ時間の上限。指定しない場合、ツール呼び出しの応答は最長 120 秒待ち、時間のかかる操作の完了待ちには全体の上限がありません |
| `--quiet`、`-q` | 進捗を出力しない |
| `--verbose` | 送受信した内容を標準エラーに出力する（トークンは出力しない） |
| `--input <file\|->` | 入力全体を、ファイルまたは標準入力の JSON で渡す |
| `--output <file>` | `chart get-image` など、画像の結果の保存先 |
| `--help`、`-h` | ヘルプ |
| `--version` | バージョン |

## 確認

リスクの高い操作（パブリッシュや削除など。`expl tools list` の RISK 列で確認できます）は、実行前に確認します。

| 状況 | 動き |
|---|---|
| ターミナルで `--yes` なし | `Continue? [y/N]` と聞き、`y` または `yes`（大文字小文字は問わない）で実行、それ以外は中止（終了コード 1） |
| ターミナル以外で `--yes` なし | 何も実行せず、終了コード 2 |
| `--yes` あり | `expl` は確認せずに実行 |

`--yes` が省くのは、`expl` 自身の確認だけです。Exploratory Desktop も、リスクの高い呼び出しを実行する前に確認します。**システム設定 > MCP / CLI** の 2 つのスイッチ「削除・パブリッシュ・設定の変更を確認なしで実行する」「コード実行・AI処理を確認なしで実行する」で省けます。CI など人がいない実行では、この設定が要ります。

## 時間のかかる操作

既定では、時間がかかっても操作が終わるまで待ち、進捗を標準エラーに出力します。全体の上限を決めたいときは `--timeout <seconds>` を付けます。`--no-wait` を付けると、`execution_id` と `operation_id` をすぐ出力して終わります。あとで `expl execution get <execution_id> --operation-id <operation_id>` で確認してください。待っている間に Ctrl+C を押すと操作を取り消します（終了コード 130）。

## 出力

標準出力には結果を出します。進捗、警告、確認、エラーは標準エラーに出ます。例外は `--json` で、失敗は標準出力に `{"success": false, "error_code": ..., "message": ...}` の形で出力されます。`expl` 自身が書く文章は Desktop の言語に従います（`expl lang ja` または `expl lang en`）。`--json` の出力の構造と `error_code`、終了コード、フラグ名は言語の影響を受けません。JSON の中の `message` の文章は影響を受けます。

## 終了コード

| コード | 意味 |
|---|---|
| 0 | 成功 |
| 1 | 操作の失敗、確認の拒否、またはタイムアウト |
| 2 | 使い方が正しくない（未知のフラグ、読めない JSON、ターミナル以外での `--yes` 忘れ） |
| 3 | Desktop または Server に接続できない |
| 4 | 認証または権限のエラー |
| 130 | Ctrl+C で中断した |

出力先のパイプが閉じられた場合（`expl ... | head -1`）はエラーではなく、終了コード 0 で終わります。

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| `expl: command not found` | 新しいターミナルを開く。[インストールガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.ja.md)も参照 |
| 終了コード 3 | Exploratory Desktop を起動して、もう一度実行する |
| 終了コード 4 | Exploratory Desktop にログインする。Desktop に表示された `expl` の許可の確認に応じる。または**システム設定 > MCP / CLI** で **CLI を有効にする**をオンにする |
| `PROJECT_NOT_OPEN` | プロジェクトを開く: `expl project open <id>` |
| 結果がおかしい | `--verbose` を付けて確認する |
