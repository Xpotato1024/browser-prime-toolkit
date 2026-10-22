# LLM-01 集約方式・持続計測

測定core `ed207f4a9e5aac90b914a8a21ec6b515f292a92b`、旧core `2a88e59a5740d204dda40c474fa4959db454062d`。plan `coordinator-sustained-stage23-20261020`。2026-10-20T18:53:40.438Z → 2026-10-20T19:58:20.584Z。PR17と旧Stage22の原本は保持。

Stage23は4集約試行の取得後、入力IDが試行IDを上書きした集計不具合で停止しました。旧manifest/raw/log/計算sourceは保持し、Stage24は識別子を分離して残予定だけ実行しました。旧系列を完了扱いにせず、両headのsource/hashを検証しています。

事前登録した条件付き系列が完了しました。

数値kernel/WASM/Worker/設定/credit/役割capはPR17と同じです。変更は開始前ナビゲーションの30秒上限と配信trace、有限のstreaming SHA256監査とhost event保持です。hashのCPU/JSコストを含む同条件比較で、旧60秒系列との速度差を直接因果推定しません。

| 試行 | Worker | 予算秒 | 結果 | usable | full | SLP | DLP | cycle | polys |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| fixed-combined-w2 | 2 | 60 | incomplete/fixed-family-bound | 106 | 106 | 1412 | 4375 | 0 | 8192 |
| fixed-combined-w4 | 4 | 60 | incomplete/fixed-family-bound | 106 | 106 | 1412 | 4375 | 0 | 8192 |
| fixed-dedicated-w4 | 4 | 60 | incomplete/fixed-family-bound | 106 | 106 | 1412 | 4375 | 0 | 8192 |
| coord-combined-r1 | 4 | 60 | timeout/time-budget | 562 | 554 | 7309 | 23248 | 8 | 43008 |
| coord-dedicated-r1 | 4 | 60 | timeout/time-budget | 562 | 554 | 7309 | 23248 | 8 | 43008 |
| coord-dedicated-r2 | 4 | 60 | timeout/time-budget | 562 | 554 | 7309 | 23248 | 8 | 43008 |
| coord-combined-r2 | 4 | 60 | timeout/time-budget | 505 | 499 | 6614 | 21101 | 6 | 38912 |
| long-w2-r1 | 2 | 300 | timeout/time-budget | 1936 | 1856 | 25146 | 80480 | 80 | 147456 |
| long-w4-r1 | 4 | 300 | timeout/time-budget | 3361 | 3101 | 42429 | 136455 | 260 | 249856 |
| long-w4-r2 | 4 | 300 | timeout/time-budget | 3633 | 3332 | 45496 | 146496 | 301 | 268288 |
| long-w2-r2 | 2 | 300 | timeout/time-budget | 1936 | 1856 | 25146 | 80480 | 80 | 147456 |
| grown-cancel-w2 | 2 | 300 | cancelled/cancelled | 751 | 742 | 9724 | 31088 | 9 | 57344 |
| grown-cancel-w4 | 4 | 300 | cancelled/cancelled | 1233 | 1196 | 15994 | 51260 | 37 | 94208 |
| extended-w2-r1 | 2 | 600 | timeout/time-budget | 4067 | 3705 | 50736 | 163430 | 362 | 299008 |
| extended-w4-r1 | 4 | 600 | timeout/time-budget | 7415 | 6243 | 86842 | 279737 | 1172 | 512000 |
| extended-w4-r2 | 4 | 600 | timeout/time-budget | 7447 | 6268 | 87209 | 280850 | 1179 | 514048 |
| extended-w2-r2 | 2 | 600 | timeout/time-budget | 4067 | 3705 | 50736 | 163430 | 362 | 299008 |

