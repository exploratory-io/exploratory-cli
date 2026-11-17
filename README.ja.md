# Exploratory CLI（`expl`）

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/README.md) | [日本語](https://github.com/exploratory-io/exploratory-cli/blob/main/README.ja.md)

## 概要

`expl` は Exploratory のコマンドラインツールです。AI エージェントが使っている操作を、ターミナルやシェルスクリプト、CI から実行できます。Exploratory Server（exploratory.io）と Exploratory Desktop のどちらにも使えます。

**Exploratory Desktop をお使いなら、`expl` はすでに入っています。** アプリに同梱されていて、`expl server` も含まれるため、このパッケージは不要です。このパッケージは Desktop を使わない方、つまり Server だけを使う方、CI やサーバーで動かしたい方のためのものです。

## インストール

Node.js 20 以上が必要です。

```bash
npx @exploratory/cli@<version> --version
npm install -g @exploratory/cli@<version>
```

パッケージ名は `@exploratory/cli` で、入るコマンドは `expl` です。`<version>` には使いたい版を指定してください。Desktop をお使いの方や、2 つの `expl` が入っている方は、先に[インストールガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.ja.md)を読んでください。

## Exploratory Server にログインする

```bash
expl server login
```

ブラウザが開き、このコンピューターにトークンが保存されます。ブラウザのない環境では `expl server login --no-browser` を実行し、求められたらリダイレクト先の URL を貼り付けます。`https://exploratory.io` 以外のサーバーを使うときは、`--url` を付けるか、環境変数 `EXPL_SERVER_URL` を設定します。

## 最初に試すコマンド

```bash
expl server status
expl server tools list
expl server search "sales"
expl server fetch <id> --json
```

`expl server tools list` で、サーバーが提供するコマンドをすべて確認できます。

## CI で使う

ログイン済みのコンピューターで、トークンを 1 つ作ります。

```bash
expl server token create --name ci
```

作ったトークンをシークレットに登録し、`EXPL_SERVER_TOKEN` で渡します。Account Settings > API Keys で作った API キーも、同じように渡せます。GitHub Actions では次のように書きます。ファイル全体は [examples](https://github.com/exploratory-io/exploratory-cli/tree/main/examples) にあります。

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx @exploratory/cli@<version> server fetch <id> --json
  env:
    EXPL_SERVER_TOKEN: ${{ secrets.EXPL_SERVER_TOKEN }}
```

## Exploratory Desktop と使う

`expl project list` や `expl chart get` などのコマンドは、同じコンピューターで動いている Exploratory Desktop に接続します。Desktop が起動していてログイン済みである必要があります。起動していないと終了コード 3、ログアウト中、権限がないとき、Desktop で CLI が無効になっているときは終了コード 4 で終わります。引数の指定方法や、実行前の確認、フラグは [Desktop ガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)を見てください。

## AI エージェントから使う

エージェントは、自分のシェルから `expl` を実行できます。Claude Code や Codex に使い方を教えるには、`expl` が出力するスキルを保存します。

```bash
mkdir -p ~/.claude/skills/exploratory-expl
expl skill > ~/.claude/skills/exploratory-expl/SKILL.md
```

Exploratory Server 向けのスキルは `expl server skill` で出力できます。接続先の情報を含まない基本版の 2 つのスキルは [skills](https://github.com/exploratory-io/exploratory-cli/tree/main/skills) にあります。MCP で使いたい場合は [Exploratory のプラグイン](https://github.com/exploratory-io/exploratory)を使ってください。詳しくは[エージェント向けガイド](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.ja.md)にあります。

## 終了コード

| コード | 意味 |
|---|---|
| 0 | 成功 |
| 1 | 操作が失敗した |
| 2 | 使い方が正しくない |
| 3 | Desktop または Server に接続できない |
| 4 | 認証または権限のエラー |
| 130 | Ctrl+C で中断した |

## ドキュメント

- [インストール](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.ja.md)
- [Exploratory Server](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.ja.md)
- [Exploratory Desktop](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)
- [AI エージェント](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/agents.ja.md)
- [exploratory.io の Exploratory CLI のページ](https://exploratory.io/cli)

## 送信・記録されるもの

`expl` 自体は利用状況の計測を送りません。通信する相手は、お使いのコンピューターの Exploratory Desktop と、ログインした Exploratory Server だけです。

- **Exploratory Desktop**: コマンドは、コンピューターの中の通信で Desktop に送られます。Desktop は道具の呼び出しごとの記録（道具の名前、引数の名前（値は含まない）、結果、処理時間）をコンピューターの中に保存し、90 日で削除します。また、サインインしていて AI 機能がオンのときは、Desktop MCP と同じく、道具の呼び出しごとに利用記録を 1 件、サインインしている exploratory.io のサーバーへ送ります（ローカルのデータカタログの道具では送りません）。記録には、道具の名前と引数（入力した式や値が入ることがあります）、成功したかどうかとエラーの種類・メッセージ、結果の大きさ（中身は含みません）、処理時間、Desktop の版、クライアントの名前と版、セッションとアイテムの ID が入ります。
- **Exploratory Server（`expl server`）**: サーバーは次のものを記録します。AI アプリが MCP で Exploratory に接続したときも同じです。
  - **トークン**: 平文ではなくハッシュで保存し、作成日時、有効期限、最終使用日時を記録します。Connected AI Apps で確認・失効できます。
  - **データアクセスログ**: アイテム、ユーザー ID とメールアドレス、経路（`cli`）、操作、クライアント名、IP アドレス、結果とエラーコード、処理時間。保持期間は既定で 90 日です（サーバーの設定で 1〜400 日）。
  - **サーバーのログ**: 道具の呼び出しごとの記録（メールアドレス、クライアント、結果、行数、処理時間）と、トークンの作成・削除。
  - **失敗した呼び出しのエラー**: 時刻、道具の呼び出し、エラーの内容を、製品の改善のために収集します。

## バージョン

このパッケージは 1.0.0 から始まる独自の版を持ちます。中身は Exploratory Desktop のリリースに入っている `expl` から取り出したもので、どの Desktop の版から取り出したかは[変更履歴](https://github.com/exploratory-io/exploratory-cli/blob/main/CHANGELOG.md)に書きます。Server に新しいツールが加わっても、コマンドの一覧は実行のたびにサーバーから取得するため、CLI の更新は要りません。

## サポートとセキュリティ

質問や不具合の報告先は [SUPPORT.md](https://github.com/exploratory-io/exploratory-cli/blob/main/SUPPORT.md) を見てください。脆弱性は [SECURITY.md](https://github.com/exploratory-io/exploratory-cli/blob/main/SECURITY.md) の窓口へ連絡し、公開の Issue には書かないでください。

## ソースについて

`expl` のソースは Exploratory Desktop と一緒に開発していて、このリポジトリにはありません。ここにあるのは、公開しているパッケージ、ドキュメント、リリース前の検査です。ドキュメントを直す Pull Request は歓迎します。CLI の不具合は Issue で報告してください。

ライセンス: MIT
