# LLM-01 明示大メモリ枠でのRSA-100実測

固定headでRSA-100から2つのproper divisorを返し、独立BigIntの積・割切り検算と固定7基底の素数性検査を通過した。結果は **probable / remaining=1** で、素数証明ではない。1台・1回の実測であり、他端末の速度や完了時間を保証しない。

## 固定条件と原本

測定head `d1e0b865d14b702bd633fd739e05b2d3c772a1c1`、campaign 2026-10-21T16:38:57.194Z〜2026-10-21T17:16:31.877Z。測定前の同head CI36件・573 tests/check・独立レビューを通過した。

明示manual1536MiB、co1024＋helper64×4、WASM hardmax合計1280MiB、5 owner、8global枠、transport64MiB、owner credit2。RSA100は最大3600秒の1回だけ実行し、このcampaignの追加試行は行わない。通常600秒・自動設定・選定ESM入口・サイト本番は変更していない。

実設定: `{"version":1,"profile":"baseline","bits":330,"factorBaseBound":3250000,"intervalHalfWidth":524288,"singleLimit":"471250000","doubleLimit":"10932187500000000","lpBits":54,"thresholdAdjustment":-23,"factorBaseSize":116448}`。Native1024は439917bytes、SHA256 `9db5ac2f3d70ae61c6a277ddbfbe6386775f575f29e8c1312298d0be7e269037`、固定source/compilerの2clean build一致。初期memoryは2MiB未満で、巨大割当による空きRAM探索はしていない。

## 結果

| 結果 | request秒 | accepted / usable / target | co peak requested / linear MiB | Chrome tree RSS / PSS MiB |
| --- | ---: | ---: | ---: | ---: |
| probable / remaining=1 | 2220.175 | 1280 / 117853 / 116512 | 482.72 / 614.44 | 1706.79 / 1009.45 |

入力: `1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139`。

返却因子:

- `37975227936943673922808872755445627854565536638199`（probable）
- `40094690950920881030683735292761468389214899724061`（probable）

既知因子の計算利用はfalse。因子値は計算結果から報告し、engineへ答えを埋め込んでいない。Stage37と共通する572familyの全packet SHA・各prefix counter、prefix128のcolumn SHAが一致した。終了prefixの異なるメモリ量を削減率や速度比にしない。

最終counter: `{"full":31887,"slp":445914,"dlp":1434463,"cycles":85966,"vertices":2130115,"treeEdges":1794411,"usable":117853,"ingested":1912264}`。

## 行列・GCDとメモリ

Native抽出status1。抽出前telemetryは116449 rows / 117853 columns / 8592687 nnz、後続telemetryのrow/columnは88561 / 90471となった。段階ごとにnnzの対象が変わるため、異なる段階のnnzを同一行列の減少率に使わない。solver/GCDのphaseと返却因子・積検算を合わせて通し成立を確認した。

| Native phase marker | live requested MiB | peak requested MiB | linear MiB |
| --- | ---: | ---: | ---: |
| 10 | 410.09 | 410.09 | 443.44 |
| 11 | 112.51 | 410.09 | 443.44 |
| 1 | 112.51 | 410.09 | 443.44 |
| 2 | 160.60 | 410.09 | 443.44 |
| 3 | 178.96 | 410.09 | 568.25 |
| 20 | 247.20 | 410.09 | 568.25 |
| 21 | 300.06 | 410.09 | 568.25 |
| 22 | 352.97 | 410.09 | 568.25 |
| 23 | 252.42 | 482.72 | 614.44 |
| 24 | 253.10 | 482.72 | 614.44 |
| 4 | 179.85 | 482.72 | 614.44 |
| 5 | 179.85 | 482.72 | 614.44 |

抽出quota640MiB／linear事前閾値832MiB。preflight拒否0、quota拒否0、全ownerのallocator失敗0。linearは解放後も縮まらず、co終了liveは1392bytes。requested・linear・WASM hardmax・Chrome RSS/PSSは別指標であり、1280MiBはJS/Node/ブラウザ全体の上限ではない。

RAM観測4071件のsummary（500ms間隔、最大8000）。保存時系列は256点へ間引き、全標本peakを間引き列から再計算した値とは扱わない。最小availableはWSL 8283.58MiB／Windows 15015.89MiB、Windows最大鮮度差10449ms、observerFailure=null。開始8192MiB・実行中4096MiB停止、Chrome PSS3072MiB停止の枠を維持した。OSによるtab強制終了を防げるとは主張しない。

## 呼出時間と停止判断

coordinatorのwrapper計時はsieve 2143.236秒、submit 23.907秒、observe 0.531秒、extract 42.592秒。これは呼出しの経過時間で、OS CPU時間ではない。owner間は並列に重なるため合計を実行時間へ換算しない。Native sieve呼出が中心で、graph観測や集約の削減で大きな改善が得られるという根拠は今回得ていない。

採用・不採用の局所候補は[保持・並列・hot path比較](llm01-graph-optimization.md)と[LP map固定対照](llm01-lp-map.md)に保持した。今回でメモリ容量という未解決点を有限枠で検証し、RSA100の収集→行列→GCD→独立検算まで到達した。Native peakはgraph marker22→23、縮約行列構築とfilter配列解放の間に現れ、Native quotaのsolver stage5→6では増えていない。不要filter配列の早期解放が具体的な残候補であり、別plan/headの有限比較でのみ評価する。現時点では全主要候補の枯渇やmerge条件成立とは扱わない。さらなる篩kernel設計やパラメータ再探索は別仮説・別予算とし、追加の巨大メモリや長時間試行を無制限に拡大しない。

## 退役・検証と限界

通信0・asset server停止・cache無効、page/Worker検出器の陽性対照、source/HEAD guard、全Worker/source退役、ownership live/source=0を確認した。時間上限/取消/fatal/fresh recoveryは実Workerと22契約で確認し、本試行は正常終了した。大きい保持状態からの明示取消は本試行で実施していない。

実機スマホ/Safari/Firefox、サイトReact island/manifest v1受入、本番統合は未実施。選定版600秒でRSA100を完了したという主張ではない。測定headと最終報告headのCI/レビューは分け、最終結果は[PR22](https://github.com/Xpotato1024/browser-prime-toolkit/pull/22)へ記録する。

[成功manifest](staged-wide-window-stage38/completed/run.json)、[証跡索引](staged-wide-window-stage38/completed/evidence-index.json)、[測定前CI](staged-wide-window-stage38/completed/ci-before-measure.json)、[事前契約](../contracts/wide-window.md)。原本JSON/logとWindows全immutableサンプルはLLM-01内に保持し、repoは各2MiB以下の可逆gzip/base64とSHAで照合する。
