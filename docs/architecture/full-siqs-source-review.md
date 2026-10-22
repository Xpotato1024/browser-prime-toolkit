# 大整数向け full SIQS の原本と境界
private評価専用です。[ADR0013](../adr/0013-large-sparse-siqs.md)と[操作](../operations/full-siqs.md)を参照してください。

## 原本と候補
CrypTool msieve-wasm の commit 2e46b2683be8f425e4fbb947d195d786cc4f866a を調べ、build recipeが選ぶmsieve 1.53/GMP 6.1.2を固定しました。配布済みdist、式parser、wrapperを実行・流用せず、原本から独自の限定入口を再現buildします。固定URL、bytes、SHA256は[manifest](../../native/siqs-full/staged-upstreams.json)、全adapterとpatch/hashは[receipt](../../native/siqs-full/staged-build.json)にあります。

msieve 1.53はmp_tが32word/1024bitです。旧1.46の30word/960bit、有界128bit/1024行adapterを拡幅したものではありません。元のdouble-large-prime、関係式filter、sparse block Lanczos、48行post処理、3万行超packingを使用します。GNFS/ECMやmsieve_runの自動dispatchは入口から除外しました。Alpertronは[保存済み原本調査](alpertron-source-review.md)を残します。95桁は上流自動切替の閾値で、110桁を想定するsourceのhard capではありません。未計測の速度比較から除外しません。

## 実行上限
canonical十進整数だけを受け付け、最大100桁かつ332bitです。333bitの100桁は対象外です。0/1はWorker不要、64bit未満はnative BigInt、64..332bitの奇合成数はSIQSです。small trial/MR/square前処理を保ち、MR64以外のprimeはprobableと表示します。

WASM initial=max 512MiB、stack 4MiB、growth/pthreadsなし、1 Workerです。関係式saveはWASM内128MiBでMEMFSではありません。FB100000、列150000、初期nnz16000000、cycle8192、raw relation2000000、base poly65536、derived poly1000000、sieve block4000000、proof scan256000000項を超える前に停止します。64個すべての依存関係を元relationの行XORから独立に検算し、truncateや上位bitのmaskで通しません。

3/30/180/600秒の固定枠はWorker初期化から受信・積検算・退役まで含み、初期化5秒・終了reserve250msです。uint64の有限1兆checkpoint、1024strideとphase境界で時計を確認し、host deadlineが独立にterminateします。checkpointはCPU命令数ではなくinstrumented loopの回数です。枠延長や停止理由の付替えはしません。

## エラーと解放
未知trap/不正依存関係はfatalを優先します。known budget/resourceだけを有限停止へ分類します。OOMやC exit後のinstanceはpoisonして再利用せず、fresh Workerだけで回復します。native ASan/UBSanには64bit counter、境界、forged relation、全phase停止、正常再利用、reduce後no-dependencyの解放、大行列M/MTMとpostを含めます。

## 再現とライセンス
固定Emscripten imageをnetwork=noneで2回起動し、WASM/glue/link mapの一致を確認します。source cacheはrepo外、取得時hash検査、native sanitizerも同じ原本/patchです。[link map](../../native/siqs-full/staged-link-map.txt)で実リンク集合を検査します。GMP/APRCLはbuild archiveに含まれますが、このWASMではgcで未リンクです。

CrypToolのbuild/wrapperはApache-2.0、msieveの主部分はpublic-domain dedication、APRCLはLGPL-3.0-or-later、GMPはLGPL-3.0-or-later/GPL-2.0-or-laterの選択です。BSD/Sun/thread/strtoll等の個別通知もあります。archive全体をpublic domainとは呼びません。[保存した通知と原本hash](../../native/siqs-full/source-notices.json)と既存vendorのEmscripten/GMP/build-tool通知を保持します。アプリの公開ライセンス選択・source提供義務の最終判断・公開配布は未承認です。

link mapの比較ではEmscriptenが毎回生成する一時ディレクトリ名だけを正規化します。symbol、object、section、offset、sizeは保持し、原mapを含むbuild archiveはrepo外へ内容hash名で保存します。WASMとglueはbyte一致です。
