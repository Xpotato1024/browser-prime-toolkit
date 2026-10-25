# 注釈付きタグの識別と0.1.4の公開

受入済みGUIと埋め込み境界は0.1.3準備の内容を保持する。`v0.1.3` はannotated tag object `fa87c15b73777b8782edf2d57fadf32df90c478f` がcommit `0c9017e15723a364c091b1147eae71acb17966cf` を指す。mainの9workflow／26checkは成功したが、[タグCI](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40188184871) はイベントのraw tag SHAとcheckout commitを比較して計算前に失敗した。タグの削除・付け替え・失敗runの無用な再実行は行わず、公開Release／assetsがない状態を保持する。

checkoutとworkflow SHAの一致を引き続き必須とする。tag pushはイベントrefとworkflow ref、元イベントobjectの型・タグ名・`^{commit}`、ローカルrefの型・`^{commit}`、checkoutを照合する。ローカルrefは元イベントobjectか、Actions checkoutが正規化した正確なcheckout commitだけを許す。lightweight tagはraw object自体もcheckout commitと一致させる。branch push、PR mergeの識別、Node pin、tracked dirty拒否は緩めない。Git replacementは無効にして読む。実Git repositoryのannotated／lightweight tag、実Actionsと同じ2段階fetchと不一致を回帰検査する。依存・計算・Worker・入力／資源上限は変更しない。

package／lock／React adapterを0.1.4へ揃え、新しいタグ・Releaseとして公開する。0.1.3を含む既存タグ・配布物を上書きしない。`release-v0.1.3.md` の2clean build、対応source ZIP、ライセンスexact-set、限定browser受入、最終head／main／tag CI、公開assetの匿名取得とhash照合のgateを継続する。source/provenanceは実際の最終mergeとtag targetへ合わせる。Siteは正式公開版の取得照合後に固定採用し、既存GitHub手動配信を別gateとして実行する。

v0.1.2 Native validationの初回失敗／同source1回再実行成功・原因未確定、PR31後mainのChrome起動失敗、v0.1.3 tag identity失敗はすべて履歴として残す。実機iOS／Android、実BFCache、スクリーンリーダー、OS clipboard拒否画面、長時間性能は未検証であり、desktop WebKit受入を実機保証へ拡張しない。

## 実Actions checkoutでの追加確認

v0.1.4タグ `27cdda99c68f84972e15d763f94dd115a3a4d9ad` はsource `835f152ec8cf0b8dca5db1f469018a1780cf5c94` を指す。main CIは固定GMP取得timeout後の同SHA失敗job一回再実行で全9workflow／26checkが成功したが、[tag CI](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40195472332/job/121175257409) はローカルrefと元タグobjectの比較で計算前に失敗した。Release／添付配布物／Site配信は未実行である。

固定した [checkout実装](https://github.com/actions/checkout/blob/11d5960a326750d5838078e36cf38b85af677262/src/git-source-provider.ts) は全history/tagを取得した後、[ref検査](https://github.com/actions/checkout/blob/11d5960a326750d5838078e36cf38b85af677262/src/ref-helper.ts) がcommitと一致しない場合に対象refを再取得する。実ログでも `+refs/tags/*:refs/tags/*` の後に `+835f152ec8cf0b8dca5db1f469018a1780cf5c94:refs/tags/v0.1.4` が実行され、ローカルtag refはcommitへ正規化された。PR34の最初のfixtureはこの2段階目を再現していなかった。

追加回帰では独立したローカルorigin／checkout間でこのrefspec順序を再現する。元tag objectが保持され、ローカルrefだけがcommitになることを確認してからCLIを実行する。元イベントSHA・タグ名・元objectとローカルref双方の解決先、型、workflow SHA・実checkoutをすべて保持する。別タグ名、第三の参照object、異なるcommitを拒否し、Git replacementで元objectの読取を変えないことも確認する。reportには元イベントSHAとローカルref SHA、参照表現を別々に残す。

このCI修正は既存v0.1.3／v0.1.4タグの削除・付替えやRelease公開を許可しない。公開対象source／tag／版の扱いは、修正のreview・CI後に本人の判断へ合わせる。古いtag CIの失敗を成功扱いにして公開しない。
