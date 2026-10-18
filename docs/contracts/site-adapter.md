# 既存サイト形式に対する受入仕様案
状態: 設計案。サイトの契約・設定は変更していません。確認日: 2026-10-18。

## 確認した既存形式
site main 61ef70cbdf6785d43fb8953965f404382a4ef894 を読み取り確認しました。
[PR103](https://github.com/Xpotato1024/xpotato-site/pull/103) は登録route・binding・islandとtransitive asset graph、実配信header検証を実装済みです。
[PR105](https://github.com/Xpotato1024/xpotato-site/pull/105) は固定版取込・更新・差戻し・合成fixtureによる通信/offline試験を実装済みです。
[PR110](https://github.com/Xpotato1024/xpotato-site/pull/110) は710bb20f5db8663509e40211e92a30a849b86079のDraftで、version/sourceと処理条件の静的表示を追加しています。mainには未反映です。

既存manifest v1はReact island API v1、ESM default、memory、none-after-readyを規定します。
package名は @xpotato-tool/<toolId>、React/ReactDOM 19.2.8 peers、追加runtime依存なしです。
source commit/tree、lock、manifest、配布exact-setのbytes/SHA-256、reviewと2回のclean build一致を固定します。
LICENSE/NOTICE、明示的vendor/pin/import/registry/bindingを同一PRで確認し、通常buildは再取得しません。
現行capabilityのWorker/WASM/file/download/clipboardはfalse、maxComputeMsは100以下です。
1fileは2MB以下、SPDXは許可されたpermissive系のみです。LGPL bundleの直接採用は現行形式に適合しません。
登録ToolのCSPはworker-src/connect-src noneであり、通常navigationは維持されています。
合成fixtureの成功は実ツール採用や高負荷計算の受入れを代替しません。

## コア・アダプター・配布物
計算コアはDOM/React/siteに依存しない整数演算・結果モデルとし、複数backendを比較可能にします。
Worker controllerがjob ID、提出時入力、進捗、deadline、cancel、dispose/restartを管理します。
サイト用Reactアダプターだけが既存island APIへ接続し、unmountでWorkerを必ず破棄します。
package/manifest/pin/reviewの既存形式を再利用し、独自plugin loaderや動的remote registryは作りません。
releaseはESM entry、scoped CSS、Worker entry、WASM/補助資源、license/noticeを全て同梱し、固定hashを検証します。
Worker import・WASM参照もasset graphへ追加し、未列挙・remote・遅延の未検証取得を拒否します。

## 最小の追加契約: 長時間計算プロファイル案
現行v1を一括緩和せず、schemaの明示的version/profileとして別途サイトPRで審査します。
- worker/wasmの必要な機能だけ宣言し、資源entry・初期化/最大Worker数・memory上限を固定する。
- maxComputeMsの短時間同期処理とjob wall-time/操作予算を分け、残余と未完了を必須にする。
- loading → ready → running → completed/incomplete/cancelled/error → disposedを規定する。
- readyはWorkerとWASM・必要資源の初期化後。全Workerのready確認と失敗時cleanupを行う。
- 結果はjob ID・元入力・因子・残余・確実性・使用方式を持ち、積一致を検証する。
- cancel/timeout/unmountでterminateし、古い応答・別instance・再初期化後の混線を拒否する。
- Worker URLは固定local assetのみ。WASMのロードとcompileに必要なCSPを実browserで確認する。
- connect-src noneとの整合を設計する。remote許可や一律unsafe-eval追加を回避策にしない。
- thread/SIMDは測定後に選ぶ。SharedArrayBufferのための全サイトCOOP/COEP変更を既定にしない。

## 受入れ
ready後の操作区間ではmainとWorker双方のrequest/socket、navigation、例外、CSPとHTTP server traceを記録します。
正常・悪意入力・境界・cancel・timeout・reset・2instanceで通信ゼロとofflineの同等結果を確認します。
検出器の自己試験、Worker終了、資源未取得時の失敗表示、unmount/restart、通常サイト移動も検証します。
実際の最終distで性能表と通信receiptを固定し、再現build/hash/licenseを添えます。
サイト変更、capability/CSP拡張、LGPL等の採用、公開・deployは別途具体案を承認してから実施します。

取消の基礎APIは[Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)です。
終了時にWorker側cleanupの完遂を前提にせず、host側で所有資源とjob状態を破棄します。

初回コアはsiteへ取り込めるreleaseではありません。入力の文字数とmanifestのbyte数は別々に制限します。
現行v1のmaxInputBytesは65536、maxOutputBytesは262144以下です。因数集約コアの最大出力はこの範囲に収まりません。
アダプターはmanifestの入力・出力・進捗message上限を計算前と描画前に検証し、超過を明示します。
上限を無言で切捨てたり、コアの受付桁数をサイトでの分解保証として表示したりしません。
