# LLM-01 graph保持・抽出・並列・剰余の改善

旧PR18 head `297f9d29c2102dfcd420f0b9fee5230ed4a0d4df` を保持した独立対照です。各manifestは測定HEAD・固定plan/driver SHA・全raw/log SHA・開始前WSL余力を持ち、実読込sourceとartifactを歴史blobへ照合します。初回asset取得後はserver停止・通信0、page/Worker検出器自己試験、取消・期限・解放を確認しました。

## 保持メモリと抽出

| 対照 | 同一条件 | 要求メモリ比の変化 | 時間比の変化 | 判断 |
| --- | --- | ---: | ---: | --- |
| root canonical bytes | accepted64family・4owner ABBA | -23.52% | 0.15% | 省メモリ採用、速度向上の主張はしない |
| 1 edge/1 Box packed payload | 固定64family・4owner ABBA | -19.08% | -1.95% | 追加の省メモリ採用 |
| terminal collection解放・行列配列解放 | 40桁・1owner・同一最終prefix9 | -18.24% (peak) | 0.90% | 全packet/列/counter/因子一致 |
| terminal collection解放・行列配列解放 | 64桁・1owner・同一最終prefix359 | -27.73% (peak) | -0.10% | 全packet/列/counter/因子一致 |

要求量はallocatorのrequested bytesであり、WASM linear/Chrome RAMとは別です。root対照は300秒で終了prefixが126/128になったため、全試行で一致するprefix64の要求量と受理時刻で判定しました。packedは全試行が同じ64で停止しました。抽出の4owner予備対照はdrainで360/362と異なったため採否に使わず、1ownerの最終prefix一致対照を追加しています。

旧600秒のcoordinator linear209.625MiBは、増え続けるforest relation容量とpowers保持が主因でした。prefix125の未圧縮観測ではrelation容量42MiBとpowers約35.34MiBでlive要求量の約78%を占め、bufferedFamiliesは0、seenAは約28KiBでした。今後cycleを閉じるためのtree edgeを収集中に削除する最適化は行いません。抽出をterminal化した後だけforest/seenA/bufferを解放し、dependency復元に必要なalive_cols/eliminationsと元matrixは残しています。

## 並列と保持枠

| 試行 | Worker/枠 | request秒 | usable/full/SLP/DLP/cycle | coord live/linear MiB | Chrome peak RSS/PSS MiB |
| --- | --- | ---: | --- | --- | --- |
| fixed-1-4w-4s | 4/4 | 93.147 | 837/823/11167/35626/14 | 17.82/27.25 | 1385.32/557.57 |
| fixed-2-4w-8s | 4/8 | 69.032 | 837/823/11167/35626/14 | 17.82/26.88 | 1385.26/556.27 |
| fixed-3-4w-8s | 4/8 | 68.691 | 837/823/11167/35626/14 | 17.82/26.88 | 1388.98/558.20 |
| fixed-4-4w-4s | 4/4 | 91.932 | 837/823/11167/35626/14 | 17.82/27.25 | 1392.35/557.81 |
| fixed-5-5w-8s | 5/8 | 62.141 | 837/823/11167/35626/14 | 17.82/27.25 | 1422.86/594.78 |
| fixed-6-4w-8s | 4/8 | 69.305 | 837/823/11167/35626/14 | 17.82/26.88 | 1385.75/556.92 |
| fixed-7-6w-8s | 6/8 | 64.814 | 837/823/11167/35626/14 | 17.82/28.63 | 1445.71/620.72 |
| fixed-8-5w-8s | 5/8 | 63.745 | 837/823/11167/35626/14 | 17.82/25.81 | 1413.29/586.98 |
| fixed-9-4w-8s | 4/8 | 69.413 | 837/823/11167/35626/14 | 17.82/26.88 | 1380.34/552.14 |
| fixed-10-6w-8s | 6/8 | 66.116 | 837/823/11167/35626/14 | 17.82/26.19 | 1446.40/616.85 |

