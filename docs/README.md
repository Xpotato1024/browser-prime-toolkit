# 文書の役割と実装段階

現行の契約は contracts、製品要件は product、実装構成は architecture、作業手順は operations に置きます。
adr は判断の履歴、legacy は受領物の静的評価です。現行仕様の代わりにはしません。
doc/ は作成せず docs/ に統一します。

- [要件](product/requirements.md)
- [整数入力・累乗表示の契約](contracts/numeric-input.md)
- [構成と段階](architecture/overview.md)
- [ライブラリ評価](architecture/library-evaluation.md)
- [半素数分解の性能評価計画](architecture/performance-plan.md)
- [既存サイト形式に対する受入仕様案](contracts/site-adapter.md)
- [BigInt 採用判断](adr/0001-native-bigint-first.md)
- [旧 ZIP の静的評価](legacy/static-assessment.md)
- [開発手順](operations/development.md)
- [受入条件](operations/acceptance.md)
- [TDD 実行記録](operations/tdd-evidence.md)

初回 PR の対象は正確な入力解釈と、与えられた因数の累乗集約です。
素数判定・素因数分解そのもの、Worker、ブラウザ UI、サイト連携は後続段階です。
