# browser-prime-toolkit

大きな半素数をブラウザ内で高速に分解することを目標に開発する非公開リポジトリです。
native BigInt と限定 MPQS/WASMに加え、別の評価用bundleでGMP低位Brent・ECMを実装しています。
予算・取消付きWorkerと比較harnessを持ち、従来Rhoは1/2/4本、64MiB候補は128MiB枠内の1/2本を評価します。
公開する最終エンジンは未確定です。[採否と本人判断点](docs/architecture/engine-selection-closeout.md)を整理し、設計探索を区切ります。
[非公開standalone UI](docs/operations/private-ui.md)は全桁・指数表示とコピーを備えます。React の製品画面、サイト用アダプター、公開配布は後続です。

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

PR6は[保守的selectorと新6問holdout](docs/benchmarks/llm01-selection-holdout.md)を追加します。selectorは実行計画の提案で、公開用schedulerや最適方式の保証ではありません。

[Full SIQSの独立private評価](docs/architecture/full-siqs-source-review.md)はmsieve1.53の大行列Lanczosを使います。既存UI/profile・公開配布は変更しません。[操作](docs/operations/full-siqs.md)と[検証記録](docs/operations/stage13-tdd-evidence.md)を参照してください。

Stage17: [pinned SIMD SIQS results and limits](docs/benchmarks/llm01-rusqsieve.md), [contract](docs/contracts/rusqsieve-evaluation.md), [current-method context](docs/architecture/current-siqs-methods.md). RSA-100 remains incomplete in the measured600s conditions; publication and CI are separate decisions.
