# Stage24: 継続集計のTDDと原本保持

旧Stage23は60秒集約比較を4件取得した後、`pairedDecision` の重複ID検査で停止しました。入力のID `RSA-100` がplanの試行IDを上書きする集計の不具合です。旧sourceとraw/logを変更せず、300秒以降が未着手であることを確認しました。

新helperのimportが存在しない状態で `test/sustained-trial-record.test.js` を実行しredを保存し、実装後に2件greenを確認しました。同じRSA100入力でも4試行のIDを保持し、重複試行ID・異なるcase/input・不正なパスを拒否します。SHA改変と既存出力先も拒否します。

独立レビューの指摘を受け、旧manifestのSHA `62681bc52b71dfb302999ff16d7d16f200e90c40cd3afbc067a506febee30683` を新coreへliteralで固定しました。固定core `ed207f4a9e5aac90b914a8a21ec6b515f292a92b` で計算を始める前に、5契約確認・3固定family・4集約比較のraw/log/source/head・順序・引数・quiet・退役・digest/family/prefixを再検証しました。旧7測定記録を検証し、集約比較の正しい試行IDでの採用判定が完了しました。

継続は数値source・Worker・WASM・計測harnessを変更せず、未取得の予定だけを新ディレクトリへ保存します。旧系列を完了へ書き換えません。結果と制約、最終検証は [再現境界](sustained-measurement.md) と最終計測reportへ記録します。
