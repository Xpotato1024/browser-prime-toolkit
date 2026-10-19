# browser-prime-toolkit

大きな半素数をブラウザ内で高速に分解することを目標に開発する非公開リポジトリです。
現在は native BigInt の比較基準エンジン、予算・取消付き Worker、ローカル検証 harness を実装しています。
最終エンジンは未選定です。WASM・多倍長ライブラリ・高度な方式の比較を続けます。
React の製品画面、サイト用アダプター、公開配布は未実装です。

## 開発
Node.js 24.19.0 / npm 11.19.0 を使用します。

```sh
npm ci
npm test
npm run check
CHROME_BIN=google-chrome npm run verify:browser
CHROME_BIN=google-chrome npm run benchmark:browser -- --out /tmp/prime-browser.json
```

第三者依存はありません。公開ライセンスは未選定です。
[文書一覧](docs/README.md)、[計算・Worker契約](docs/contracts/factor-worker.md)、
[実測と限界](docs/benchmarks/llm01-baseline.md)を参照してください。
