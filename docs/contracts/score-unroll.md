# score加算の4回展開を単独比較する（Stage43）

Stage40の現行1Worker・先頭4familyではscore加算35.81%、resieve49.08%。
resieve倍率4、倍率1、word-rankとprefixループ順はそれぞれ独立に比較し、
係数1の小幅短縮も含め原本を保全する。5% gate未達を改善効果ゼロとは言わない。
残る大きな現行処理を対象に、scoreの既存2回展開を4回へ増やす1候補を比較する。

対象はsieve_root_pairとsieve_dense_rootの反復本体だけ。既存上流の
SATURATING/wrapping意味、2根の順番と重複時の加算、tail、sentinel、
dense blockサイズ32KiB、coefficient2、builtin剰余とSIMDは維持する。
既存SIMDや上流scoreを独自発明と扱わない。新配列・uncheckedアクセスの拡大はしない。
denseのunsafe書込は4点の最大位置をloop条件で証明し、旧2回/1回tailを残す。
実際のstepはdense<8192、pair<score_lenであり既存有限interval内の3stepを扱う。
コードサイズ増加・register圧力で遅くなる可能性も測る。

契約を実装前にcommit。独立namespaceで2clean一致、性能artifactからoracleを排除。
旧score関数が必ず旧helperを呼ぶ別referenceを作り、574ケースで直接比較する。
446ケースにdense128ケース（端・重複・MAX・飽和/巡回・block境界前後・scratch roots）
を追加する。Native40/64の全packet/列/counter/因子、Chrome共通22契約と
固定head独立レビューを通してから計測する。

RSA100先頭4family、baseline/candidate/candidate/baselineの4試行、各90秒+30秒、
全体最大480秒。1Worker、hardmax1024MiB、手動1536MiB、slots8、輸送64MiB、
credit2、available>=4096MiB、Chrome PSS<1536MiB、初期memory<=2MiB。
Node24.19.0/実Chrome155/上流0.5.0/compiler/SIMD/pins固定、別buildと並行しない。
時間中央値比<=0.95、PSS比<=1.10、全packet/列/counter一致が初回gate。
通過時に別prefixの有限確認を設計し、不成立時も原本を保全する。
全工程時間の外挿、既知因子利用、保護解除、無制限探索は行わない。

今回の低費用候補群は境界倍率・索引・resieve順序・score展開までとし、
結果が改善基準未達なら候補を無条件に追加せず、次の方式の開発費用・残比率・
未検証事項を整理して停止判断を親へ返す。数学的新規性や改善余地ゼロは主張しない。
通常入口への採用、実機mobile、サイト統合と公開は別段階。merge/release条件の
判定には最終headの全試験・CI・独立レビューと依存PR一覧を要する。
