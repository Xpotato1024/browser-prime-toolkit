# browser-prime-toolkit

ブラウザ内で動く素数判定・素因数分解ツールを新規開発する非公開リポジトリです。
現在は設計と整数入力・因数累乗表示のコアのみです。計算アルゴリズム、Worker、画面は未実装です。

## 開発
Node.js 24.19.0 / npm 11.19.0 を使用します。

```sh
npm ci
npm test
npm run check
```

第三者依存はありません。公開ライセンスは未選定です。
[文書一覧・実装段階](docs/README.md) と [開発手順](docs/operations/development.md) を参照してください。
