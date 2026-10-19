# LLM-01: 限定WASM MPQSと独立Worker比較

修正済みソース57d913c6e10edc80d1766d8c874348a98f602921で測定しました。
暫定の旧artifact測定はこの記録へ置き換えています。最終engineは未選定です。

測定UTC: 2026-10-19T01:08:22.208Z。Chrome/155.0.8059.39 / V8 15.5.35.20。
CPU: Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz、WSL logical cores=6、RAM=10429251584 bytes。
headless Linux/WSL2のデスクトップ1台のみ。電源状態・peak heap・モバイル・他browserは未測定です。

## 再現性と条件
固定xorshift32 seed 0x531f9a27で10/11/12/13桁因子を各4組生成し、計16個の異なるbalanced半素数を使います。
候補filterのMRとは別に全因子を独立した全試し割りで素数と検証してから測定します。
平方・近接因子・101の小因子の3対照を加え19case、単独342試行、並列72試行です。
100/1000ms、操作上限50,000,000。操作は方式ごとに異なるcheckpointでCPU仕事量の等価単位ではありません。
Brent/Floydはseed1/2/3、MPQSは固定seed1で3回反復します。MPQSの3回を独立乱数探索とは扱いません。
並列は10/12/13桁因子の各2組、seed起点1/11、1/2/4 Workerです。総操作上限をlane間で分割します。

## 単独Workerのbalanced群
各セルは完了数/12、完了試行だけのwall時間中央値msです。未完了を中央値へ混ぜません。
母数は4個の入力×3試行であり、全ての半素数を代表する統計的保証ではありません。

| 因子桁数 | 予算ms | Brent 完了 / median | Floyd 完了 / median | MPQS 完了 / median |
| --- | --- | --- | --- | --- |
| 10 | 100 | 12/12 / 19.25 | 1/12 / 41.90 | 6/12 / 2.30 |
| 10 | 1000 | 12/12 / 18.20 | 12/12 / 245.90 | 6/12 / 2.30 |
| 11 | 100 | 10/12 / 71.95 | 1/12 / 28.80 | 12/12 / 2.00 |
| 11 | 1000 | 12/12 / 72.80 | 6/12 / 664.75 | 12/12 / 2.00 |
| 12 | 100 | 1/12 / 35.40 | 0/12 / — | 12/12 / 2.00 |
| 12 | 1000 | 12/12 / 280.25 | 1/12 / 458.80 | 12/12 / 2.10 |
| 13 | 100 | 0/12 / — | 0/12 / — | 12/12 / 2.90 |
| 13 | 1000 | 11/12 / 655.60 | 0/12 / — | 12/12 / 2.90 |

10桁因子の一部はMPQSの20多項式制限でalgorithm-exhaustedとなります。長い時間予算だけでは解消しません。
明示MPQSモードはその失敗を未完了として返し、隠れたRho fallbackを行いません。
11〜13桁因子の今回の群ではMPQSが有望です。一般の桁数保証や一律の速度比にはしません。

## 独立Brent portfolio
各行は6個の入力×2 seed起点です。warm wallと初期化を分けて示します。

| 予算ms | Worker数 | 完了数/試行 | 成功wall median ms | 初期化 median ms |
| --- | --- | --- | --- | --- |
| 100 | 1 | 6/12 | 30.00 | 16.45 |
| 100 | 2 | 7/12 | 20.00 | 17.40 |
| 100 | 4 | 6/12 | 24.30 | 39.00 |
| 1000 | 1 | 12/12 | 119.60 | 16.40 |
| 1000 | 2 | 12/12 | 88.60 | 17.50 |
| 1000 | 4 | 12/12 | 121.40 | 42.45 |

成功集合が違う100ms行の中央値だけでspeedupを計算しません。
この端末の1秒群では2本が1本より有利でしたが、4本は初期化が増え、warm計算も短縮しませんでした。CPU競合等の要因は分離測定していません。
4本を既定にする根拠ではありません。製品用の並列UIやモバイル自動選択は未実装です。
各WorkerはWASM線形メモリ16MiBを持ちます。Rhoも同じbundleなので、4本で64MiBにJS heap等が加わります。
winning laneのoperationsを総CPU操作数とは表示しません。総allocated操作上限だけを検証します。

## artifact・通信・限界
2回のclean buildが一致したWASMは67418 bytes、SHA256 62b8f95551d8ace1cbb5faf08191a89947ccadd6cef0f572da061101ddc3b57c。
Worker JS assetは105704 bytes、SHA256 764c77932b3fd645c0afb34181ce5be5b53fb32f5132b3a22338209fefb9f895。
fresh pageから最初のreadyは104.06ms。全初期asset取得・module初期化を含み、warm計算時間とは別です。
WASMはmsieve tinyqs MPQSで、SIQSではありません。48〜85bitだけに適用し、より小さい残余はBrent、範囲超過はalgorithm-rangeです。
全結果の因子と残余を元入力に結びつけて検算し、完了因子はMR64で証明済みです。未完了は素数扱いしません。
ready後のCDP request/HTTP request/例外/CSP違反はいずれも0、配信server停止・Page offline状態のWASM同一因子と再生成も確認しました。
Worker targetのoffline emulation成功は主張しません。CDPとserver観測を併用し、最後に検出器の正検出を試験します。
delay0のWASM job取消はqueued状態を含み得ます。C実行中のbrowser強制停止の実証とは区別します。
Cの協調中断・解放はnative portable CのASan/UBSanで200回の中断、121入力、2-adic境界、stale root回帰を確認しました。
旧gmp-wasm版は静的比較のみで、再現build/license未確認の旧bundleを実行して速度比を作っていません。
低位GMP Brent、ECM、真のSIQS、GNFSは未実装・未測定で、これらより速いという結論ではありません。

再実行: npm run benchmark:browser -- --out /tmp/prime-browser.json。
[生データ](llm01-wasm-mpqs.json)、[方式・旧API・資源の採否](../architecture/advanced-factorization-candidates.md)、[ADR](../adr/0003-bounded-wasm-mpqs.md)を参照してください。
