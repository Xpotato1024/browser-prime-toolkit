# 現行ホットパスの有限候補比較と次の判断

2026-10-21、LLM-01の現行コードを対象にした今回の候補群をここで閉じる。
計測後に採用基準を下げず、通常入口の計算コードは変更しない。
「改善余地ゼロ」「これ以上の研究は不要」という結論ではない。

## 得られた結果

同じ上流0.5.0・compiler・SIMD・基準long-1024、1Worker、RSA100先頭4familyを使った。
各候補はbaseline/candidate/candidate/baselineの各2回、候補同士を混ぜず独立比較した。
時間中央値比<=0.95、PSS比<=1.10、数学一致が事前の初回gate。

| 候補 | request時間変化 | Chrome tree PSS変化 | 判断 |
| --- | ---: | ---: | --- |
| resieve境界係数2→4 | +7.42% | +0.27% | 遅くなり不採用 |
| 疎scoreのsentinel書込を省略 | +1.52% | +0.21% | 遅くなり不採用 |
| resieve境界係数2→1 | -1.93% | -0.28% | 小幅短縮、5%gate未達・未採用 |
| bitmap word-rank | +1.14% | -0.09% | 遅くなり不採用 |
| resieve prefixをprime外側へ交換 | -1.63% | +0.40% | 小幅短縮、5%gate未達・未採用 |
| score加算の2回→4回展開 | -1.23% | +0.33% | 小幅短縮、5%gate未達・未採用 |

[最初の2候補](../benchmarks/llm01-collection-hotpath.md)、
[境界係数1・rank](../benchmarks/llm01-resieve-followup.md)、
[prefix](../benchmarks/llm01-resieve-prefix.md)、[score展開](../benchmarks/llm01-score-unroll.md)が正本。
後半4候補の全16試行はpacket・列・各prefix counterが37分成功原本と一致した。
原本・負の結果は可逆圧縮で保持し、改変せず固定headへ結合して再検証する。
旧新Rust関数oracleは候補ごと443/443/446/574ケース、Native40/64全工程の因子一致、
各候補の実Chrome共通22契約、取消・fresh recovery・通信ゼロ・全退役を確認した。
時計専用2契約は時計なし候補の対象外で、harness記録は各24エントリ。

2点ずつの中央値は分布・有意差・別端末での再現性を証明しない。
係数1・prefix・score展開を「効果ゼロ」とは呼ばず、単純に足した複合改善率も示さない。
今回のscreenで変更後のRSA100完了時間は測っていない。追加長時間試行は0回。

## どこが支配的だったか

[現行phase診断](../benchmarks/llm01-collection-hotpath.md)の時計overheadは約1.90%、
1Worker先頭4familyのexclusive経過時間でresieve49.08%、score加算35.81%だった。
これは上流SIQS全体の普遍的比率や、5Workerの37分成功時のCPU比率ではない。
「関係式収集=純粋なふるい」とは扱わない。

| 処理 | 観測割合 | 次の費用判断 |
| --- | ---: | --- |
| resieve | 49.08% | 境界・索引・ループ順の局所候補を比較済み。小幅効果は再確認余地あり |
| score加算 | 35.81% | 疎write・既存dense block変更・4回展開で大幅改善の根拠なし |
| 残余分類 | 3.90% | さらなる分解内訳が必要。新しい数学・cacheを根拠なく追加しない |
| SIMD根更新 | 3.69% | 既存上流SIMDを使用済み。現traceでの単独改善の余地はscore/resieveより小さい |
| 候補復元・trial divisionの親exclusive | 2.33% | resieve/残余分類の子を含まない。既採用builtin u32剰余の効果とは重複計上しない |
| 候補走査 | 1.26% | 同じ1Worker traceで完全に除けてもこの部分だけ。優先度は低い |
| 初期根・Bainv | 1.25% | 数学同値を要する。root SIMD更新とは別 |
| A選択 / CRT-B / C / Gray-B | 0.14% / 約0.00% / 0.07% / 0.01% | 現traceで小さい。古いprofileを現在の根拠として使わない |

Rust packet化は約1.15ms、Native submitは約47.45msだった。
JS packet転送・並列Worker待ち時間はこの2値に代表させない。
これらが小さい1Worker結果だけで、5Workerの通信・順序待ちを支配的でないと断定できない。
以前のslots/credit・4対5Worker比較は[総合比較](own-improvements-and-comparison.md)へ保全してある。

## 今回の停止判断と残る選択肢

1. プロファイルで支配的だったresieveとscoreに対し、低費用・追加bufferなし等の6候補を有限比較した。
   5%以上の初回基準を満たす候補はなく、候補を次々増やす探索はこの段階で止める。
2. 最も安価な次の判断は、係数1などの1〜2%差を別family範囲・固定回数で確認すること。
   行うなら許容する効果幅・試行数・停止条件を新しいデータを見る前に別契約で決める。
   今回の5%gateを事後に書き換えて採用したり、複数候補中の最良値だけを採らない。
3. 新たなSIMD化・compiler変更・bucket方式等は未検証の設計候補であり、今回の否定結果で排除しない。
   実装費用・コード量・数値/メモリ不変条件・実機範囲を見積もってから別工程にする。
4. [filter配列の早期解放](../benchmarks/llm01-matrix-memory.md)は40/64の全体peak gateに届かず未採用。
   64桁局所live約2.84MiB減をRSA100全体の効果へ外挿せず、「最後の改善余地」と呼ばない。

上流SIQS/filter/Block Lanczos/GCD・既存SIMDそのものは独自貢献ではない。
独自の保持構造・LP map・有限scheduler・builtin剰余等の採用効果と、
異なるCPU/Worker/問題の参考比較は[総合比較](own-improvements-and-comparison.md)を参照する。
基準のRSA100成功は固定d1e0b865、5Worker、2220.175秒、1回。
今回の候補はこの成功経路を置換していない。

## handoffと公開の境界

最終headのnpm test/check・独立レビュー・CIを揃えて、日本語Draft PRで後半4候補を返す。
PR24が前提で、現在の依存PRは1→2→…→24→本PRの順。DraftはReady化していない。
今回のgate未達だけを独自実装全体の改善枯渇・条件付きmerge/release成立とは扱わない。
小幅効果の再確認、releaseに含める選定入口と実験枠の確認は次の判断に残る。
実機mobileは未確認。OS強制終了を防げるという保証はない。
サイト側の旧分解機撤去・プラグイン受入・本番切替は別工程で、本変更では実施しない。
