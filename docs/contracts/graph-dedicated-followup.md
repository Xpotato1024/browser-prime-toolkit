# 保持枠拡張後の集約専用役対照

Stage31はStage29/30の採否後、採用された同じ数値kernel・8reservation枠に固定する。5 Worker combined（coordinatorも計算、計算役5）と6 Worker dedicated（coordinator専用、helper計算役5）を比較する。CPU担当数を揃え、専用集約役が返却→受理待ちを減らす仮説だけを評価する。

両方coordinator256MiB/helper64MiB。合計WASM512/576MiB、明示予算512/768MiB。packet8MiB、全体8枠/64MiB、credit2、digest16MiB/8件。開始MemAvailable>=4096MiB、Chrome PSS1536MiB、coordinator live160MiB/linear208MiBの停止を維持。固定32family、最大120秒をABBA4回、合計480秒以下。ビルドと他計算を併走しない。

全packet/列SHA/native countersの一致、退役/期限/取消の契約を必須とする。同じ計算役5で中央値5%以上短縮、PSS1.10倍以下なら候補採用。改善が小さい場合は追加Workerの複雑さを増やさずcombinedを維持する。負の結果を保持し、短時間収量からRSA100全工程時間を推定しない。元の4枠dedicated実験とは別の対照であり、その原本を訂正/削除しない。
