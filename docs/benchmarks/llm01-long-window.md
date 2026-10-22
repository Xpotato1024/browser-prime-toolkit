# LLM-01 有限長枠とLP map選定反映

選定128/256 roleへLP mapを反映した。Stage36の同一64 family対照でlive要求量8.66%減という採否は維持し、旧baselineは歴史headと元Nativeに固定した。今回の長枠を速度比較や完了時間の推定には使わない。

## 固定試行

測定head `f27dd7caab2f15e25c3191503ba646a8dd5b2344`、2026-10-21T14:44:46.838Z〜2026-10-21T15:03:52.109Z。5 owner、co256＋helper64×4、WASM合計512MiB、global8枠/transport64MiB、family4096、events12288、graph512、progress4096。通常入口の600秒は変更していない。

| 試行 | 結果 | accepted / usable / target | request秒 | co last / peak requested / linear MiB | Chrome RSS / PSS MiB |
| --- | --- | ---: | ---: | --- | --- |
| contracts-long | 22契約成功 | — | — | — | — |
| prefix16-long | incomplete/fixed-family-bound | 16 / 423 / 116512 | 32.431 | 8.02 / 13.25 / 14.88 | 1409.84 / 581.06 |
| long-256 | incomplete/coordinator-memory-soft-stop | 572 / 22525 / 116512 | 956.817 | 160.06 / 167.24 / 176.13 | 1413.23 / 695.33 |
| grown-cancel | cancelled/cancelled | 69 / 1849 / 116512 | 119.998 | 21.87 / 28.64 / 31.81 | 1414.12 / 585.83 |

long試行の最小availableはWSL 8663.86MiB、Windows 15682.73MiB。live160MiBは呼出し間のsoft thresholdで、batch途中のpeak requestedとは分ける。WASM256MiBがco roleの厳密上限である。

全packet digest・受理prefix・counterを保存し、16 familyのpacket/列/counterはStage36と一致。通信0、検出器自己試験、source/HEAD guard、全Worker/source退役が成立した。120秒後取消から退役まで 0.800ms。requested/linear/Chrome RSS・PSSは別の指標であり、WASM512MiBはJS/転送/ブラウザ全体の上限ではない。

## 収集と抽出

最終counter: `{"full":14164,"slp":199426,"dlp":641658,"cycles":8361,"vertices":1157570,"treeEdges":832723,"usable":22525,"ingested":855248}`。

この試行では抽出quota telemetryを受信していない。RSA100の大行列・Block Lanczos・GCD完了を、小さい対照の成功で代替しない。

最終結果は incomplete/coordinator-memory-soft-stop。usable/targetを全工程進捗や所要時間に換算しない。追加のco1024候補は、この実停止理由とホスト余力を確認して別plan/headでのみ判断する。

## 失敗原本と監視修正

最初のhead `ec1349c55b7ff52641a80933c7fdf84d937a11e3` は22契約とprefix16の後、2026-10-21T14:19:21.290Zに監視読取ENOENTで失敗した。Windows置換更新の同時刻にWSL側のcurrent path読取が失敗し、892.8365秒の計算は取消された。旧harnessのmemory.stop例外で終了receiptは残らず、終了時のfamily/メモリ/全退役を成功計測として主張しない。原本log/manifestとWindows98行はローカル保持した。

修正版は最大271個のimmutable連番JSONだけを読む。未完成tmpと置換pointerを読まず、欠落・不正・30秒超は停止する。停止要求は独立1000ms期限で囲み、失敗時は所有Chrome群を退役する。監視失敗はobserverFailureと直前までのRAMへ残し、driverは採用しない。1-owner/4096 familyのsnapshot境界もlong専用32呼出samplingで512件以下に収めた。実Chromeの期限切れ負例で取消・全退役・通信0・失敗情報保存を確認した。

## 残件

実機スマホ/Safari/Firefox、サイトReact island/manifest v1受入、本番統合は未実施。OSによるタブ強制終了の防止は保証しない。主な採否は[既存改善](llm01-graph-optimization.md)と[LP map対照](llm01-lp-map.md)へ保全し、このDraftだけを理由に改善候補の枯渇やmerge/release条件成立とは扱わない。

[成功manifest](staged-long-window-stage37/completed/run.json)、[失敗manifest](staged-long-window-stage37/failed-monitor/run.json)、[契約](../contracts/long-window.md)。原本JSON/logはローカル保持し、repo証跡は各2MiB以下の可逆gzip/base64とSHAで照合する。