| 試行 | coord peak linear MiB | coord peak requested MiB | Chrome peak RSS/PSS MiB | audit peak input MiB | 累積packet MiB | max返却→受理ms | owner/global待ちms |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| fixed-combined-w2 | 17.7 | 12.7 | 1310.7/483.5 | 0.6 | 1.2 | 39.1 | 0.0/0.0 |
| fixed-combined-w4 | 12.8 | 11.2 | 1368.9/541.2 | 0.6 | 1.2 | 65.9 | 0.0/0.1 |
| fixed-dedicated-w4 | 9.4 | 7.5 | 1368.8/541.2 | 0.6 | 1.2 | 42.9 | 0.0/0.0 |
| coord-combined-r1 | 25.1 | 23.8 | 1374.6/545.6 | 0.6 | 6.4 | 8250.7 | 0.1/49094.7 |
| coord-dedicated-r1 | 19.4 | 18.0 | 1368.5/541.0 | 0.6 | 6.1 | 103.9 | 0.0/102.1 |
| coord-dedicated-r2 | 19.4 | 18.0 | 1364.3/537.8 | 0.6 | 6.1 | 126.3 | 0.0/88.8 |
| coord-combined-r2 | 25.1 | 23.8 | 1375.3/545.9 | 0.6 | 6.4 | 8223.9 | 0.0/49163.1 |
| long-w2-r1 | 63.1 | 61.0 | 1308.9/533.8 | 0.6 | 21.1 | 2832.7 | 0.0/0.0 |
| long-w4-r1 | 110.9 | 104.5 | 1374.9/589.2 | 0.6 | 35.7 | 8291.5 | 0.0/121111.4 |
| long-w4-r2 | 110.9 | 107.1 | 1375.6/604.0 | 0.6 | 38.3 | 8172.2 | 0.0/81201.9 |
| long-w2-r2 | 63.1 | 61.0 | 1310.8/533.2 | 0.6 | 21.1 | 2891.3 | 0.0/0.0 |
| grown-cancel-w2 | 37.4 | 32.4 | 1317.0/493.8 | 0.6 | 8.2 | 612.8 | 0.0/0.0 |
| grown-cancel-w4 | 61.0 | 47.5 | 1374.3/547.3 | 0.6 | 13.4 | 8157.2 | 0.2/81684.6 |
| extended-w2-r1 | 115.9 | 112.1 | 1309.8/560.1 | 0.6 | 42.8 | 8031.5 | 4.5/0.0 |
| extended-w4-r1 | 209.6 | 201.0 | 1376.7/674.4 | 0.6 | 73.2 | 8296.3 | 0.0/257482.1 |
| extended-w4-r2 | 209.6 | 201.3 | 1374.8/677.4 | 0.6 | 73.5 | 8373.2 | 0.2/251177.4 |
| extended-w2-r2 | 115.8 | 112.1 | 1310.4/560.9 | 0.6 | 43.1 | 5914.7 | 0.0/0.0 |

| 持続/取消試行 | coord requested最初→最後 MiB | coord linear最初→最後 MiB | Chrome PSS開始窓→終了窓 MiB | cancel要求→退役API ms |
| --- | --- | --- | --- | ---: |
| long-w2-r1 | 4.4→54.1 | 12.8→63.1 | 478.0→531.6 | — |
| long-w4-r1 | 4.4→98.2 | 12.8→110.9 | 537.8→587.8 | — |
| long-w4-r2 | 4.4→100.7 | 12.8→110.9 | 537.8→595.2 | — |
| long-w2-r2 | 4.4→54.1 | 12.8→63.1 | 478.0→532.0 | — |
| grown-cancel-w2 | 4.4→26.5 | 12.8→37.4 | 480.3→445.2 | 0.8 |
| grown-cancel-w4 | 4.4→44.5 | 12.8→61.0 | 536.7→492.7 | 0.7 |
| extended-w2-r1 | 4.4→105.1 | 12.8→115.9 | 476.9→554.0 | — |
| extended-w4-r1 | 4.4→194.6 | 12.8→209.6 | 537.1→674.0 | — |
| extended-w4-r2 | 4.4→194.9 | 12.8→209.6 | 537.7→675.9 | — |
| extended-w2-r2 | 4.4→105.1 | 12.8→115.8 | 479.1→555.9 | — |

RAM時系列は各rawのramTimeline（Node単調時計、ramOriginMsがCDP測定呼出直前）です。progressTimelineはbrowser request開始からの時計で、厳密な同時計とは扱いません。250ms sampleのRSS/PSSは観測でOS/全tabの上限保証ではありません。coordinator requested/linearはgraphとcontextを含み、hash/JS/輸送/ブラウザoverheadとは別です。host assigned wall occupancyをCPU使用率とは呼びません。hashFlushMsはWorker退役後の監査完了待ちです。

集約方式判定: `{"baseline":"combined","candidate":"dedicated","minimumRatio":"110/100","pairs":[{"repeat":1,"baselineUsable":562,"candidateUsable":562,"safe":true,"qualifies":false},{"repeat":2,"baselineUsable":505,"candidateUsable":562,"safe":true,"qualifies":true}],"qualifies":false,"automaticAdoption":false,"claim":"collection yield only"}`。

300秒判定: `{"baseline":"2","candidate":"4","minimumRatio":"110/100","pairs":[{"repeat":1,"baselineUsable":1936,"candidateUsable":3361,"safe":true,"qualifies":true},{"repeat":2,"baselineUsable":1936,"candidateUsable":3633,"safe":true,"qualifies":true}],"qualifies":true,"automaticAdoption":false,"claim":"collection yield only"}`。

600秒開始gate: `{"eligible":true,"reasons":[],"availableMiB":9212.96484375,"checkedAt":"2026-10-20T19:18:08.997Z","decision":{"baseline":"2","candidate":"4","minimumRatio":"110/100","pairs":[{"repeat":1,"baselineUsable":1936,"candidateUsable":3361,"safe":true,"qualifies":true},{"repeat":2,"baselineUsable":1936,"candidateUsable":3633,"safe":true,"qualifies":true}],"qualifies":true,"automaticAdoption":false,"claim":"collection yield only"}}`。

600秒判定: `{"baseline":"2","candidate":"4","minimumRatio":"110/100","pairs":[{"repeat":1,"baselineUsable":4067,"candidateUsable":7415,"safe":true,"qualifies":true},{"repeat":2,"baselineUsable":4067,"candidateUsable":7447,"safe":true,"qualifies":true}],"qualifies":true,"automaticAdoption":false,"claim":"collection yield only"}`。

