# 固定比較の実行

[比較契約](../contracts/rusqsieve-evaluation.md)と[固定14試行](../../bench/staged-rusqsieve-plan.json)を先にcommitします。clean headでnode scripts/benchmark-rusqsieve.mjsを実行し、raw/logをexclusive作成して失敗時に停止します。40／64桁の10対照が完了・全因数積検算成功するまでRSA試行へ進みません。

各試行はfresh Chromeで、計測head、source・plan・assetのhash、browser／host、退役・通信監査、allocator量、線形メモリ、サンプルRSS/PSSを保存します。固定順序で各1観測の探索比較であり、同じfamily数／workが違う条件を同条件speedupと呼びません。60秒のcopy/share比較と、1／2owner各600秒の到達範囲を分けます。

原本crate・Rust toolchain archiveはリポジトリ外で固定hashを検証し、[ビルド契約](../../native/rusqsieve/README.md)に従います。2clean buildと生成Workerの同一性を確認します。compile helperの隔離条件を緩和しません。

公開・release・deploy・site統合・追加有料CIは行いません。旧比較・失敗・原本pinを保全し、最終headの必要検査と独立レビュー結果を別途報告します。