保持枠4→8の4owner ABBA: 時間 -25.59%、PSS -0.08%。

5owner vs4owner（同じ8枠）: 時間 -9.25%、PSS 6.55%。事前の速度>=5%/PSS<=1.10x gateは成立。

6owner vs4owner（同じ8枠）: 時間 -5.61%、PSS 11.59%。事前の速度>=5%/PSS<=1.10x gateは不成立。

hardwareConcurrency=6/deviceMemory=8は参考値です。6 WorkerはWASM576MiBを明示768MiB予算内に置き、4/5は448/512MiBです。全体packet予約8枠/64MiB、owner credit2、digest16MiB/8件。自動設定は最大2を維持し、Worker増員を比例加速と扱いません。Windows空き物理RAMの読取は2026-10-21T03:37:44Zに15857.5MiB、総32632.8MiBでした。空きRAMの巨大割当探査や端末設定変更は行っていません。

## CPUと組込み剰余

名前付きartifactはcustom以外の全WASM sectionが元compactと一致しています。14.967秒/13919 samplesの診断でsieve_one_poly self83.20%・inclusive89.81%、__multi3群も約7%でした。集約/転送は小さく、現段階でtrust検証を削る根拠にはしません。sampling比率をOS CPU使用率や全工程時間予測と呼びません。CPU rawはLLM-01内に保持し、このrepoにはbounded summaryとSHAだけを保存します。

Rust組込みu32剰余は境界値・seed固定10000組を既存reciprocal法とBigInt oracleへ照合し、40/64桁の全packet/column/counter/最終因子が一致しました。RSA100固定32family ABBAでは時間 -9.27%、PSS 1.03%、事前gateは成立。

## 集約専用と持続・取消

同じ5計算WorkerのABBAで、集約専用1＋計算5は5combinedに対し時間 0.81%、PSS 4.64%。速度gate不成立で不採用です。元のpage読み込み失敗を方式の否定とはせず、回復したharnessで比較しました。

| 持続対照 | accepted128秒 | live / linear MiB at128 | 終了 / accepted / usable | 最終live / linear MiB | Chrome peak RSS / PSS MiB |
| --- | ---: | --- | --- | --- | --- |
| legacy | 300.626 | 99.87 / 110.50 | coordinator-memory-soft-stop / 179 / 5033 | 157.61 / 210.50 | 1386.10 / 623.71 |
| optimized | 218.599 | 60.45 / 72.56 | time-budget / 359 / 11652 | 153.82 / 169.75 | 1427.13 / 700.79 |

両側でprefix128のpacket・列・full/SLP/DLP/cycle/usableが一致しています。旧方式は約420秒でcoordinator保護停止、改善版は600秒の期限停止。異なる終了prefixのメモリ比を同条件の削減率にしません。改善版120秒取消は 0.800msで全退役し、全試行のallocator拒否は0でした。

| 持続試行 | max return→ACK ms | global capacity idle / blocked idle ms（全owner合計） | assigned-job wall占有率 owner別 |
| --- | ---: | --- | --- |
| legacy | 8260.4 | 129203.9 / 0.0 | 98.84%, 88.90%, 88.68%, 90.61% |
| optimized | 8238.0 | 34274.2 / 1311.4 | 98.87%, 97.68%, 98.05%, 99.46%, 97.87% |

占有率はhostの割当job wall timeであり、OS CPU使用率ではありません。ACK待ちは先行計算と重なる場合があります。送付済みnative時間とallocator/linear観測は、中断中の呼出しの未送信変化を含みません。Chrome RSS/PSSは別の間隔samplingです。

## 可逆powers圧縮

固定64family・4Worker/8枠のABBAで、live要求量 -27.85%、時間 -0.31%、PSS -0.39%。事前gateは成立。全packet/列/counter一致、40/64桁の最終因子一致、405 codec境界と不正入力拒否を確認しました。外部wire形式と数学パラメータは変更しません。

## 残る局所候補と配布入口

