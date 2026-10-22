# Stage24: 計測の継続と識別子の契約

Stage23 core `2a88e59a5740d204dda40c474fa4959db454062d` は、5契約確認・3固定family・4集約比較を取得した後、集計時の試行ID重複検査で停止しました。rawの入力ID `RSA-100` が試行IDを上書きする集計不具合です。原本・停止理由・旧sourceは変更しません。数値kernel・Worker・stream監査・harnessの変更や既取得試行の再実行はしません。

継続は旧manifestのSHAと旧headを固定し、全原本のSHA、source/head、順序、引数、入力、quiet、退役、cap、family/prefixを再検証してから開始します。試行IDはplanから、caseIdはrawから別々に検証します。旧証跡の参照先はStage23のみ、新証跡は排他的に作成するStage24のみです。新helperは事前commitし、新head/hashをmanifestに記録します。

残りは元の300秒ABBA 2/4/4/2、120秒取消2件、元gate成立時だけ600秒ABBAです。元の資源・時間・予算・採用基準を維持し、再試行・上書き・数値パラメータ調整はしません。旧系列を完了に書き換えません。22:00 UTC以後の新探索は禁止です。

同じcaseIdの4試行の一意性、重複試行ID・case/input不一致・原本改変・出力先既存を拒否する回帰試験を行います。独立レビュー後に継続します。結果は両系列を明示した新reportで再検証し、日本語Draft PRへまとめます。
