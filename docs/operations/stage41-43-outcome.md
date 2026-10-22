# Stage41〜43のhandoff

[候補の採否・停止判断・残件](../architecture/hotpath-candidate-closeout.md)を正本とする。
4候補を独立ABBA計16試行で比較した。係数1 -1.93%、rank +1.14%、
prefix -1.63%、score4回展開 -1.23%。いずれも事前5%gate未達で未採用。
全packet・列・counterはStage38成功原本と一致し、通信0・全Worker/source/port退役。
通常入口・37分成功artifactは変更していない。

各stageの契約を実装前にcommitし、2clean build、別oracle、Native40/64、
Chrome共通22契約と固定head独立レビューを済ませてから性能計測した。
時計専用2契約は対象外。性能測定中は別buildを実行していない。
prefix oracleのoverflow後継続ケースを強化してから同head機能試験を完了し、
その後にABBAを開始した。初期oracle/receiptと負の結果もローカル保全。

保存済み比較のCI再検証はcheck:resieve-results、check:resieve-prefix-results、
check:score-unroll-results。計算artifactのsource pins・2clean・zero-import・
初期/最大memory・oracle混入排除は通常checkでも検査する。
新しい性能試験・RSA100長時間試行はCIから自動実行しない。
最終headのnpm test/check、独立レビューとCI結果はDraft PR本文へ記載する。

PR24の最終db37e0dは581tests/check、独立レビュー2系統0件、CI42チェック成功。
旧headの原本取得TLS timeoutとCI全体15分超過は最終headで解消済み。
source/hash/TLS/個別停止は維持し、全体CI予算のみ20分に固定している。

現時点で追加承認待ち・接続阻害はない。残件は小幅効果の独立確認を行うかの判断、
release内容と通常選定入口の確認、実機mobile、サイト側の受入。
改善余地ゼロ・merge/release条件成立とはしておらず、Ready/merge/release/deployは行わない。
