# Exploratory Server

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.md)

`expl server` は、Exploratory Desktop を使わずに Exploratory Server（exploratory.io）のツールを呼び出します。

## ログイン

```bash
expl server login
expl server status
expl server logout
```

`login` はブラウザを開きます。対話的でないターミナルでは、ブラウザを開かずに URL を表示します。`--no-browser` を付けると、URL を自分で開き、移動先のリダイレクト URL を貼り付けて戻します。トークンは `~/.exploratory/expl/server/` にホストごとのファイルとして保存されます（権限 0600。Windows は `%USERPROFILE%\.exploratory\expl\server\`）。保存したログイン情報は、同じオリジン（スキーム、ホスト、ポート）でだけ使われます。標準ポートでは、同じホストへ後からログインすると、保存内容が置き換わります。

サーバー側（Connected AI Apps など）でトークンを失効させると、次の呼び出しは終了コード 4 で終わり、`expl server login` を案内します。`expl server logout` が消すのは保存したコピーだけです。`--with-token` で保存した API キーは、Account Settings > API Keys で失効させるまで使えます。

### `--no-browser` でのログイン

リモートのサーバーなど、`expl` がブラウザを開けない環境で使います。

1. `expl server login --no-browser` を実行します。`https://exploratory.io/oauth/authorize?` で始まる URL が表示され、入力待ちになります。
2. その URL をブラウザで開き、ログインして許可します。
3. ブラウザは「このサイトにアクセスできません」のような画面に移ります。これで正しい動きです。
4. そのときのアドレス欄の URL をコピーします。`http://127.0.0.1/callback?code=` で始まるものです。手順 1 で表示された URL ではありません。
5. ターミナルに貼って Enter を押します。`Logged in to ... as ...` と出ればログインできています。

この URL に入っているコードは一度しか使えず、ブラウザがその画面に移ってから 60 秒で切れます。すぐに貼り付けてください。失敗したら手順 1 からやり直してください。

## CI 用のトークンと API キー

```bash
expl server token create --name ci
expl server token create --name ci --expires 90
expl server token list
expl server token revoke ci
```

`token create` には、`expl server login` で作ったログインが必要です。`--expires <days>` で、トークンの有効日数を指定します。

トークン、または API キー（Account Settings > API Keys で作ります。`exp_pat_` で始まります）は、環境変数 `EXPL_SERVER_TOKEN` で渡します。`--token` フラグは廃止されました。`expl server` に付けると拒否され、終了コード 2 で終わります。

以後の呼び出しのために API キーを保存するには、`expl server login --with-token` を実行します。キーは画面に表示せずに尋ねられるか、標準入力から読み込まれます。`--no-browser` とは一緒に使えません。優先順位は、`EXPL_SERVER_TOKEN`、`expl server login`（または `--with-token`）が保存した内容の順です。

## サーバーの URL

優先順位は、`--url`、`EXPL_SERVER_URL`、保存済みのログイン情報が最新のホスト（トークンの更新でも新しくなります）、`https://exploratory.io` の順です。

## Server 専用のフラグ

| フラグ | 内容 |
|---|---|
| `--url <url>` | 呼び出すサーバー |
| `--with-token` | `login` と一緒に使い、標準入力から読んだ（または画面に表示せずに尋ねた）API キーを保存する |
| `--output <file>`、`-o <file>` | データフレームのエクスポートやチャート画像など、ファイルの結果の保存先 |
| `--no-browser` | ログイン時にブラウザを開かない |

`expl server` では `--project` を使いません。ほかの共通フラグは [Desktop ガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)と同じです。`--timeout` は、サーバーへの HTTP リクエスト 1 回の上限時間です（既定は 300 秒）。

## コマンド

利用できるコマンドは `expl server tools list` で確認できます。一覧は実行のたびにサーバーから取得します。`search` と `fetch` には動詞が付きません。`expl server search <query>`、`expl server fetch <id>` の形で使います。

出力は、既定では人が読みやすい形です。一覧は表、`fetch` は本文、最後に URL が出ます。`--json` を付けると、サーバーの結果を JSON のまま出力します。

```bash
expl server search "sales"
expl server fetch <id> --json
```

## CI で使う

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx @exploratory/cli@<version> server fetch <id> --json
  env:
    EXPL_SERVER_TOKEN: ${{ secrets.EXPL_SERVER_TOKEN }}
    EXPL_SERVER_URL: https://exploratory.io
```

完全なファイル: [GitHub Actions](https://github.com/exploratory-io/exploratory-cli/blob/main/examples/github-actions.yml)、[Bitbucket Pipelines](https://github.com/exploratory-io/exploratory-cli/blob/main/examples/bitbucket-pipelines.yml)

## 終了コード

| コード | 意味 |
|---|---|
| 0 | 成功 |
| 1 | 操作が失敗した |
| 2 | 使い方が正しくない |
| 3 | サーバーに接続できない（ネットワーク、HTML のエラーページなど） |
| 4 | 未ログイン、またはトークンが拒否された |
| 130 | Ctrl+C で中断した |
