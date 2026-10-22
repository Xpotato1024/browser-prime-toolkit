# LLM-01 full SIQS の有限評価
測定head: a07f66faca240af443548e5ae8fc71cf3cb4c244。固定WASM 136328 bytes、SHA256 950ab7e0bbcb585d8db13ea105265c4fdb4d4ea838e6b19db02e04b1a0cc32f5。最終headでは同じ計算・harness source hashを全rawから再検査します。

msieve1.53の独立full SIQSです。既存UI/Brent/旧128bit SIQSを変更していません。計算前にserverを停止し、全試行で通信0・Worker最大1・退役をCDP/HTTP/CSPと正対照で確認しました。WASM固定512MiB、stack4MiB、save128MiB、growth/pthreadsなし、有限1兆checkpointです。

## 均衡半素数
| 桁 | 3秒内完了 | 30秒内完了 | 180秒内完了 | 成功時の実待ち秒 min–max |
| --- | --- | --- | --- | --- |
| 40 | 4/4 | 4/4 | 4/4 | 0.215–0.228 |
| 48 | 4/4 | 4/4 | 4/4 | 0.487–0.500 |
| 56 | 4/4 | 4/4 | 4/4 | 1.825–2.133 |
| 64 | 0/4 | 4/4 | 4/4 | 19.795–20.864 |
| 72 | 0/4 | 0/4 | 4/4 | 80.105–90.330 |
| 80 | 0/4 | 0/4 | 0/4 | — |

各桁2入力×seed1/11の4組です。短枠成功を長枠の到達にも含め、未完了の組だけ最初から延長試行します。観測4/4に満たない枠は未測定を含みます。成功時間にはtimeoutを入れず、再試行の待ち時間は加算していません。これは測ったtierの小標本であり、一般的な最大桁数ではありません。

runtimeの判定はprobableを維持します。因数の積・固定MRに加え、退役後のNodeで事前固定Pocklington証明付きoracleと一致を確認しています。62入力/124素因数は測定前に固定し、実行assetはNだけです。再帰証明用の大きなp−1因子を持つ構成なので、一様な半素数標本ではありません。未記載の桁は未測定です。

## RSA100
| seed | 枠(秒) | 結果/理由 | 初期化込み実待ち秒 | 最終phase | 関係式の最終観測 |
| --- | --- | --- | --- | --- | --- |
| 1 | 30 | timeout/time-budget | 29.757 | 3 | {"total":15,"full":15,"combined":0,"partial":1601,"target":97743} |
| 1 | 600 | timeout/time-budget | 599.753 | 3 | {"total":507,"full":498,"combined":9,"partial":36638,"target":97743} |

phaseは1=base、2=poly、3=sieve、4=relation、5=matrix、6=sqrtです。full/combinedとpartialは同じ件数として加算しません。未完了から成功時間を推定しません。既知因数をWorkerへ渡していません。

## 証跡と限界
全46性能rawと10契約の1rawを[summary](llm01-staged-full-summary.json)でhash照合します。10契約には実OOM/trap、poison後再利用拒否、fresh要求回復、取消、加速host deadline、対象外のWorker割当拒否があります。加速時計試験は性能値へ混ぜません。

端末・Chrome版・source/asset hash・初期化時間・checkpoint・停止理由・Chrome process treeの標本RSS/PSSは各rawにあります。RSSは共有pageを重複計上し得て、PSSも標本です。瞬間peakやChrome全体hard capとは扱いません。旧Brent600秒timeoutとpartial matrixは[途中記録](../operations/minute-evaluation.md)へ保存し、別方式・別corpusの時間を同一入力の速度比へ変換しません。

公開license採用、製品UI/site統合、Ready、merge、deployは未実施です。Alpertronは別候補として保全し、未計測の速さで除外しません。
