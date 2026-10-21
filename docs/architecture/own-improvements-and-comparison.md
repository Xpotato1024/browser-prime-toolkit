# 独自改良・さらなる候補・CPUとWorkerを含む評価

2026-10-21時点。RSA100の成功測定は `d1e0b865d14b702bd633fd739e05b2d3c772a1c1`、報告確定はPR22 `e1dae4b656b401c287fe880db9d6ee586bbd79d3`。[生成報告と可逆原本](../benchmarks/llm01-wide-window.md)が数値の基準である。次の行列保持候補は別head `1181a66c9e41e92ac33cd38e53643281a08487ad` の[有限比較](../benchmarks/llm01-matrix-memory.md)で不採用となった。

## どの実装で何を達成したか

数論の中核はrusqsieve 0.5.0、固定upstream `4b150834b57636f6ebc350a81321a15c1cd901d2` に由来するRust/WASMである。SIQS、single/double large-primeの関係結合、疎行列filter、Montgomery block Lanczos、依存関係からのGCDは先行実装・研究の貢献であり、こちらが新発明した方式ではない。Block Lanczosの由来は[上流の固定source](https://github.com/metastable-void/rusqsieve/blob/4b150834b57636f6ebc350a81321a15c1cd901d2/src/f2/block_lanczos.rs)に記載され、行列積の配置はYAFU/msieveを参照する。

成功経路はその固定sourceへ下記のpatchを加え、Rust1.90.0、O3/fat LTO/SIMD128で再ビルドしたもの。上流の配布CLIをそのまま実行した結果ではなく、GMP/ECM、msieve、Yaffleの実装へ処理を切り替えて得た結果でもない。過去に評価した別engineは履歴へ残している。独自性はブラウザでの有限実行制御、可逆保持、資源制限と検証、実装上の局所改善にある。研究上の新規性を証明したとは主張しない。

RSA100（330bit）は5計算Worker、うち1つが集約も行うcombined方式で収集し、集約Workerがfilter・線形代数・GCDを行った。accepted1280、usable117853、target116512、proper divisor・因子積と独立確率判定が成立した。2因子は各165bit、結果はprobableで素数証明ではない。既知因子は入力していない。

## 固定上流へ加えた変更と実測

[全graph比較](../benchmarks/llm01-graph-optimization.md)、[scheduler](../benchmarks/llm01-scheduler.md)、[LP map](../benchmarks/llm01-lp-map.md)に全raw・各固定head・事前gateを保存している。割合は各行固有の対照であり、掛け合わせてRSA100全工程の改善率にはできない。

| こちらで加えた変更 | 同条件の根拠 | 採否と意味 |
| --- | --- | --- |
| immutable contextの同一WASM内共有・抽出前解放、native buffer/Blob解放 | [Stage17](../benchmarks/llm01-rusqsieve.md)のcopy/drop/retain対照 | 初期要求量7,690,360→3,845,612 bytes。64桁全工程peakは同じ。全入力で高速・省メモリという主張はしない |
| 有限先行creditと受理済み連続prefix・重複排除 | 同じ数学kernelでbatch2/batch1/credit、各60秒2反復 | 同期待ちを減らすcreditを採用。短時間収量で完了予測しない |
| rootのcanonical bytes保持 | 共通64family・4Worker ABBA | requested live -23.52%、時間+0.15%。省メモリ採用 |
| forest edgeの1 Box packed保持 | 固定64family・4Worker ABBA | live -19.08%、時間-1.95%。数学情報を捨てず採用 |
| terminal抽出でforest等を解放、行列構築後に不要配列解放 | 同じ最終prefix、40/64桁の全工程 | peak -18.24%/-27.73%。復元用データは保持して採用 |
| powersの可逆varint保持 | 固定64family・4Worker ABBA | live -27.85%、時間-0.31%。64桁全工程peakは0%変化。採用 |
| LP mapのu32/u64分離 | 固定64family・4Worker ABBA | live -8.66%、時間-0.04%、PSS+0.62%。u32外fallbackを保ち採用 |
| 全体予約4→8、credit2、輸送最大64MiB | 同じ4Worker・固定32family ABBA | 時間-25.59%、PSS-0.08%。有限容量のまま採用 |
| 4→5計算Worker（同じ8枠） | 各2試行・同じ32family | 時間-9.25%、PSS+6.55%。手動候補に採用。自動設定は保守的な最大2を維持 |
| reciprocal経由u32剰余をRust組込み演算へ | 10000境界/seed対照、40/64桁一致、32family ABBA | 時間-9.27%、PSS+1.03%。採用 |
| 役割別hardcap・全体CPU/メモリ設定・有限時間・cancel/fatal退役・独立因子検算 | 実Worker契約、fresh recovery、通信検出器陽性対照 | 実行・安全性の改良。速度改善率とは呼ばない |
| 選定ESM入口とrole別artifact/source pin・2clean再ビルド | 旧factory除去前後のWorker bytes一致 | 配布・再現性の整理。数学kernelの高速化とは別 |
| co1024＋helper64×4、手動1536MiB予算の明示大メモリ枠 | [Stage37の保護停止](../benchmarks/llm01-long-window.md)とStage38の成功 | 容量不足を解消した実験条件。512MiBを維持したままの最適化成果ではない |

上流にもWorkerによるfamily分割・Coordinator・DLP graphは存在する。この構造全体やSIMD/Lanczosを独自改良に数えない。主なpatchの追跡先は[native/graph-profile](../../native/graph-profile/README.md)、[最適化の構築手順](../operations/graph-optimization.md)、[LP map](../../native/lp-map/patch-source.mjs)、[有限長枠](../../native/long-window/README.md)、[選定入口](../../src/optimized/index.js)。

以下は検証して採用しなかった。負の結果も元の固定head・rawを維持している。

| 候補 | 結果・採用しなかった理由 |
| --- | --- |
| DLP product上限を半分/四分の一 | [2反復screen](../benchmarks/llm01-dlp.md)でgate不成立。大きい入力のlong比較へ拡張せず |
| B2.5M/3.25M × halfwidth262144/524288 | [固定2×2](../benchmarks/llm01-geometry.md)で採用候補なし。target・結合LP・A分布も変わる比較 |
| 6計算Worker | 4比-5.61%時間だがPSS+11.59%でgate超過、5より遅い |
| 集約専用1＋計算5 | combined5比、時間+0.81%、PSS+4.64%。harnessを回復して測った上で不採用 |
| resieve剰余の条件付き省略 / dense block16KiB | 時間-0.29% / +4.85%。事前5%改善gate不成立 |
| 順序保持index差分codec | payload削減0.30〜1.31%、初期live削減見積り0.125%。実装コストに見合うgate不成立 |
| 縮約行列構築前へfilter配列解放を移動 | [Stage39](../benchmarks/llm01-matrix-memory.md)で局所liveは減ったが64桁全工程peak変化0%。事前10%gate不成立、選定入口に反映せず、追加RSA100試行0回 |

## CPU・Worker・問題・時間・メモリの比較

本PCはCore i7-9700K @3.60GHz、WSL2上のHeadless Chrome155。実Chrome申告とWSL Nodeはいずれも論理CPU6で、CPU製品の8core表記とは異なる。deviceMemory=8は丸められた参考値で空きRAMではない。Worker数は物理core数やOS CPU使用率ではない。

まず同じホスト・問題・prefixでの比較。小さい画面の軽い入力やスマホ性能を、このRSA100の数値から換算しない。

| 実験 | 同じ仕事量 | Worker/予約枠 | request秒 | Chrome peak PSS MiB | 反復 |
| --- | --- | --- | --- | --- | --- |
| graph packed時点 | RSA100先頭32family | 4/4 | 93.147, 91.932 | 557.57, 557.81 | 2 |
| 同じkernel/保持方式 | 同上 | 4/8 | 69.032, 68.691 | 556.27, 558.20 | 2、4枠とのABBA |
| 同じ8枠のWorker比較 | 同上 | 4/8 | 69.305, 69.413 | 556.92, 552.14 | 2 |
| 同じ8枠のWorker比較 | 同上 | 5/8 | 62.141, 63.745 | 594.78, 586.98 | 2 |
| 同じ8枠のWorker比較 | 同上 | 6/8 | 64.814, 66.116 | 620.72, 616.85 | 2 |

これらは収集prefixの時間で、RSA100完了時間ではない。別の[60秒1/2/3/4Worker screen](../benchmarks/llm01-resources.md)ではusableが199/344〜376/423〜448/475だったが、4Workerでも全体容量待ちがあり、後の8枠比較で改善した。単純なWorker数倍の加速は観測されていない。

次は条件の異なる参考値。こちらで追試した同条件対照ではなく、速度順位やCPU補正後の優位性は算出しない。

| 出典・実装 | 問題 | CPU / runtime | Worker/thread | 経過時間 | メモリ・測定の限界 |
| --- | --- | --- | ---: | --- | --- |
| 今回の改変rusqsieve固定0.5.0 | RSA100、330bit | i7-9700K、WSL2、Chrome155 | 5、うち1つ集約兼任 | 2220.175秒、成功1回 | co requested peak482.72MiB、linear614.44MiB。Chrome tree RSS/PSS1706.79/1009.45MiB |
| [開発者のブラウザ報告](https://zenn.dev/menhera/articles/58245043ec1ab7)、v0.4.0 | 別の97桁、320bit | Ryzen5 7535Uノート、Chrome、非アイドル | 12 | 1981.4秒 | RAM・準備時間・反復数不明 |
| [固定commitの後続matched gate](https://github.com/metastable-void/rusqsieve/blob/4b150834b57636f6ebc350a81321a15c1cd901d2/BENCHMARKING.md#L106) | RSA100 | Xeon6975P-C、384logical CPUホスト、native | 192 | 54.01秒 | peak RSS約1.95GiB。ブラウザではない。固定0.5.0原本にも記載 |
| [固定原本に残る旧0.4 gate](https://github.com/metastable-void/rusqsieve/blob/4b150834b57636f6ebc350a81321a15c1cd901d2/BENCHMARKING.md#04-release-gate-measurements) | RSA100 | Xeon8259CL、native | 96 | 320.10秒 | peak RSS1.48GiB、単一gate。上段とは別ホスト/旧gate |
| [Yaffleの作者報告](https://github.com/Yaffle/QuadraticSieveFactorization#performance)、JavaScript SIQS/DLP | RSA100 | Core i7-1165G7、runtime未記載 | single | 約1.5時間 | RAM・反復・準備条件不明。今回のエンジンとして実行していない |

54.01秒の後続matched gateは固定0.5.0原本にも記載されている。320.10秒は同じ文書の旧0.4 gateであり、同じ条件や同じ時点の記録ではない。97桁と100桁は問題自体が違い、v0.4.0と0.5.0にも差がある。「Worker数が少ないのに同程度の時間」は興味深い観察だが、独自改良の効果を立証するmatched比較ではない。

[Geekbench公式Processor chart](https://browser.geekbench.com/processor-benchmarks/)の2026-10-21参照値は**Geekbench7**で、i7-9700K=1657/8002、Ryzen5 7535U=1730/6710、i7-1165G7=1517/4337（single/multi）。投稿結果の集計であり、このLLM-01でGeekbenchを実行した値ではない。異なるISA・memory・電力・WSL上限・5Workerへの競合、SIQSの整数/篩/メモリアクセスの比率を表さないため、score比やWorker数を掛けた補正秒数は出さない。

今回の2220.175秒はAPI requestの実時間で、Worker準備・収集・行列・GCD・退役を含む。asset取得・Nativeビルド・ブラウザ起動・事前契約・source guardは含まない。campaign全体は16:38:57.194Z〜17:16:31.877Zの2254.683秒で、事前契約等を含むが開発/ビルド/CIは含まない。成功1回なので分散、他seed/他入力、熱・電源条件の一般性は未測定。RAM peakは4071標本のsummary、時系列保存は256点へ間引いており瞬間最大値保証ではない。

## さらなる可能性と優先順位

| 優先 | 候補と期待 | 追加試験・制約 |
| --- | --- | --- |
| 1：次の研究開発候補 | 関係収集kernelの整数演算・root更新・candidate scanの効率改善 | 現行Chromeの固定4family診断ではresieve49.08%、score35.81%、根更新3.69%、候補走査1.26%（1Worker経過時間）。旧15秒profileを現状比率としない。倍率4は+7.42%、疎score省略は+1.52%で不採用。逆方向境界とbitmap索引を有限追試する |
| 2：別の有限計画 | 高収集量時点のB/interval/LP/threshold調整 | 既存60秒screenは不採用だが後半cycle収量の最適を否定しない。target・A分布・LP上限・行列費用を含む固定入力の通し比較が必要。未測定の完了時刻を外挿しない |
| 3：端末別の適応 | 5以外のWorker/予算設定、実機mobileの軽い経路 | 同じPCの6は不採用。CPU scoreでは決めず各端末の有限screen、取消/熱/応答性・最低メモリを測る。巨大割当による空きRAM探索はしない |
| 保留 | 大きい行列でのfilter早期解放の実効果 | 局所解放の正しさは確認したが小さい入力の全工程gate不成立。RSA100効果は未測定。今回の事前条件に従い追加長試行をしない |
| 費用が大きい別案件 | compiler更新、WebGPU/GNFS、大きなkernel再設計 | source/compiler差分の分離、多入力・実機、ライセンスと新しい設計/計算予算が必要。今回の完了を待つため無期限に増やさない |

成功requestでcoordinator wrapperのsieveは2143.236秒、submit23.907秒、observe0.531秒、extract42.592秒だった。重なる呼出時間でCPU利用率ではないが、集約や観測だけを削って大幅高速化する根拠は弱い。仮に抽出42.592秒を全て消してもrequestの約1.92%に相当するという単純上限の見積りであり、実装可能な短縮率ではない。

保持・同期候補は採用または負の結果まで閉じたが、本人の追加指示に従い、[Stage40の収集ホットパス診断と改善](../contracts/collection-profile.md)を継続する。既存計時の区分外だったresieve/C係数/score初期化/Gray B更新を含めて分け、現在の比率で優先順位を定める。過去profileを現状比率にせず、filter早期解放だけを最後の改善余地とは扱わない。関係式収集の評価は未完了であり、現時点で条件付きmerge/releaseを成立扱いしない。実機スマホ、Safari/Firefox、サイトReact island/manifest v1、multi-instance admission/CSP/通常サイト移動は別の受入であり、RSA100成功を本番統合済みとは扱わない。

[Stage40の現行phase・12試行・原本](../benchmarks/llm01-collection-hotpath.md)では、計測時間増加1.90%を確認した。旧filter早期解放だけを最後の改善余地とは扱わず、関係式収集の探索を継続する。

[Stage41の有限追試](../benchmarks/llm01-resieve-followup.md)では倍率1が約1.93%短縮、bitmap word-rankは約1.14%増。どちらも初回5%gate不成立。小差をゼロとせず、追加bufferを使わないresieve前半のループ順交換を次の具体的候補として検証する。
