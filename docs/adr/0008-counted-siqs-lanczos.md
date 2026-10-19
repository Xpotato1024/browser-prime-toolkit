# ADR0008: 時計・callbackを切り分け、同一cycle集合でLanczosを比較する
状態: 非公開の最小実験。2026-10-19、実装・測定前に固定。
PR7のbase91b4bb5、旧artifact/binding/測定は保持する。

## 候補と理由
Alpertronは完全冪・算術/構造体依存・UB・保存/HTML分離を要する。
共有msieve型・同じ原本を使える上流Lanczos coreの有界adapterを先に選ぶ。
matrixが現在の主因という仮定は置かず、同じ1024 cycle prefix・同じrelationで比較する。
上流gf2の無検査merge/所有権は流用せず、checked sparse column化・parity検算を行う。
Lanczosのcore原本は固定commit c8727d91305bdbe0972d160ef0ce61dd02ce9193、
試行最大2・core反復4096・rows/columns1024・単一thread・IOなしとする。
Alpertron全面移植、GNFS、filterの大幅変更はこの段階では行わない。

## 切り分け
A: 旧SIQSをそのまま主対照にする。
B: 同じ旧WASMのまま、operationを毎callback確認し、clockをphase変化/最大64 logical checkpointごとに確認する。
C: 別WASMのCでlogical checkpointを毎回計数して残操作枠を毎回確認し、最大64回をまとめてimportする。dense行列はAと同じ。
D: Cと同じruntime/ふるい/relationで、行列だけを固定上流Lanczos coreへ差し替える。
50Mをcallback回数として64倍の仕事を許さない。前処理・余因子を含むjob全体の残枠を受け渡す。
未通知端数も結果/正常中断/資源終了時に全計数し、cap超過・0予算・phase境界・連続splitを検証する。
clock samplingは最大63 logical checkpointの未観測窓がある。旧来同様に厳密wall保証はせず、外側の同じdeadline/terminateを維持する。
WASM64MiB/stack1MiB/managed32MiBと既存relation/poly/savefile上限を維持し、fatalは退役する。

## 固定測定
PR7と同じbalanced-13-0/96bit-0/112bit-0、holdout-balanced-80/112。
seed1（holdout23）、計算枠1000/10000ms、総50M、4variantを各1回（40計算）。
同じChromeで各trialをfreshにし、orderを回転、cold取得を別記録する。
初期化込みrequest、成功/失敗、logical operations、import/clock数、phase時間・RAM標本を分ける。
追加profileは主タイミングへ混ぜず、同一work量の不一致を報告する。native/browser単純倍率を作らない。
取消・host期限・0/小操作枠・phase停止・fatal回復とASan/UBSanをTDDで確認する。
最終headの全tests/check・CI・独立reviewを終え、新Draft PRで返す。
公開licenseは未回答。UI/site/CSP/公開配布/Ready/merge/deployは変更しない。
