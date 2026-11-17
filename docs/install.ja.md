# インストール

[English](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/install.md)

`expl` を入れる方法は 2 つあります。どちらか一方で十分です。

## Exploratory Desktop をお使いの場合

`expl` は Exploratory Desktop に同梱されています。`expl server` も含まれるので、追加のインストールも Node.js も要りません。製品版のアプリを起動すると、`expl` が PATH に入っていなければ自動で入ります。macOS では、アプリが `/Applications` か `~/Applications` にあるときだけです。管理者の許可を求められることがあり、断ると `~/.local/bin` に入ります（必要なら、そのフォルダを PATH に追加してください）。Exploratory のものではない `expl` がすでにある場合は置き換えません。開発ビルドでは入りません。新しいターミナルを開いて、次を実行してください。

```bash
expl --version
```

## npm で入れる場合

Desktop を使わない方向けです。Exploratory Server だけを使う場合や、CI・サーバーで `expl` を動かす場合に使います。Node.js 20 以上が必要です。

```bash
npx @exploratory/cli@<version> --version
npm install -g @exploratory/cli@<version>
```

`<version>` は使いたい版に置き換えてください。スクリプトでは必ず版を固定します。パッケージ名は `@exploratory/cli` で、入るコマンドは `expl` です。名前が `expl` だけのパッケージは入れないでください。その名前は別の人のものです。

概要は exploratory.io の [Exploratory CLI のページ](https://exploratory.io/cli)にあります。

## 2 つ入っているとき

npm で入れたうえで Desktop も使っている場合は、どちらが動くかを確かめます。

```bash
which -a expl        # macOS と Linux。入っているものを全部、動く順に表示します
where expl           # Windows
expl --version
```

`expl --version` の 1 行目は `expl <版>` で、入れ方までは表示されません。どちらの `expl` かは、上で表示されたパスで見分けてください。先頭のパスが想定と違うときは、使いたい方のフォルダを PATH の先頭に置くか、もう一方を削除してください。

Desktop をお使いなら、npm で全体に入れる必要はありません（CI で版を固定して `npx` で使うのは問題ありません）。nodejs.org のインストーラーで Node.js を入れた Mac では、npm がコマンドを Desktop が普段使う `/usr/local/bin` に置こうとするため、`npm install -g` は `EEXIST` で止まります。このとき `--force` を付けて再実行しないでください。Desktop に付いている `expl` が置き換わります。逆に、npm の `expl` がすでに `/usr/local/bin` にある場合、Desktop はそれを残し、自分の `expl` は置きません。

## 削除

- npm: `npm uninstall -g @exploratory/cli`
- Desktop: PATH から `expl` のリンクか Exploratory のフォルダを外します。アプリが確認してきたときに断らない限り、次の起動でまた入ります。

## 次に読むもの

- [Exploratory Server にログインする](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/server.ja.md)
- [Exploratory Desktop と使う](https://github.com/exploratory-io/exploratory-cli/blob/main/docs/desktop.ja.md)
