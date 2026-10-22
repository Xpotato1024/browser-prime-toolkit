# Stage39 filter保持候補と総合比較

固定head1181a66c9e41e92ac33cd38e53643281a08487ad、clean・独立読取2名指摘0件の状態で、40/64桁各ABBAの8試行を実行した。campaignは17:56:23.458Z〜17:57:38.597Z、全child exit0。[生成結果](../benchmarks/llm01-matrix-memory.md)に全packet/counter/列/因子一致、requested peakと時間、可逆証跡を固定する。

64桁の局所liveは減少したが、全工程peakは同じ12,356,156 bytes。中央値時間は+0.17%、40桁は-2.90%。事前のpeak10%以上削減gate不成立で不採用。選定Workerへの反映や追加RSA100試行は行わない。RSA100で効果がないと証明したとは扱わない。

候補Nativeは2clean439882bytes/SHA ecbcf8878302be7c743b487572dd24927b9bb10ba466775aed7d727f56142b52、compiled source差分はf2の不要配列寿命・marker26のみ。旧upstream・patch・Native・測定原本は維持。最初のbuildは出力dir未作成で失敗し、正規builderのmkdir追加後の2cleanが成功した。失敗logはprime-stage39/native-build-output-directory-failed.logへ保持。旧artifactに対する赤→新artifactの緑・固定head再実行を同scratchへ保持する。

[日本語の総合比較](../architecture/own-improvements-and-comparison.md)は先行実装の貢献、独自の実装改良、採否、CPU/Worker/問題/時間/メモリと未検証候補を分ける。固定0.5.0原本にも含まれる54.01秒の後続matched gateと、同じ文書の320.10秒の旧0.4 gateは異なるhost/測定時点なので区別する。独立reviewで固定原本の54.01秒段落を確認し、初稿の版帰属の誤りを訂正した。

今回の局所候補は負の結果まで閉じた。merge/release条件の残りは最終head test/check・2名の独立review・CI、実PR依存順と最終release内容の確認である。保護解除や無限探索、サイト本番切替、credentials/権限変更は含めない。独立reviewで候補が見つかれば具体的な重要度と再現性を評価して解消する。
