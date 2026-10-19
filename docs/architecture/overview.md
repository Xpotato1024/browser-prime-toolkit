# 構成と実装段階

src/coreとsrc/engineはbrowser非依存のESM、src/workerはcontrollerと同梱sourceを扱います。
初回は入力パーサーと因数集約のみです。ブラウザと Node の両方で BigInt を使えます。
計算engineの最終選定は別で、[半素数の性能評価](performance-plan.md) を行います。
コア・Worker controller・React adapterは[既存サイト形式](../contracts/site-adapter.md)に沿って分離します。

native比較基準の計算とWorker protocolを実装しました。高度方式/WASMとReact表示層・site adapterは後続です。
[計算契約](../contracts/factor-worker.md)と[実測](../benchmarks/llm01-baseline.md)を参照してください。
Worker は一度に1件とし、要求・応答に job ID と提出時入力を保持します。
取消・期限超過は Worker の terminate と再生成で停止します。再生成後の初期化完了まで投入しません。
経過時間だけでなく操作予算も持ち、残余があれば未完了として返します。
実際の素数証明範囲・方式と確率表示は、アルゴリズム選定時に一次資料とテストで固定します。

全 asset をローカルに固定し、準備完了後の計算通信はゼロとします。
将来の画面は textContent / React とネイティブ上付き表示を使います。
公開前に通信記録、offline一致、取消・競合、境界、ブラウザ互換性を検証します。

既存 xpotato-site の現行ツールプロファイルは Worker / WASM / clipboard を許可していません。
この独立ツールを組み込むには、別途 capability / CSP の設計審査が必要です。
本リポジトリの作業で既存サイトの設定や PR110 は変更しません。
