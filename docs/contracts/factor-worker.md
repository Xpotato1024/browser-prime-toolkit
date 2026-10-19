# 予算付き分解・Worker契約 v1
状態: 縦切り実装用。site manifestとは別の内部計算protocolです。

## コア
factorInteger(value, options, runtime)は非負1024桁以下のBigIntを受け取ります。
optionsはalgorithm=brent/floyd/tinyqs/gmp-brent/gmp-ecm、seed=1..4294967295、timeBudgetMs=0..60000、
operationBudget=0..50000000のみ。既定はbrent/1/1000ms/1000000です。
runtimeのnow/onProgress/splitAdvancedはテストとWorker内用の注入点で、message経由で受け取りません。
時間は単調clock、operationはループ内の明示checkpoint回数です。CPU instruction数ではありません。
単一BigInt演算の途中では中断できないため、hostも専用Workerをterminateする期限を持ちます。
JS heapの厳密なhard memory上限は提供しません。最大入力/因子数/操作数を制限します。

結果はinput、factors[{value,certainty,method}]、remaining、operations、elapsedMs、
status、reason、primality、algorithm、seedを持つplain dataです。整数値はcanonical decimal文字列です。
statusはcomplete/probable/incomplete/neither。incompleteのreasonはtime-budget/operation-budgetです。tinyqsとGMP評価候補はalgorithm-range/algorithm-exhaustedも使います。
0/1はneither。完全分解はremaining=1、completeは全因子proven、probableはprobable因子を含みます。
未完了のremainingは未解決余因子で、素数と推定しません。入力受付と分解完了は別です。
certainty=provenのmethodはsmall-primeまたはmr64、probableはmr-fixed7です。
MR基底は2,325,9375,28178,450775,9780504,1795265022で、mr64の範囲はn<2^64です。
それ以上の通過結果に誤り確率上限を付けません。seedはRhoの再現用で暗号乱数ではありません。
因子/残余を順次割る形で積一致を検証し、検算用に巨大な積を新規構築しません。
mr64/provenは受信側でも有限64bit範囲でMRを再検証し、cacheは検証呼出し内だけに置きます。
probableのscreening実施はレビュー済みWorkerの自己申告であり、hostの積検算と区別します。
長大なprobable値のMRをmain threadで再実行しません。素数証明・確率上限は主張しません。
計算予算はcheckpoint対象であり、結果の構造/有限proof検証・配送の費用は別です。

## Workerとcontroller
Workerは明示source listを決定的に組み立てた固定文字列を初期JS assetへ同梱し、Blob URLから起動します。
実行時import/fetchやユーザー入力のcode連結はありません。ready/error/terminateでURLをrevokeします。
準備後の取消・再起動もHTTP取得なしで動かします。ロード完了時にprotocolVersion=1/type=readyを送ります。
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
限定MPQS/WASMと測定用Rho portfolioに加え、別bundleでGMP Brent/ECMを評価します。真のSIQSはobject-only確認、NFS・素数証明書・React/site adapter・公開配布は未実装です。

Worker内のsecuritypolicyviolationはaudit-cspとしてhostへ通知し、当該Workerをerror/terminateします。
active jobがない時も処理し、別世代の通知は無視します。mainのCSP event監視、CDP/HTTP観測とは別経路です。
この通知はレビュー済みsourceの監査補助であり、任意の敵対的JSを封じるsandboxではありません。

## 限定MPQS/WASM
tinyqsは明示選択の比較モードです。小因子・MR・平方を処理した後、
48〜85bitの残余をMPQSへ渡し、小さい残余はBrentを使います。
MPQSへ渡す必要がある残余が85bit超ならalgorithm-range、20多項式以内に因子がなければalgorithm-exhaustedです。
MPQSのseedは固定で、protocolのseed指定を探索の独立性とは扱いません。
splitAdvancedはWorker内部の信頼された関数注入で、wire入力ではありません。
CとJSで非自明な除数と積を確認し、因子の素数性は既存MR方針で判定します。
WASMのメモリは固定16MiB、stackは1MiBで、growth/pthreads/filesystemはありません。
WASM bytesを初期Worker sourceへ同梱し、compile/instantiate完了後にreadyとします。
現在の実験bundleではBrent/Floydも同じWASM初期化を行います。起動・メモリ費用を隠しません。
WASM不可のbrowserのnative fallbackや製品上の方式自動選択は未実装です。
Cは多項式／ふるいblockのcheckpointで予算確認します。中断要求をCへ戻して解放後にJSで再throwします。
checkpoint間の厳密なwall上限は保証せず、hostのterminate経路も維持します。
測定用portfolioは単一controllerの契約を変更せず、独立controllerを最大4本まで所有します。

## GMP/ECM 評価用 Worker
通常 bundle は brent/floyd/tinyqs のみを実行します。別の固定 bundle は
brent/floyd/gmp-brent/gmp-ecm を受け、GMP/ECM WASM 初期化後に ready を送ります。
方式や WASM URL、コードを wire から追加することはできません。
共通の前処理・MR・平方・因子検算後、GMP 候補が必要な残余は 5 以上 256bit 以下に限定します。
範囲外は algorithm-range、32 曲線等で見つからなければ algorithm-exhausted です。
ECM は Suyama、B1=2000/B2=200000、最大32曲線、stage2 maxmem=16MiBです。
maxmem は stage2 の目安で全体 RAM 上限ではありません。WASM 線形メモリの hard cap は64MiB、
stackは1MiB、growth/pthreadsは無効です。OOM/trapを必ずincompleteに変換できるとは主張しません。
保存用 filename は NULL、filesystem は無効、残る fd/path syscall imports は拒否する host stub です。
ECM内部の informational clock は壁時計を供給し、CPU時間の測定とは扱いません。
native callbackは停止を保持し、全変数を解放してから元のJS予算例外を返します。
ECM stage2 の callback がない区間は host deadline/terminate が補完します。
seed は各残余の split ごとに初期化します。最初の Brent split の開始値は同じ xorshift32 です。
GMP gcd の内部操作は checkpoint 一回であり、native BigInt のEuclid反復数とは等価ではありません。
true SIQS は別source集合の object-only 確認で、WASMへリンク・実行していません。

portfolioの128MiB枠は所有する実行中Workerの線形メモリ合計です。factoryの信頼された16/64MiB profileで上限を検査し、方式名で回避できません。pool中は単体比較用Workerをdisposeし、全lane終了後に再生成します。再生成時間はidleRecoveryMsとして別記録します。JS heap、browser自体、終了済みWorkerのGC待ちはpeak RAM測定なしに合計上限とは主張しません。
