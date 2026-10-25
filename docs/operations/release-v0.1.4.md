# 注釈付きタグの識別と0.1.4の公開

受入済みGUIと埋め込み境界は0.1.3準備の内容を保持する。`v0.1.3` はannotated tag object `fa87c15b73777b8782edf2d57fadf32df90c478f` がcommit `0c9017e15723a364c091b1147eae71acb17966cf` を指す。mainの9workflow／26checkは成功したが、[タグCI](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40188184871) はイベントのraw tag SHAとcheckout commitを比較して計算前に失敗した。タグの削除・付け替え・失敗runの無用な再実行は行わず、公開Release／assetsがない状態を保持する。

0.1.4ではcheckoutとworkflow SHAの一致を引き続き必須とする。tag pushについて、イベントrefとworkflow ref、ローカルrefのraw objectとpayload.after、そのobjectの型、`^{commit}`で解決したcommitとcheckoutをすべて照合する。lightweight tagはraw object自体もcheckout commitと一致させる。branch push、PR mergeの識別、Node pin、tracked dirty拒否は緩めない。実Git repositoryのannotated／lightweight tagと不一致を回帰検査する。依存・計算・Worker・入力／資源上限は変更しない。

package／lock／React adapterを0.1.4へ揃え、新しいタグ・Releaseとして公開する。0.1.3を含む既存タグ・配布物を上書きしない。`release-v0.1.3.md` の2clean build、対応source ZIP、ライセンスexact-set、限定browser受入、最終head／main／tag CI、公開assetの匿名取得とhash照合のgateを継続する。source/provenanceは実際の最終mergeとtag targetへ合わせる。Siteは正式公開版の取得照合後に固定採用し、既存GitHub手動配信を別gateとして実行する。

v0.1.2 Native validationの初回失敗／同source1回再実行成功・原因未確定、PR31後mainのChrome起動失敗、v0.1.3 tag identity失敗はすべて履歴として残す。実機iOS／Android、実BFCache、スクリーンリーダー、OS clipboard拒否画面、長時間性能は未検証であり、desktop WebKit受入を実機保証へ拡張しない。
