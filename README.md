# browser-prime-toolkit

大きな半素数をブラウザ内で高速に分解することを目標に開発する非公開リポジトリです。
native BigInt と限定 MPQS/WASM、予算・取消付き Worker、1/2/4 Worker比較 harness を実装しています。
最終エンジンは未選定です。WASM・多倍長ライブラリ・高度な方式の比較を続けます。
React の製品画面、サイト用アダプター、公開配布は未実装です。

## 開発
Node.js 24.19.0 / npm 11.19.0 を使用します。

```sh
npm ci
npm test
npm run check
npm run build:wasm -- --check # 固定Docker imageで2回再現build
npm run verify:native # portable CのASan/UBSan
CHROME_BIN=google-chrome npm run verify:browser
CHROME_BIN=google-chrome npm run benchmark:browser -- --out /tmp/prime-browser.json
```

npmの追加runtime依存はありません。msieveの公開ドメインsubsetとEmscripten runtimeを固定同梱し、原本hash・変更・NOTICEを記録しています。アプリの公開ライセンスは未選定です。
[文書一覧](docs/README.md)、[計算・Worker契約](docs/contracts/factor-worker.md)、
[初回実測](docs/benchmarks/llm01-baseline.md)、[WASM・並列比較](docs/benchmarks/llm01-wasm-mpqs.md)、[候補とAPI調査](docs/architecture/advanced-factorization-candidates.md)を参照してください。
