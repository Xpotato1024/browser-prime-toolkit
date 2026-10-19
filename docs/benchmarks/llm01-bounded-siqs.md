# LLM-01: 有界SIQSとECM stage2の評価

有界SIQSの最小実行・停止・回復は成立しましたが、この実装は1秒枠の一般半素数を完了できず、性能上の採用根拠にはなりません。ECMは同じ比較で優勢ですが、112bitの未完了が残ります。最終engineの決定ではありません。

測定コード: 8e865d74252bfd17ba1d9b245184656161336f3b、日時: 2026-10-19T05:03:35.119Z。
[raw JSON](llm01-bounded-siqs.json) SHA256 6dc07ad18137a926850d3490f6bf70f387ddc90d07e1c54dd8d199dcade67375。

## 同じ対応域・予算の比較

固定17問×2方式×2予算×2seed(1/11)=136試行です。各cellは完了数/試行数 / 完了時のready後中央値msです。失敗の時間を中央値から外すので、完了率と併記します。

| 入力群 | 予算ms | 有界SIQS+dense GF(2) | ECM |
| --- | ---: | ---: | ---: |
| 64bit 10桁因数（1問） | 100 | 0/2 / — | 2/2 / 32.95 |
| 64bit 10桁因数（1問） | 1000 | 0/2 / — | 2/2 / 31.65 |
| 13桁因数×2（4問） | 100 | 0/8 / — | 8/8 / 43.35 |
| 13桁因数×2（4問） | 1000 | 0/8 / — | 8/8 / 41.70 |
| 96bit（2問） | 100 | 0/4 / — | 3/4 / 40.60 |
| 96bit（2問） | 1000 | 0/4 / — | 4/4 / 53.15 |
| 112bit（2問） | 100 | 0/4 / — | 0/4 / — |
| 112bit（2問） | 1000 | 0/4 / — | 2/4 / 301.40 |
| 近接13桁因数（1問） | 100 | 0/2 / — | 2/2 / 29.85 |
| 近接13桁因数（1問） | 1000 | 0/2 / — | 2/2 / 30.15 |

SIQSの64bit行は原本の多項式選択不可によるalgorithm-resource、他の上表の未完了はtime-budgetです。ECMの112bit/1秒の未完了2件は32曲線のalgorithm-exhaustedです。SIQSのbudget checkpointはループ内のclock確認も含み、性能要因をCPU profileで分離していません。上流msieve全体・Lanczosの性能限界とは扱いません。

## 範囲外と共通前処理のcontrol

| control | SIQS 1秒 | ECM 1秒 |
| --- | ---: | ---: |
| 61〜63bit（3問） | 0/6 / — | 6/6 / 23.65 |
| 101×13桁（1問） | 0/2 / — | 2/2 / 15.35 |
| 13桁平方（1問） | 2/2 / 2.00 | 2/2 / 1.85 |
| 10/13桁×M127（2問） | 0/4 / — | 4/4 / 55.80 |

61〜63bit・101 control・M127のSIQSはalgorithm-rangeです。平方は共通前処理で解け、SIQS本体の成功には数えません。M127を含む完了はprobableで、素数証明や確率上限を付けません。

[PR4のnative/GMP Brent比較](llm01-gmp-ecm.md)と[PR3の限定MPQS](llm01-wasm-mpqs.md)は固定済み履歴を再利用し、今回と同時測定とは扱いません。旧342+72試行を再実行していません。

## 初期化・資源の実測

方式順を試行ごとに交互にし、全136比較で毎回旧Workerをdisposeして新しいWorkerを生成します。同時所有の最大は1 Workerです。各試行のready後時間は生成・compile/instantiateを含まず、初期化は別欄です。rawの全比較行でfreshPerTrial=trueを検証します。再利用時のほぼ0msを初期化中央値へ混ぜません。長期間反復したJIT warm測定ではなく、交互順は無作為化でもありません。

| 方式 | 初期化中央値ms | 試行標本の最大RSS MiB | 最大PSS MiB |
| --- | ---: | ---: | ---: |
| siqs | 21.85 | 1347.27 | 517.82 |
| gmp-ecm | 48.40 | 1346.38 | 516.93 |

初回localhost取得からSIQS readyまで 190.88ms、取得した全source assetの実bytes合計 1523103 bytesです。圧縮/HTTP headerを含むnetwork wire量ではありません。通常Worker依存・両候補・診断bundleも初期取得に含み、rawで一覧化しています。

- SIQS WASM 91432 bytes / b9503ddeabad9af7076b829119b979c115c2e6cb83a43d88ecdab6b963b22508。ECM WASM 455847 bytes / 9a5627be7e9882a6b757a720258877fe13adc6b50dead671f9ff74bad6a0605b。双方2回clean build一致、実memory.grow拒否。
- 各WASMのhard線形上限64MiB、stack1MiB。SIQSの管理heap上限32MiB、今回比較での実測管理peak 21.57MiB。管理割当の正常/停止後liveは0でした。これらはbrowser全体RAMではありません。
- 専用Chromeの全taskのchildrenを集約したprocess treeを目標25ms間隔で標本化。全評価（起動・計算・取消・fatal回復を含む）956標本、最大13 process、標本RSS peak 1347.27MiB、PSS peak 517.82MiBです。
- ready後最初の比較直前の標本はRSS 1171.26MiB / PSS 406.48MiB。RSS合算はshared pageを重複計数し、PSSは共有割合を配分します。終了済みWorkerのGC待ちやbrowser自体も含みます。短命process・標本間の瞬間ピークは捕捉できず、厳密RAM上限ではありません。
- Chrome/155.0.8059.39 / V8 15.5.35.20、WSL2 Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz、logical CPU 6。電源・mobile・CPU profileは未測定です。proc読取の負荷も同じ比較条件に含みます。

## 段階停止・異常終了・通信

SIQSはnative ASan/UBSanで6段階停止、代表jobの全2528割当失敗、13境界probe、ABI・選択不可・後続exact回復を検証しました。WASMでも代表割当失敗と出力直前停止を検証しています。

ECMは実stage2を計装し、nativeで10候補中9地点の停止・正常exit・ecm_clear後・再利用を確認しました。point3は未到達です。実Chromeではpoint5で停止し、入口/出口/返却/cleanupが記録されました。dF=120、k=2、S=1、NTT=0の通った経路だけの証拠です。無callback区間の最大時間証明ではありません。

実Chromeでtrap、GMP内部raw割当失敗1、ECM直接割当失敗3/4/5の計5種類を注入。全てpoison→controller error→Worker terminate、旧世代無視、明示restartの新Workerで101×103を確認しました。GMP OOMをlongjmpで回復したとは扱いません。通常の予算停止とfatal退役を分け、上流OOM全経路を改修したとは主張しません。

ready後HTTP/CDP/CSP/例外0件。cache無効・page offline・asset server停止下で両候補計算、取消と再初期化を確認しました。SIQSの別の正常完了smokeのみ10秒枠を使い、上表の1秒成功へ混ぜません。CDP/HTTP/CSP監視は通信の正例でも確認しました。Worker targetのoffline emulation非対応はserver停止で補完します。

このPRはprivate評価Draftです。次の候補はcheckpoint頻度のprofileと予算契約を保ったbatch化、または既に比較したECM/限定MPQSの明示的選択です。無制限SIQS/Lanczos/GNFS port、製品UI・site統合・公開license・配布・Ready/merge/deployは行いません。
