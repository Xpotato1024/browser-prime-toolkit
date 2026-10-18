# browser-prime-toolkit

大きな半素数をブラウザ内で高速に分解することを目標に新規開発する非公開リポジトリです。
WASM・多倍長ライブラリ・アルゴリズムを評価し、端末と時間予算ごとの実測限界を示します。
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
