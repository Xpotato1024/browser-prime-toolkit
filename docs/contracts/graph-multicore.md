# 有限の複数 Worker 対照

Stage29 は実験専用。既存 resource UI、自動最大2、旧検証経路は変更しない。最終候補の packed forest と terminal collection 解放を使い、数学パラメータと family 順序は固定する。

## 仮説と予算

実 Chrome は hardwareConcurrency=6 / deviceMemory=8、WSL は6 CPU。CPU affinity や空きRAMの保証ではない。全体4 reservation枠が待ちの原因なら8枠で改善し、その後に5/6 Workerで改善する可能性がある。8枠を先に4 Workerで比較し、同期差と並列数差を混ぜない。

coordinator 256MiB、helper各64MiB。4/5 WorkerのWASM合計448/512MiB、6は576MiB（明示768MiB予算）。各artifact hardcapは固定。packet最大8MiB、reservation全体4/8枠=32/64MiB、owner credit2、digest同時8件かつコピー予約16MiB、証跡4096family、phase/snapshot256件。JS・Chrome RSS/PSSはWASM合計と別。開始時WSL MemAvailable>=4096MiB、Chrome PSS>=1536MiB、coordinator live>=160MiBまたはlinear>=208MiBで安全停止。メモリ限界探査はしない。

比較は固定32family、1試行最大180秒、4枠/8枠の4 Worker ABBA、8枠の4/5/6を交互順で各2回。合計計算予算30分以下。正しさ/取消/期限/因子独立検証/全Worker解放の契約試験を先行。全accepted packet SHA、prefix32の列SHA、全カウンター一致を必須とし、中央値で5%以上短縮しない候補は高速化として採用しない。PSS10%以上増または資源停止・取消失敗は不採用。負の結果も保存。assigned wall時間はCPU使用率とは呼ばない。収量を全工程完了時間に外挿しない。

ソースHEADを固定して別ビルドと同時実行しない。仮説・予算・採否基準は開始前に固定する。大幅に長いRSA100試行はこの試験では行わない。
