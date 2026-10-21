# 選定済み実験エンジンのESM入口

この入口はブラウザ内の計算コア用で、サイトのReact island/manifest v1への受入完了を意味しない。旧private UIと通常入力経路を変更しない。既存の小入力Brent/staged経路はそのまま使い、2^128以上の高難度入力を明示実験モードでこの入口へ渡す。

`src/optimized/index.js`は`selectResourcePlan`、`validateResourcePlan`、`runRusqsieve`を提供する。入力は既存のcanonical decimal/最大332bit・100桁契約。raw Numberの丸めを経由しない。proven/probable/incomplete/timeout/cancelledを区別し、proper divisor・因子積・確実性を検算する。直接大入力APIは入力形状が対象外なら拒否し、0/1等の通常経路を置き換えない。

採用NativeはStage30で同一packet/列/counter/因子を確認したpacked retention + terminal collection解放 + Rust組込みu32剰余。compiled64/128/256MiB role artifactを明示し、cap128で無言の旧エンジンfallbackをしない。64/256は測定済み固定原本、128も同じpatchの2clean build一致とrole memory契約を必要とする。追加runtime依存、remote code、storage、telemetryは使わない。

自動は最大2 Worker、deviceMemory欠落時128MiB/1Workerの保守fallback。manualは1〜6 Worker、予算128/256/384/512/768MiB、coordinator128/256・helper64、6Workerはco256でWASM576MiBを明示768予算へ収める。推奨は計測で採用された構成であり、自動的にCPUを最大使用しない。8global枠は手動planで選択可能、autoは4。owner credit2、transport32/64MiB、SHA監査16MiB/8件（診断を明示した場合）。

`runRusqsieve(input,{resourcePlan,signal,onProgress})`は初期化込みの有限deadlineを共有し、取消/期限/異常で全WorkerとBlob sourceを退役させる。後から時間/仕事予算をresetしない。coordinatorのsoft-stopはrole capのlive requested62.5%またはlinear81.25%（128時80/104MiB、256時160/208MiB）。fatalの理由をsoft-stopへ上書きしない。単一呼出内の一時増加やOS tab終了の完全防止は保証しない。WASM上限と全体RSSは別。

sourceはlocal ESMとして先に全依存を取得する。以後の計算/取消/再生成は通信0を最終配布artifactで確認する。サイト側のmulti-instance admission、CSP/Worker/WASM/licenseとlong-compute profileの受入、本番切替は次工程。ブラウザ全tab/OS全体の資源上限をこのAPIが保証するとは扱わない。
