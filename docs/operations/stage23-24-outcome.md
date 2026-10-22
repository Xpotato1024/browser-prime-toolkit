# Stage23/24 の結果と残件

[全原本と主report](../benchmarks/llm01-sustained.md)、[占有率・待ち・graph成長](../benchmarks/llm01-sustained-observations.md)、[再現境界](sustained-measurement.md) を参照してください。PR17の成功baselineは保持しています。計測は同じLLM-01のWSL2/Linux上のChrome155 headless、6 logical CPU、VM RAM約9.71GiBで実施しました。browserのdeviceMemory値8GiBは丸められた参考値です。

| 同じ入力・設定 | 2 Worker usable | 4 Worker usable | 判定 |
| --- | --- | --- | --- |
| 300秒 1組目 | 1,936 | 3,361 | 事前の10%以上増加基準を満たす |
| 300秒 2組目 | 1,936 | 3,633 | 同上 |
| 600秒 1組目 | 4,067 | 7,415 | 同上 |
| 600秒 2組目 | 4,067 | 7,447 | 同上 |

4 WorkerはこのLLM-01の同条件比較で収集量を増やしました。2回ずつの観測であり、他端末への効果や全工程の比例加速は保証しません。自動上限2・既存UI・本番入口は変更していません。4 Workerは既存の明示手動設定で選べます。

集約専用4 Workerの60秒比較は562/562 usable、combinedは562/505です。2組とも10%以上という基準には達せず、集約専用方式は採用しません。旧ページ開始失敗を不採用の根拠にはしていません。

native graph成長後の120秒取消は2/4 Workerとも成功し、要求から退役まで約0.8/0.7msでした。全familyの原本digestと受理済みprefixの一致、offline検出器、Worker/source解放、輸送/credit/監査の有限上限を確認しました。占有率はhostで割り当てられたジョブのwall時間で、OS CPU使用率ではありません。

今回の最大coordinator peak linearは209.625MiB、peak要求量は約201.32MiB。Chrome peak PSSは約677.4MiBです。WASM予算やlinear memoryとRSS/PSSは同じ量ではありません。実WASM OOMや256MiB capの90%以上という増量検討gateは成立せず、手動128/256/384/512MiBと総512MiB上限を維持します。4 Worker/512MiBはcoordinator256＋helper64×3＝448MiB hardcapです。

不足がないのは今回の収集窓だけです。RSA100は600秒でも未完了で、十分なrelation収集・matrix・全分解の必要時間とRAMは確定していません。将来、記録付きOOMかcap逼迫が出た場合は、明示手動768MiB・coordinator512＋helper64×3＝704MiBなど有限の別artifactを検証する案があります。予算数値だけでcompiled capは変わらず、自動増量や巨大割当による空きRAM探査はしません。

Stage23の試行ID集計不具合は、原本を固定したStage24で識別子を分離し、残予定だけを実行して閉じました。旧停止manifestと全stdout/stderrも保持しています。通常のcheckは新しいclosure reportを使い、旧benchmark/reportは測定sourceとして固定しています。

物理スマホ・Safari・Firefoxは未検証です。本番サイト統合・配信・Ready化・merge・releaseは行っていません。
