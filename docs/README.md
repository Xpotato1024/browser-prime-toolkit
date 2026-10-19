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
