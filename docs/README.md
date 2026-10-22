# 文書の役割と実装段階

現行契約は contracts、要件は product、構成は architecture、作業手順は operations に置きます。
adr は判断履歴、legacy は受領物の静的評価、benchmarks は測定条件と証跡です。
doc/ は作らず docs/ に統一します。

- [要件](product/requirements.md)
- [整数入力・累乗表示](contracts/numeric-input.md)
- [計算・Worker契約](contracts/factor-worker.md)
- [構成](architecture/overview.md)
- [ライブラリ評価](architecture/library-evaluation.md)
- [半素数の性能評価計画](architecture/performance-plan.md)
- [高度方式・旧GMP API・GNFS・並列の採否](architecture/advanced-factorization-candidates.md)
- [限定WASM MPQS判断](adr/0003-bounded-wasm-mpqs.md)
- [GMP/ECM評価判断](adr/0004-gmp-ecm-evaluation.md)
- [保守的engine選択の判断](adr/0006-conservative-engine-selection.md)
- [採否・公開前判断の区切り](architecture/engine-selection-closeout.md)
- [固定holdout](benchmarks/llm01-selection-holdout.md)
- [SIQS長予算・fresh並列ECM・p−1の実測](benchmarks/llm01-supplement.md)
- [再評価の境界](architecture/supplementary-evaluation.md)
- [Alpertron選択原本の静的確認](architecture/alpertron-source-review.md)
- [有界SIQSの判断](adr/0005-bounded-siqs-runtime.md)
- [有界SIQSの原本・実行・安全性](architecture/bounded-siqs-source-review.md)
- [GMP/ECM原本・再現ビルド・配布境界](architecture/gmp-ecm-source-review.md)
- [WASMと並列の実測](benchmarks/llm01-wasm-mpqs.md)
- [低位GMP・ECMと1/2 Workerの実測](benchmarks/llm01-gmp-ecm.md)
- [有界SIQS・ECM stage2とRAMの実測](benchmarks/llm01-bounded-siqs.md)
- [既存サイト形式との差分](contracts/site-adapter.md)
- [初回BigInt判断](adr/0001-native-bigint-first.md)
- [計算候補比較と基準実装](adr/0002-budgeted-worker-baseline.md)
- [旧ZIP評価](legacy/static-assessment.md)
- [開発手順](operations/development.md)
- [browser検証手順](operations/browser-verification.md)
- [受入条件](operations/acceptance.md)
- [TDD記録](operations/tdd-evidence.md)
- [LLM-01の比較実測と限界](benchmarks/llm01-baseline.md)

PR1は整数入力・累乗集約、依存するPR2は予算付き計算・Worker・browser検証です。
依存PR3は限定MPQS/WASMと並列比較、PR4は低位GMP Brent/ECMの非公開評価と真SIQSのobject-only確認です。PR5は有界SIQSの最小実行とECM stage2停止・fatal退役、Chrome RAM計測を評価します。最終engine、製品UI、サイト統合、公開は後続段階です。

PR6はnative/ECMの暫定候補、純粋selector、新6問holdout、公開前の本人判断点を整理しました。
PR7は[ADR0007](adr/0007-siqs-parallel-supplement.md)に従い、早すぎた探索終了判断を訂正してSIQS/並列/補助方式を有限再評価します。公開用scheduler・UI・site profile・配布は別段階です。

PR8は[ADR0008](adr/0008-counted-siqs-lanczos.md)のclock/callback分離と有界Lanczosを比較します。[固定実測](benchmarks/llm01-counted.md)、[原本・上限](architecture/counted-lanczos-review.md)、[TDD](operations/stage8-tdd-evidence.md)を分け、公開用scheduler/UI/site判断は後続へ戻します。

PR9は[ADR0009](adr/0009-staged-selector.md)に従い、一般群90反復で暫定方針を固定してから、未使用holdout120反復を確認します。[反復比較](benchmarks/llm01-staged.md)、[TDD](operations/stage9-tdd-evidence.md)、[公開前判断](architecture/staged-publication-decisions.md)を分けます。比較した全方式・旧raw・原本pin・再現情報は[保全目録](benchmarks/comparison-catalog.md)にまとめ、未採用でも削除しません。

PR10は[ADR0010](adr/0010-private-exact-ui.md)の非公開全桁UIを実装します。[利用・検証](operations/private-ui.md)、[TDD](operations/stage10-tdd-evidence.md)、[RSA30秒指標の後続計画](architecture/rsa-30s-plan.md)を分け、既存比較証跡と公開判断の境界を保ちます。

PR11は[ADR0011](adr/0011-rsa-30s-profile.md)の独立RSA30秒profileを設計・試験します。[backend実上限とSIQS拡張設計](architecture/rsa-backend-limits.md)を分け、現行profile・UI・比較証跡を保全します。[実測と限界](benchmarks/llm01-staged-rsa.md)、[実行・測定契約](operations/rsa-profile.md)と[TDD](operations/stage11-tdd-evidence.md)を分けます。

