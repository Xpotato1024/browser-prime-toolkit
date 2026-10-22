# 0006: 設計探索を区切る保守的engine候補
日付: 2026-10-19。状態: 実装前に固定する非公開評価方針。

新方式のportは増やしません。既存測定から候補をnative BrentとECMへ絞り、
selector-v1は入力全体が2^64未満ならnative Brent、2^64以上2^256未満ならECMを提案します。
0/1は共通工程でneither。2^256以上はselector対象外で、素数性・分解不能を推定しません。
閾値は最適化の推定値ではなく、保守的な運用上の区切りです。
未知の因子サイズやbalanced性を入力bit数から知ったように振る舞いません。

限定MPQSは48〜85bitの明示的評価候補へ残し、自動fallbackには含めません。
GMP Brent、今回の有界SIQS、GNFSは自動選択から除外します。
新しい自動方式名・学習・input別cache・remote判定は追加しません。
selectorは既存algorithm/optionsを返す純粋関数とし、共通計算coreとproof契約は変更しません。
native-only bundleを追加し、native経路でWASMをinstantiateしないことを確認します。
候補ECMは既存固定bundleを使い、公開licenseやsite採用を承認したことにはしません。

既定は1 Worker。2 Workerは既存の明示的比較に限定し、自動で増やしません。
計算予算は共通Budget一つで全余因子・前処理を含み、方式切替によるresetはありません。
初期化deadline5秒、計算timeBudgetMs、配送猶予100msを分け、名目のrequest envelopeを明示します。
initialization/ready後/全request実時間を別計測します。OS/event-loopの厳密時間保証ではありません。
同時Worker所有数・線形hard上限と、GCを含むbrowser全体RAMを区別します。

方針固定後に既存corpusと重複しない6入力を生成し、固定seed・1秒・各1回、
selector/native-only/ECMの18計算だけをfresh Workerで比較します。
因子は計測外の独立exhaustive uint64 trialで検証し、M127 controlはprobable扱いを維持します。
結果を見て閾値やseedを調整しません。旧長時間測定は再実行しません。
最終headのtests/CI/独立レビューを必要とし、PR5依存のDraftで返します。
公開license/配布/React/UI/site/CSP/Ready/merge/deployはこの探索の対象外です。
