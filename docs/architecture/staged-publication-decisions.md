# 段階選択の公開前判断
今回固定したp64は非公開の暫定候補です。一般群90試行で決め、未使用holdout120試行で検証しました。広い母集団や別端末への性能保証はありません。次の判断が済むまで公開へ進みません。

- 計算profile: 1 request 1000ms、入力0以上2^128未満、最大1 Worker、段階方式128MiBを製品として許すか。Brentの20ms/50000操作、ECMの80ms/500000操作はjob共通枠です。
- site契約: 保存済み2026-10-18版は100ms、Worker/WASM不可、permissive SPDXのみ、2MB/file。現在のsite契約を親が再確認し、変更するなら具体的profile・asset graph・CSP・所有権をレビューする必要があります。
- 配布条件: root UNLICENSED、GMP/ECMとmsieve由来の条件、対応source・変更・build/relink資料の準備と自作部分のlicenseを本人が決める必要があります。
- 表示と停止: incomplete／probable／provenを区別するUI、取消・host deadlineとcheckpoint超過、対応端末でのRAMと複数タブの所有権を設計・検証する必要があります。
- 配信構成: 今回の比較harnessは全bundleを共通取得します。製品の必要assetだけの配信・hash固定・初回取得後の通信ゼロ・初期化失敗を別途確認する必要があります。

UI、site/CSP、license変更、公開、Ready化、merge、release、deployは未実施です。新しい方式探索は行っていません。比較データの保存は[保全目録](../benchmarks/comparison-catalog.md)、観測と限界は[反復報告](../benchmarks/llm01-staged.md)に残します。
