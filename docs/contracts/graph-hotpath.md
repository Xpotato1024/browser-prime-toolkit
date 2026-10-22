# 篩の局所変更を独立比較する契約

Stage34。Stage33計測中は文書とsource案だけを作り、ビルド・正しさ試験・速度比較は同時実行しない。旧CPU診断はbuiltin剰余採用前であり、現在の内部比率とは扱わない。既存O3/fat LTO/SIMDのまま、次の2候補だけを独立に調べる。

- skip: candidate-major resieveでposition<primeのときresidueをpositionとする。primeは非零、u32の範囲内で恒等式が成立する。その他は既採用Rust組込み%のまま。
- block16: dense blockだけ32KiBから16KiBへ変更。prime cutoff8192・score閾値・SIMD・関係式採否は維持する。rootのblock間持越し、末尾・同一rootへの加点を保存する。

保持表現は両側で同じStage33 varint、helperも比較対象の同じkernelとする。各candidateを別artifactにし混合しない。同じ固定上流・compiler・hardcap64/256MiB、各2clean一致を必要とする。新規unsafeや整数型・剰余アルゴリズムを導入しない。

境界probeは飽和/非飽和score、0/1/16383/16384/16385/32767/32768/32769/65537長、root0/1/p-1/p/p+1、素数/重複rootを含む加点列をscalar referenceと比較する。position/prime境界とseed固定10000組をBigInt oracleと比較し、40/64桁で全packet/column/counter/因子を一致させる。計測前に取消・期限・異常・全退役のChrome契約を候補別に確認する。

RSA100固定32family・4Worker・8枠、baseline/candidate/candidate/baselineを候補ごとに実施。各最大90秒、8回720秒＋契約2回各30秒で計780秒。時間中央値5%以上改善、PSS1.10倍以下、coordinator live1.05倍以下、全prefix packet/列/counter一致を採用条件とする。改善しなければ負の結果とsourceを残して採用しない。初回通信後通信0・有限容量・元の数学条件・cancel/deadline・因子検証を緩和しない。新しい大規模方式や無限の探索へ広げない。
