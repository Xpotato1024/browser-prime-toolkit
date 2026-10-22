# Stage40 関係式収集の診断と2候補の採否

現行Chrome経路を16phaseへ分けた診断と、2つの独立候補を有限比較した。
[生成実測と全証跡](../benchmarks/llm01-collection-hotpath.md)を正本とする。

- 診断head741c741、1Worker・RSA100先頭4familyのABBA。時計による時間増加1.90%。
- exclusive resieve49.08%、score35.81%、根更新3.69%、候補走査1.26%。
  5Worker成功時のCPU比率や全工程進捗を表さない。
- 候補head63c9f34、resieve倍率4は時間+7.42%、疎score省略は+1.52%で両方不採用。
- 全12試行のpacket・列・counterがStage38成功原本と一致。追加の長時間RSA試行は0回。
- 旧実関数と新実関数870ケース、Native40/64全工程、実Chrome各24契約を確認。
  通信0、Worker/source/port全退役、時計異常時の次ジョブ未実行を維持した。

## 赤・修正・緑

時計scope未実装の旧artifactではprobe export検査が失敗し、実装後にnested/exclusive、
早期return、逆行／非有限clock、200万call上限が通った。
frame128不足と時計異常時のmessage競合は独立レビューで検出し、2048・保持1件と
Worker送信前の同期拒否へ修正した。境界2048/2049と異常時計の回帰は赤→緑。
旧zero-import検査による診断artifactの開始前拒否は、唯一のclock importだけを許可して修正。
通常artifactのimport禁止は不変である。

Native oracle初版の型不一致、非整列synthetic root、初回driverの変数衝突も原本保存した。
正規化rootという既存kernel前提を守るfixtureへ修正し、435ケースずつ成功した。
失敗は計算方式の速度評価へ混ぜていない。

## 残件と継続判断

2候補の不採用を改善枯渇とは扱わない。倍率4で遅くなったという観測を踏まえ、
逆方向の境界調整とbitmap word-rankによる探索削減を次の有限候補として設計する。
根更新とreport走査は既存上流SIMD。A選択はこのprefixで0.14%なので優先度を下げる。
filter配列早期解放の局所効果・不採用原本、旧skip/dense候補も保全する。

この段階で候補を選定Workerや本番入口へ反映しない。merge/release条件は未成立。
本番サイト、旧分解機撤去、React island受入、実機mobileは別工程である。
最終headのnpm test/check、独立レビュー、CIの結果はDraft PRへ追記する。
