# Alpertron選択原本の独立静的確認
固定commit: [4854656a050f280397d7908efa42fca8114c8297](https://github.com/alpertron/calculators/tree/4854656a050f280397d7908efa42fca8114c8297)。
2026-10-19、今回取得した8原本を別agentがread-onlyで確認しました。
LICENSE、siqs.c、siqsLA.c、ecm.c、factor.c、expression.c、bignbr.h、.github/workflows/build.ymlが対象です。
取得目録のbytes/SHA256/Git blobは一致しました。対象C/headerはGPL-3.0-or-laterです。
原本を製品へvendorしたものではなく、実行・WASM build・速度測定はしていません。

| 確認点 | port前に必要な作業 |
| --- | --- |
| 完全冪 | [factor.c](https://github.com/alpertron/calculators/blob/4854656a050f280397d7908efa42fca8114c8297/factor.c#L1161)はPowerCheck後にSIQSへ進む。共通coreの平方だけではp³等への前提が不足し、完全冪の処理/拒否が必要 |
| 有限探索 | [siqs.c](https://github.com/alpertron/calculators/blob/4854656a050f280397d7908efa42fca8114c8297/siqs.c#L2873)のpolySet/LinearAlgebraPhase、[siqsLA.c](https://github.com/alpertron/calculators/blob/4854656a050f280397d7908efa42fca8114c8297/siqsLA.c#L1012)のBlockLanczos再試行を有限化する |
| C演算 | siqsLA.cのsigned左shift/倍算はISO Cで未定義になり得る。明示patch、固定flagsとstrict UBSan確認が必要。WASM i32 wrapだけではfrontendの安全根拠にならない |
| 純計算分離 | HTML/databack/tenths・保存通知・共有globalをadapterから切り離す |
| 並列 | numberThreads=1、thread起動は#if 0。既存のマルチWorker実装とは扱わない |
| build/RAM | 選択集合にcommonstruc.h等の構造体/算術原本とWASM recipeが揃わない。build.ymlはSonar/native coverageで、再現WASMと64MiB適合・総static RAMは未確定 |
| 配布 | GPL-3.0-or-laterを含む対応source/変更/独自部分のlicense条件を確定してから公開を判断する |

比較候補として残します。この静的確認から速度を採用・除外しません。
最小の次段階は依存原本とbuild recipeの固定、純計算入口、完全冪・有限反復・UBSan、
資源上限と取消を含む独立したadapterです。現在の64MiB/停止条件を黙って緩和しません。

最初のscratch原本readは自動承認レビューに対象外として拒否されました。
人間の比較調査依頼の引用と対象pathが追加共有され、同じreadを1回だけ再試行して成功しました。
別path/URLでの迂回はしていません。独立静的確認のread阻害は解消しています。