| 候補 | 同一条件 | 時間変化 | PSS変化 | 判断 |
| --- | --- | ---: | ---: | --- |
| skip | 固定32family4Worker/8枠ABBA | -0.29% | 0.13% | 速度5% gate不成立・不採用（live 0.00%） |
| block16 | 固定32family4Worker/8枠ABBA | 4.85% | -0.15% | 速度5% gate不成立・不採用（live 0.00%） |

元順序を保つsigned index差分は4familyのpayload比 99.70% / 98.69% / 98.71% / 98.75%。全partialのbyte数からの初期live削減見積りは 0.125%で、事前20%payload/10%live gate不成立。追加codecは実装しません。これは有界サイズ診断で、全工程の実測省メモリ率ではありません。Node child maxRSS 105.81MiB、Chrome値とは別です。

64桁全工程の1owner ABBA（最終prefix359）でも全packet/counter/因子と共通prefix128列が一致し、varint時間は -1.32%、要求peakは 0.00%。

選定済みESM入口の初回取得は 19asset、計 1879727bytes。runtime依存に旧実験factory/非選定WASMを含めず、3role sourceは整理前とバイト一致・body SHA/Native hardcapを固定しています。

上限600秒（実request 600.001秒）の試行は timeout/time-budget、accepted362、usable11771。最後に受信したcoordinator live/linear 104.38/121.31MiB、Chrome peak RSS/PSS 1409.39/631.62MiB。prefix128で旧未圧縮方式とのlive要求比は -57.33%、到達時間変化は -29.94%（別headの統合比較）。120秒取消は 1.100msで全Worker/source退役、全試行通信0とallocator拒否0を確認しています。

## 限界と残作業

RSA100の収集→大行列→GCDの完了は未確認です。小さい対照40/64桁の成功を代替にせず、usable/targetから全工程所要時間を推定しません。physical mobile/Safari/Firefoxは未検証です。requested/linear/Chrome RSS・PSSは区別し、OSによるtab終了を防げるとは約束しません。旧原本、負の比較、失敗した開発build/testログをLLM-01内に保持しています。

- [root manifest](staged-graph-stage25/root/run.json): `4f224297d0b27daacb21ac931dbfc76f436ff72f`、10 trials。
- [release-preview manifest](staged-graph-stage25/release-preview/run.json): `733753ab7a2fad07cdfb868b0420bb8b7387867f`、10 trials。
- [packed manifest](staged-graph-stage25/packed/run.json): `733753ab7a2fad07cdfb868b0420bb8b7387867f`、9 trials。
- [full manifest](staged-graph-stage25/full/run.json): `0b36d39b2d79afe7ed771db585a3e428ad3d135b`、8 trials。
- [multicore manifest](staged-graph-stage25/multicore/run.json): `e97e7836bb594d7769a898a3332a04d256c44936`、11 trials。
- [builtin manifest](staged-graph-stage25/builtin/run.json): `14a3ac3ef36f25212d901a406d0b47c5c455208b`、5 trials。
- [dedicated manifest](staged-graph-stage25/dedicated/run.json): `7899800a6fb64e97d4a218ac56bbdf702b907891`、5 trials。
- [integrated manifest](staged-graph-stage25/integrated/run.json): `477f141fd3855b0b73e89af7559482a7c2ebb7ca`、5 trials。
- [varint manifest](staged-graph-stage25/varint/run.json): `764982e9a31d8c23bfc1b70ad0c9a0fb33c20ecb`、5 trials。
- [hotpath manifest](staged-graph-stage25/hotpath/run.json): `65e8f9f8a011ae60f6498cd30c999bbfa77667db`、10 trials。
- [final manifest](staged-graph-stage25/final/run.json): `98a62b2bc1e0498dbe8041e717d673beb6f00af7`、8 trials。

[契約一覧](../README.md)と[操作・解釈](../operations/graph-optimization.md)を参照してください。公開releaseとサイトのplugin受入・本番切替は別工程です。
