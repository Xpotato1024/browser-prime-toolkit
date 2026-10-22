# LLM-01: 低位GMP Brent・ECMの比較

測定日: 2026-10-19T02:47:36.369Z。測定コード: 5be4db3baf59d4ce9ae8f9d56cc6c3a281ea158f。
[raw JSON](llm01-gmp-ecm.json) SHA256: bb930f17926beee9d872fd95d255fb98a494080c58b19cc3aff71e0f64e7deea。

低位GMP Brentは今回のbridgeでnative Brentを上回りませんでした。ECMは大きい因数で有望ですが、112bitでは失敗が残り、最終engineの選定ではありません。

## 同一入力・予算の結果

各セルは完了数/試行数 / 完了時warm中央値msです。失敗を除いた中央値だけで方式を評価しません。

| 入力群 | 予算ms | native Brent | GMP Brent | ECM |
| --- | ---: | ---: | ---: | ---: |
| 10桁因数×2 | 100 | 8/8 / 18.75 | 8/8 / 20.20 | 8/8 / 10.80 |
| 10桁因数×2 | 1000 | 8/8 / 17.80 | 8/8 / 19.65 | 8/8 / 9.05 |
| 13桁因数×2 | 100 | 0/8 / — | 0/8 / — | 8/8 / 25.05 |
| 13桁因数×2 | 1000 | 8/8 / 640.50 | 8/8 / 758.65 | 8/8 / 24.95 |
| 96bit入力 | 100 | 0/4 / — | 0/4 / — | 3/4 / 22.10 |
| 96bit入力 | 1000 | 0/4 / — | 0/4 / — | 4/4 / 35.70 |
| 112bit入力 | 100 | 0/4 / — | 0/4 / — | 0/4 / — |
| 112bit入力 | 1000 | 0/4 / — | 0/4 / — | 2/4 / 279.00 |

controlの1秒結果も示します。M127は2^127−1で、runtimeのMR-fixed7に通ったprobable余因子です。M127の素数証明・誤り確率上限は付けません。

| control | native Brent | GMP Brent | ECM |
| --- | ---: | ---: | ---: |
| 101×13桁 | 2/2 / 0.45 | 2/2 / 0.35 | 2/2 / 5.45 |
| 13桁平方 | 2/2 / 0.35 | 2/2 / 0.50 | 2/2 / 0.50 |
| 近接13桁因数 | 1/2 / 584.00 | 1/2 / 722.10 | 2/2 / 15.05 |
| 10桁×M127 | 2/2 / 30.55 | 2/2 / 39.20 | 2/2 / 28.05 |
| 13桁×M127 | 0/2 / — | 0/2 / — | 2/2 / 54.60 |

M127の行は全成功がprobable、他の完了はcompleteです。112bit ECMの1秒未完了2件は32曲線のalgorithm-exhausted、100msの未完了はtime-budgetです。予算延長だけで曲線数は増えません。

GMP Brentは固定scratch・mpz_mod・mpz_gcdを使いますが、各stepのJS checkpointもあります。遅さの原因をCPU profileで分離しておらず、GMP自体の性能限界とは扱いません。checkpoint batchingは操作上限・停止粒度の契約を再検証する次候補です。

PR3の限定MPQS結果は[以前の記録](llm01-wasm-mpqs.md)を再利用します。13桁群はMPQSも速い一方、10桁群には多項式数上限で失敗する入力がありました。ECMの有利な行だけでMPQS/真SIQSの代替と判断しません。

## 独立Workerの費用

対象はbalanced-13-0とunbalanced-10digit-m127、seed開始1/11です。各行4試行、曲線/seedはlaneごとに分けます。

