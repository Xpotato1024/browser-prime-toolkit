# 予算付き分解・Worker契約 v1
状態: 縦切り実装用。site manifestとは別の内部計算protocolです。

## コア
factorInteger(value, options, runtime)は非負1024桁以下のBigIntを受け取ります。
optionsはalgorithm=brent/floyd、seed=1..4294967295、timeBudgetMs=0..60000、
operationBudget=0..50000000のみ。既定はbrent/1/1000ms/1000000です。
runtimeのnow/onProgressはテストとWorker内用の注入点で、message経由で受け取りません。
時間は単調clock、operationはループ内の明示checkpoint回数です。CPU instruction数ではありません。
単一BigInt演算の途中では中断できないため、hostも専用Workerをterminateする期限を持ちます。
JS heapの厳密なhard memory上限は提供しません。最大入力/因子数/操作数を制限します。

結果はinput、factors[{value,certainty,method}]、remaining、operations、elapsedMs、
status、reason、primality、algorithm、seedを持つplain dataです。整数値はcanonical decimal文字列です。
statusはcomplete/probable/incomplete/neither。incompleteのreasonはtime-budget/operation-budgetです。
0/1はneither。完全分解はremaining=1、completeは全因子proven、probableはprobable因子を含みます。
未完了のremainingは未解決余因子で、素数と推定しません。入力受付と分解完了は別です。
certainty=provenのmethodはsmall-primeまたはmr64、probableはmr-fixed7です。
MR基底は2,325,9375,28178,450775,9780504,1795265022で、mr64の範囲はn<2^64です。
それ以上の通過結果に誤り確率上限を付けません。seedはRhoの再現用で暗号乱数ではありません。
因子/残余を順次割る形で積一致を検証し、検算用に巨大な積を新規構築しません。

## Workerとcontroller
module Workerは固定local URLと静的importだけを使い、ロード完了時にprotocolVersion=1/type=readyを送ります。
run要求はprotocolVersion、type、jobId、input、optionsを持ちます。inputは提出時に確定したcanonical値です。
progress/result/errorは同じjobIdを返します。progressは検証可能なsnapshotで、100ms未満の頻発を抑えます。
controllerはloading/ready/running/error/disposedを管理し、同時1job、初期化前/実行中のstartを拒否します。
jobのterminal eventにはcomplete/probable/incomplete/neither/cancelledを区別して返します。
host deadlineは要求timeBudgetMs+100msの配送猶予。初期化期限は5秒で別管理です。
OS/browser schedulingのため厳密な実時間保証ではありません。

cancel/host timeout/disposeはterminateし、最後の検証済み因子・余因子を返します。未受信の途中成果は失います。
cancel/timeout後は新Workerを作り直しreadyを待ちます。disposeは再生成せず、startも拒否します。
世代の異なるWorker、古いjobId、終了後の応答を無視します。現jobの不正protocol/積不一致はerrorです。
Worker error/messageerror/post失敗/初期化timeoutではerrorにし、明示restartで回復します。
callbackへ渡すdataはcontroller保有snapshotと分離します。consumer callbackの実装はhost側の責務です。

## 検証範囲
coreは既知因数・小範囲の独立trial oracle・MR境界/擬素数・予算途中の再構成で検証します。
controllerはfake Worker/timerでcancel/timeout/race/errorを決定的に試験し、実module Workerでも確認します。
benchmark harnessでbrowser/端末・corpus・因子サイズ・seed・budget・打切りを記録します。
WASM比較、ECM/SIQS/NFS、素数証明書、React/site adapter、公開配布は今回の対象外です。
