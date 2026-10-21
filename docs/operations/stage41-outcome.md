# Stage41 resieve境界とbitmap rankの結果

[生成実測・原本](../benchmarks/llm01-resieve-followup.md)を正本とする。
固定head77238b1、2026-10-21T20:07:30.726Z〜20:12:23.510Z、1Worker・先頭4familyの独立ABBA。

- resieve倍率1：時間比0.9806678（約1.93%短縮）、PSS比0.9971685。
  5%の事前基準に届かず未採用。小差をゼロとは主張しない。
- bitmap word-rank：時間比1.0113700（約1.14%増）、PSS比0.9990879。不採用。
  追加65,600B/Workerの有限領域・index復元自体の正しさは確認した。
- 全8試行のpacket・列・counterがStage38成功原本と一致。通信0・全退役。
- 実際の旧新Rust関数886ケース、Native40/64全工程、各候補の共通22Chrome契約が成功。
  clock専用2件は対象外。source/ABI/個別停止・メモリ上限を維持した。
- 開始要求の返り値が中断した際は既存processとrunを確認し、同じcampaignを二重実行しなかった。

残る局所候補はresieve前半の2ループ順交換。新しいbufferなしで同じ剰余判定を行い、
candidateごとの因子昇順・48因子上限・全candidate処理・bitmap cleanupを保つ。
静的レビューで隠れたRNG/cache更新がないことを確認済み。別の事前契約で有限比較する。
倍率4／疎scoreの前段結果、旧filter解放・skip・dense候補、37分成功原本は保全する。
今回のscreenをRSA100の全工程時間へ外挿せず、改善枯渇・merge条件成立とは扱わない。

後続のprefix/score単独比較は[Stage41〜43のhandoff](stage41-43-outcome.md)へ完了記録を追加した。上記の段階別原本・判断を保全する。
