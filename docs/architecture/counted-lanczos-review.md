# 有界Lanczos比較の原本・安全性・配布境界

[ADR0008](../adr/0008-counted-siqs-lanczos.md) の非公開実験です。
選択原本は radii/msieve の commit c8727d91305bdbe0972d160ef0ce61dd02ce9193。
[provenance](../../vendor/msieve-lanczos/provenance.json) の3ファイルを上流Git blobとSHA-256で確認しました。
作者のpublic-domain noticeを原文のまま保持します。アプリ全体のUNLICENSEDや他依存のlicenseは変更しません。

Alpertronは完全冪・算術依存・符号付きshift等の確認と保存/HTMLの抽出を伴います。
既存msieveのrelation/cycle型を共有できるLanczosを小さな比較対象に選びました。
全面移植や、行列が主ボトルネックという前提は置いていません。

## 変更範囲
上流lanczos.cのGF(2)計算coreを使い、固定runtime.hで全割当とexitを所有権付き境界へ通します。
明示的なcore反復pollと各braced loopのpollを入れ、初回込み2attempt・4096core反復を同一Budgetの全splitで共有します。
大規模post-Lanczos/packingの入口は64<=rows<columns<=1024・dense=0を確認して閉じます。
再開/保存/進捗stderr/時計IOは取り込みません。固定の単一thread sparse matmulだけをadapterで供給します。
matrix-lanczos.cは元cycleから検査付きでparity列を作り、全64dependencyを元列で再検算します。
column.dataはpacked_matrix_free、cycle.listは既存呼出元が所有します。longjmpは全job割当をcleanupします。

C runtimeは各logical checkpointで残枠を確認し、最大64件をimportします。
phase末尾の短いimportも時計を確認し、次のbatchに未確認分を持ち越しません。
JSはstat_workとの差分tailを一度だけ清算し、成功時は最終clock確認をします。
WASM64MiB・stack1MiB・managed heap32MiBは固定です。
descriptorのstatic 5,000,000 bytesとparityの131,072 bytesもこの64MiB内です。
descriptor captureは診断だけで、主計測では大きなbufferを書き込みません。

## 証拠の範囲
matrix descriptor hashはrelationのnum_factors/fb_offsets、cycle index順序と行列次元を対象にします。
別hashはparity列そのものです。sieve_offset/poly_idx/large_primeやFB prime値の全同一性は立証しません。
新Lanczosのpoll配置・依存検算は旧denseと異なり、同じlogical上限は同じ算術命令数を意味しません。
追加profileはcallback間隔のwall概算で、JS/import/Budget/出力検査を含み、純粋C時間ではありません。
全Chrome process treeのRAMは25ms間隔のRSS/PSS標本で、瞬間peakやhard process RAM上限ではありません。

## 安全性と未公開境界
native ASan/UBSanではdense全2528・Lanczos全3818割当失敗、6phase停止、13境界probeと回復を検証しました。
8つの小操作枠、import停止、job共通のattempt/iteration上限も確認しました。
JSのtrap退役はentry trapを注入する独立テストで確認します。
browserのfatal probeは固定の最小unreachable WASMを計算入口で呼び、protocol errorによるWorker退役とfresh Worker回復を検査します。
このprobeは実際のSIQS coreがtrapした証拠ではありません。

公開用license・対応source/relink材料・site Worker/CSP/長時間profileは未承認です。
UI、site、deploy、Ready、mergeには進めません。結果は[比較報告](../benchmarks/llm01-counted.md)にまとめます。
