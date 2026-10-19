# browser-prime-toolkit

大きな半素数をブラウザ内で高速に分解することを目標に開発する非公開リポジトリです。
native BigInt と限定 MPQS/WASMに加え、別の評価用bundleでGMP低位Brent・ECMを実装しています。
予算・取消付きWorkerと比較harnessを持ち、従来Rhoは1/2/4本、64MiB候補は128MiB枠内の1/2本を評価します。
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

npmの追加runtime依存はありません。msieveの公開ドメインsubset、GMP/ECMの固定原本と再現build、Emscripten runtimeの原本hash・変更・通知を記録しています。真のSIQSは有界GF(2) adapterと最小実行を評価し、上流Lanczos全体とは区別します。アプリの公開ライセンスは未選定です。
[GMP/ECM原本・配布境界](docs/architecture/gmp-ecm-source-review.md)、[文書一覧](docs/README.md)、[計算・Worker契約](docs/contracts/factor-worker.md)、
[初回実測](docs/benchmarks/llm01-baseline.md)、[WASM・並列比較](docs/benchmarks/llm01-wasm-mpqs.md)、[候補とAPI調査](docs/architecture/advanced-factorization-candidates.md)を参照してください。

[低位GMP/ECMの実測](docs/benchmarks/llm01-gmp-ecm.md)ではnative Brentを対照とし、GMP Brentの非改善とECMの成功・失敗をともに記録しています。
[有界SIQS・ECM stage2/RAM評価](docs/benchmarks/llm01-bounded-siqs.md)ではSIQSの1秒打切りと、ECMのfatal Worker退役・実Chrome process treeの標本RAMを記録します。