| 方式 | 本数 | 予算ms | 完了/試行 / warm中央値ms | 初期化中央値ms | 待機再生成中央値ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| gmp-brent | 1 | 100 | 2/4 / 46.35 | 48.50 | 48.60 |
| gmp-brent | 1 | 1000 | 4/4 / 126.40 | 48.00 | 48.25 |
| gmp-brent | 2 | 100 | 2/4 / 29.40 | 53.00 | 48.60 |
| gmp-brent | 2 | 1000 | 4/4 / 107.95 | 50.55 | 48.30 |
| gmp-ecm | 1 | 100 | 4/4 / 52.95 | 48.30 | 48.25 |
| gmp-ecm | 1 | 1000 | 4/4 / 52.70 | 48.30 | 48.25 |
| gmp-ecm | 2 | 100 | 4/4 / 33.75 | 50.50 | 49.05 |
| gmp-ecm | 2 | 1000 | 4/4 / 32.70 | 50.35 | 50.80 |

初期化と再生成はwarm欄に含みません。現在のharnessはpool前に単体Workerをdisposeし、全lane終了後に再生成します。総操作枠50Mを分配し、共有壁時計予算+100ms猶予、全終了経路でdisposeします。1/2本の線形メモリは64/128MiB、3本以上はこの候補profileで拒否します。終了済みWorkerのGC、JS heap、browser全体のpeak RAMは未測定です。2本を製品の既定値にはしません。

## 条件と検証範囲

- 旧PR3の11問・検証済み因数をそのまま再利用。新balanced96/112bitを各2問、新unbalancedを2問追加しました。新balancedの8因数は独立C uint64総当たりで計測外に証明しました。
- 全17問×3方式×2予算×2seed(1/11)=204単体計算、pool32計算です。旧342単体+72poolの長時間試験は再実行していません。
- warmはready後の入力受付・共通前処理・計算・配送・検算を含み、C arithmeticだけのmicrobenchmarkではありません。操作checkpoint数は方式間で同じCPU仕事量を意味しません。
- Chrome/155.0.8059.39 / V8 15.5.35.20、WSL2 Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz、logical CPU 6、RAM 10429259776 bytes。電源状態・peak heap・mobileは未測定です。方式順はbrent→gmp-brent→gmp-ecmで無作為化しておらず、少数ケース・2seedの局所比較です。
- localhostの初回asset取得からreadyまで 188.26ms。候補WorkerのJS asset 623389 bytes、SHA256 58e58f567b602d7fad6d858cf31b3ed6b5a47c0e3bae6c2304f7cf3292daafbb。通常Workerのsource JSもcontroller依存として初期importされます。全転送量の測定ではありません。
- 候補の3方式は同じ64MiB WASMを初期化します。通常Workerの16MiB設定・以前のcold値と混同しません。WASM 454508 bytes、SHA256 f2a31a887ccb7bc39da55acfdcdbfdc8b676630e799f895e063e0ee112b7a130、新規container2回一致、実memory.grow拒否を確認しました。
- ready後HTTP/CDP/CSP/例外は0件。asset server停止・cache無効で両候補の計算と取消・再初期化を検証しました。Worker target自身のoffline emulationは非対応なので、page offlineとserver停止で補完します。検出器はCSP fetch・Worker CSP audit・navigation・Worker HTTPの正例でも確認しました。
- ECM取消テストのhost側cancel応答は 2.40ms、main timerは15回動きました。回数は再初期化待ちも含み、nativeのどのstageにいたか、callback最大間隔の証明ではありません。
- ASan/UBSan400停止はstage2専用検証ではありません。OOM/trapを正常なincompleteへ必ず変換できるとは主張しません。詳細は[原本・配布境界](../architecture/gmp-ecm-source-review.md)を参照してください。

真SIQSは8objectのコンパイルのみで、リンク・実行・速度測定はしていません。有界relation/matrix/savefile・checked allocation・段階別取消のadapterが次の必要作業です。GNFSは[既存判断](../architecture/advanced-factorization-candidates.md#gnfs-の採否)を維持します。

この結果は非公開の評価用Draftに限定し、公開license・site capability・CSP・製品UI・merge・deployは変更しません。
