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
- [GMP/ECM原本・再現ビルド・配布境界](architecture/gmp-ecm-source-review.md)
- [WASMと並列の実測](benchmarks/llm01-wasm-mpqs.md)
- [低位GMP・ECMと1/2 Workerの実測](benchmarks/llm01-gmp-ecm.md)
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
依存PR3は限定MPQS/WASMと並列比較、PR4は低位GMP Brent/ECMの非公開評価と真SIQSのobject-only確認です。最終engine、真SIQSの実行対応、製品UI、サイト統合、公開は後続段階です。