Stage13は[ADR0013](adr/0013-large-sparse-siqs.md)に従い、[full SIQS原本と境界](architecture/full-siqs-source-review.md)、[操作](operations/full-siqs.md)、[TDD](operations/stage13-tdd-evidence.md)を追加します。Stage12のBrent長枠は[途中記録](operations/minute-evaluation.md)へ保全しています。

Full SIQSの[桁数別・RSA100の実測と限界](benchmarks/llm01-staged-full.md)は、固定4組・全raw・source結合を検査する生成報告です。未記載の中間桁は未測定です。

[次段階のfull SIQS profile候補](architecture/full-siqs-profiling-next.md)はsource由来の事実と未測定の改善仮説を分けています。

Stage14は[ADR0014](adr/0014-siqs-lab.md)と[事前固定した短時間比較](../bench/siqs-lab-plan.json)に従い、任意の計測コスト、SIQS設定、共通関係式グラフを持つ1／2 Workerを別々に評価します。既存Stage13の実行系・実測は保全します。

Stage14の[実測・全raw](benchmarks/llm01-siqs-lab.md)、[観測と次の判断](architecture/siqs-lab-findings.md)、[操作・測定契約](operations/siqs-lab.md)、[TDD証跡](operations/stage14-tdd-evidence.md)を分けます。verifiedは輸入関係式の検証成功を表し、因数分解完了ではありません。

Stage15は[ADR0015](adr/0015-siqs-optimization.md)に従い、同一ソースの有限取得回復とLTO／監視条件の固定28比較を行います。[実測と全raw](benchmarks/llm01-siqs-opt.md)、[解釈と次の対象](architecture/siqs-optimization-findings.md)、[操作](operations/siqs-tuned.md)、[回帰証跡](operations/stage15-tdd-evidence.md)を分け、RSA100完了と関係式検証を区別します。

Stage16は[full経路の実測・全raw](benchmarks/llm01-full-opt.md)、[資源ガードと次の比較](architecture/full-siqs-optimization-findings.md)、[TDD証跡](operations/stage16-tdd-evidence.md)を追加します。RSA-100未完了と公開前の制約を維持します。

Stage17: [SIMD comparison](benchmarks/llm01-rusqsieve.md), [contract](contracts/rusqsieve-evaluation.md), [operations](operations/rusqsieve-evaluation.md), [TDD](operations/stage17-tdd-evidence.md), [current methods](architecture/current-siqs-methods.md). No public adoption or RSA-100 completion is claimed.

Stage18: [fixed DLP results](benchmarks/llm01-dlp.md), [contract](contracts/dlp-evaluation.md), [operations](operations/dlp-evaluation.md), [TDD](operations/stage18-tdd-evidence.md), [native rebuild/source mapping](../native/rusqsieve-dlp/README.md). Performance, observed memory and conditional long-gate results are reported separately.

Stage19: [scheduler contract](contracts/scheduler-evaluation.md), [operation and test method](operations/scheduler-evaluation.md), [actual TDD/preflight evidence](operations/stage19-tdd-evidence.md). The numeric kernel remains the Stage18 baseline.

Stage20: [conditional geometry contract](contracts/geometry-evaluation.md), [operations](operations/geometry-evaluation.md), [TDD/build evidence](operations/stage20-tdd-evidence.md), [native artifact mapping](../native/rusqsieve-geometry/README.md). Only the predeclared four geometries are screened.

Stage19 [measured scheduler results](benchmarks/llm01-scheduler.md) select finite ahead credit for further experiments. Stage20 [all geometry results](benchmarks/llm01-geometry.md) retain the original B/M settings under the fixed gate. [Interpretation and integration boundary](architecture/scheduler-geometry-findings.md) keep collection evidence separate from completion and site adoption.

Stage21: [finite device resource contract](contracts/device-resources.md), [decision](adr/0021-finite-device-resources.md), [private entry and reproduction](operations/device-resources.md), [TDD and preserved corrections](operations/stage21-tdd-evidence.md). The original entry and site integration boundary remain unchanged.

Stage21 [all owner-count results](benchmarks/llm01-resources.md) preserve1..4-worker packet identity and measured limits. Stage22 [dedicated-coordinator contract](contracts/coordinator-evaluation.md), [operations](operations/coordinator-evaluation.md) and [TDD](operations/stage22-tdd-evidence.md) isolate host scheduling under the same four-owner budget.

- [Device resource implementation and bounded results](operations/device-resource-handoff.md)
- [Stopped coordinator study](operations/stage22-outcome.md)

Stage23: [追加事前契約](contracts/sustained-evaluation.md)、[TDD・固定family照合](operations/stage23-tdd-evidence.md)。PR17と旧Stage22の原本を保持し、集約方式・持続計測を別に評価します。

Stage23/24: [集約・300/600秒の全結果](benchmarks/llm01-sustained.md)、[占有率・待ち・graph成長](benchmarks/llm01-sustained-observations.md)、[原本と再現境界](operations/sustained-measurement.md)、[継続集計のTDD](operations/stage24-tdd-evidence.md)。旧停止原本とsourceを保持しています。