## メモリ予算の判断

現在の手動選択肢は128/256/384/512MiBです。以下は予算内で選ばれるcompiled hardcap合計（MiB）で、予約/初期割当量ではありません。

| 手動予算 | 1 Worker | 2 | 3 | 4 |
| ---: | ---: | ---: | ---: | ---: |
| 128 | 128 | 不可 | 不可 | 不可 |
| 256 | 256 | 192 | 256 | 不可 |
| 384 | 256 | 320 | 384 | 320 |
| 512 | 256 | 320 | 384 | 448 |

観測最大coordinator linearは209.6MiB、実WASM OOM証拠は[]です。追加検討gate（256MiBの90%以上または記録付きOOM）は不成立。現時点で上限を増やす実測上の必要性がなく、512MiB総予算・既存artifactを維持します。deviceMemoryは空きRAMではなく、予算数値だけ増やしてもartifactの実上限は変わりません。

RSA100完了や全工程所要時間を収量から外挿しません。自動最大2や既存UIを変更せず、本番統合・公開・deployも行いません。物理スマホ/Safari/Firefoxは未検証です。

## 全raw・負の結果

- contracts-combined-w2: [raw](staged-sustained-stage23/contracts-combined-w2.json), [log](staged-sustained-stage23/contracts-combined-w2.log)
- contracts-combined-w4: [raw](staged-sustained-stage23/contracts-combined-w4.json), [log](staged-sustained-stage23/contracts-combined-w4.log)
- contracts-dedicated-w2: [raw](staged-sustained-stage23/contracts-dedicated-w2.json), [log](staged-sustained-stage23/contracts-dedicated-w2.log)
- contracts-dedicated-w3: [raw](staged-sustained-stage23/contracts-dedicated-w3.json), [log](staged-sustained-stage23/contracts-dedicated-w3.log)
- contracts-dedicated-w4: [raw](staged-sustained-stage23/contracts-dedicated-w4.json), [log](staged-sustained-stage23/contracts-dedicated-w4.log)
- fixed-combined-w2: [raw](staged-sustained-stage23/fixed-combined-w2.json), [log](staged-sustained-stage23/fixed-combined-w2.log)
- fixed-combined-w4: [raw](staged-sustained-stage23/fixed-combined-w4.json), [log](staged-sustained-stage23/fixed-combined-w4.log)
- fixed-dedicated-w4: [raw](staged-sustained-stage23/fixed-dedicated-w4.json), [log](staged-sustained-stage23/fixed-dedicated-w4.log)
- coord-combined-r1: [raw](staged-sustained-stage23/coord-combined-r1.json), [log](staged-sustained-stage23/coord-combined-r1.log)
- coord-dedicated-r1: [raw](staged-sustained-stage23/coord-dedicated-r1.json), [log](staged-sustained-stage23/coord-dedicated-r1.log)
- coord-dedicated-r2: [raw](staged-sustained-stage23/coord-dedicated-r2.json), [log](staged-sustained-stage23/coord-dedicated-r2.log)
- coord-combined-r2: [raw](staged-sustained-stage23/coord-combined-r2.json), [log](staged-sustained-stage23/coord-combined-r2.log)
- long-w2-r1: [raw](staged-sustained-stage24/long-w2-r1.json), [log](staged-sustained-stage24/long-w2-r1.log)
- long-w4-r1: [raw](staged-sustained-stage24/long-w4-r1.json), [log](staged-sustained-stage24/long-w4-r1.log)
- long-w4-r2: [raw](staged-sustained-stage24/long-w4-r2.json), [log](staged-sustained-stage24/long-w4-r2.log)
- long-w2-r2: [raw](staged-sustained-stage24/long-w2-r2.json), [log](staged-sustained-stage24/long-w2-r2.log)
- grown-cancel-w2: [raw](staged-sustained-stage24/grown-cancel-w2.json), [log](staged-sustained-stage24/grown-cancel-w2.log)
- grown-cancel-w4: [raw](staged-sustained-stage24/grown-cancel-w4.json), [log](staged-sustained-stage24/grown-cancel-w4.log)
- extended-w2-r1: [raw](staged-sustained-stage24/extended-w2-r1.json), [log](staged-sustained-stage24/extended-w2-r1.log)
- extended-w4-r1: [raw](staged-sustained-stage24/extended-w4-r1.json), [log](staged-sustained-stage24/extended-w4-r1.log)
- extended-w4-r2: [raw](staged-sustained-stage24/extended-w4-r2.json), [log](staged-sustained-stage24/extended-w4-r2.log)
- extended-w2-r2: [raw](staged-sustained-stage24/extended-w2-r2.json), [log](staged-sustained-stage24/extended-w2-r2.log)

[旧manifest](staged-sustained-stage23/run.json) と [継続manifest](staged-sustained-stage24/run.json) が全hash・測定head・開始前後RAMと判定を固定します。試行の上書き/自動retryはありません。
