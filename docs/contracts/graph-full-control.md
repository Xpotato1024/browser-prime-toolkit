# 抽出比較の同一最終prefix対照

Stage26の4 owners系列ではtarget到達後のdrainで最終family数が360/362と揺れました。
原本は保持し、並列の全工程が完了した事実と、同一最終列の比較を区別します。
strictな採用判断はこの追加系列で行います。native artifactはStage25 compactとStage26 releaseのままです。

1 owner・同一input・同じtargetとfamily順に固定すれば、先行helperの残件なしで
同じfamilyでtargetへ到達できます。40/64桁の各baseline/release/release/baseline、
各30秒以内、全計算予算4分以内とします。4 ownersの時間とは比較しません。
抽出直前にcanonical columnsのSHA256を追加し、最終family数、全counters、全受理packet SHA、
最終列SHA、proper divisorから得るfactor pairを全試行で一致させます。
columns hashの時間・一時memoryも実測に含め、解析用に除外して速く見せません。

coordinator256MiB、WASM合計256MiB、transport32MiB/4枠、available4096MiB、
live160MiB/linear208MiB・Chrome PSS1536MiB soft stop、fatal優先、deadline/cancel/退役を維持します。
64桁のpeak requestedが10%以上減り、全工程時間中央値が10%超悪化しない条件を維持します。
この対照はRSA100のLA完了を代替しません。