[Stage23/24 の結果と残件](operations/stage23-24-outcome.md)。
Stage25: [graph保持量・抽出移行の事前契約](contracts/graph-profile.md)、[可逆root保存artifactと再現手順](../native/graph-profile/README.md)。旧計測原本と公開入口を維持します。

Stage26/27: [不可逆な抽出移行](contracts/graph-release.md)、[部分関係式の可逆packed保存](contracts/graph-arena.md)。各候補は別source・別予算で比較し、旧原本を維持します。

Stage28〜35: [保持・抽出・並列・数値hot pathの全比較](benchmarks/llm01-graph-optimization.md)、[操作と測定契約](operations/graph-optimization.md)、[選定済みESM入口](contracts/optimized-engine.md)、[マージ依存順とrelease条件](operations/graph-release-readiness.md)。[powers可逆圧縮](contracts/graph-varint.md)、[篩局所変更](contracts/graph-hotpath.md)、[差分サイズ診断](contracts/graph-width-diagnostic.md)は独立した有限仮説として扱います。

[Stage25〜35の採否・TDD・残件](operations/stage25-35-outcome.md)は、生成実測と未測定仮説を区別した今回の引渡し境界です。

Stage36: [LP mapの幅縮小と有限長枠の事前契約](contracts/lp-map.md)。PR19を固定対照とし、性能比較は静穏枠で行います。

Stage36の[固定64family全結果](benchmarks/llm01-lp-map.md)は、全packet/列/counter一致と全体live要求8.66%減を確認した採用判断です。

[Stage36の実測・保留境界](operations/stage36-outcome.md)は、数値gate成立と選定入口の未反映、長枠の阻害を分けています。

Stage37: [有限長枠・抽出割当ガード](contracts/long-window.md)と[固定試行plan](../bench/staged-long-window-plan.json)。本人承認後にLP mapを選定128/256 roleへ反映し、旧ABBA baselineのsource SHAを固定した。通常入口と長枠を分離する。

Stage37結果: [有限長枠の実停止・取消・監視修正](benchmarks/llm01-long-window.md)。固定512MiB枠ではcoordinator保持メモリで停止し、大行列は未到達。失敗原本と成功原本を分離して保存する。

Stage38: [明示的な有限大メモリ枠](contracts/wide-window.md)と[固定plan](../bench/staged-wide-window-plan.json)。Stage37のcoordinator保持制約を対象に、通常入口を変えず、co1024役割と監視・取消を検証する。未測定の完了時間を外挿しない。

Stage38結果: [RSA100の明示大メモリ枠での通し実測](benchmarks/llm01-wide-window.md)。proper divisor・独立因子積・probable判定まで成立した1回の記録で、通常600秒や他端末の完了保証には換算しない。

[Stage38の検証・残るfilter保持候補](operations/stage38-outcome.md)。成功した原本と、未検証候補・最終head確認を分ける。

Stage39: [縮約行列構築前のfilter配列解放の有限比較](contracts/matrix-memory.md)。Stage38の成功原本を固定し、実測peak区間の1候補だけを別headで検証する。

[Stage39全結果](benchmarks/llm01-matrix-memory.md)、[独自改良・CPU/Workerを含む総合比較](architecture/own-improvements-and-comparison.md)、[不採用判断と残る検証](operations/stage39-outcome.md)。

Stage40: [収集ホットパスの段階診断と有限改善](contracts/collection-profile.md)。PR23の保持候補は保存し、既存SIMDと過去の剰余/skip/block比較を踏まえて現状を測る。

Stage40: [現行収集16phaseと独立2候補の全比較](benchmarks/llm01-collection-hotpath.md)、[事前診断契約](contracts/collection-profile.md)、[候補契約](contracts/collection-candidates.md)、[修正・採否・継続判断](operations/stage40-outcome.md)。resieve/scoreを優先し、今回の2候補は不採用。改善探索は継続する。

Stage41: [resieve倍率1・bitmap rankの全8試行](benchmarks/llm01-resieve-followup.md)、[事前契約](contracts/resieve-followup.md)、[採否・次の局所候補](operations/stage41-outcome.md)。時間比0.98067/1.01137で初回gate不成立。原本と小差を保全する。

Stage42/43の[prefix](benchmarks/llm01-resieve-prefix.md)・[score展開](benchmarks/llm01-score-unroll.md)を独立比較した。[候補群の採否・停止判断](architecture/hotpath-candidate-closeout.md)、[最終検証の入口](operations/stage41-43-outcome.md)を参照。小幅短縮も事前5%gate未達として未採用で、改善余地ゼロとは扱わない。

Stage44: [小幅改善2候補の均衡32反復](benchmarks/llm01-hotpath-repeat.md)、[選定反映契約](contracts/selected-wide.md)、[追加機能試験](benchmarks/llm01-selected-wide.md)、[採否と残件](operations/stage44-outcome.md)。係数1を専用wide入口へ反映し、通常UI・公開を変更しない。

[サイト配布0.1.0の有限計算・受入契約](contracts/site-release-v1.md)は、本人承認を受けた公開用adapterと専用profileを定義します。過去研究の測定SHA・原本・通常入口を保持します。
