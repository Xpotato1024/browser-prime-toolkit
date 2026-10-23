# フラット表示・focus修正版0.1.3の公開手順

PR31の表示・focus変更を0.1.2の後継固定版として配布する。旧タグ・Release・アセットは上書きしない。package、lock、React adapter、生成manifestを0.1.3へ揃える。数値エンジン、依存、Worker/session契約、資源上限、CSP能力を拡張しない。

## 公開前の必須確認

1. PR31と版準備の最終headをレビューし、通常CIを確認する。旧baseのCI成功を最新mainとの統合証拠に置き換えない。
2. 同じ確定sourceの2 clean checkoutから既存builderを実行し、全72配布ファイルの集合・サイズ・SHA-256が一致すること。LICENSE、NOTICE、SOURCE_OFFER、第三者通知とmusl原文のexact-setを確認する。
3. 実0.1.3 distに同梱runnerを使用し、Firefox/WebKit各12項目と画像を直列検証する。サンプルは選択欄のfocusを維持し自動実行しない。resetはresetボタンへ復帰する。
4. 通常マージが新SHAを作った場合、reviewed headとtree一致を確認する。実際のtag targetから完全tracked source ZIPを作り、そのSHA/tree、runtime manifest、source/lock hash、CI run/attempt、テスト・受入結果をprovenanceへ固定する。
5. 日本語Releaseノート、runtime ZIP、source ZIP、provenance、SHA256SUMS、限定browser証拠/画像を新v0.1.3へ公開する。archiveに.git、untracked私的ファイル、資格情報、local絶対pathを含めない。
6. 公開アセットを匿名再取得してサイズ/hashを照合し、取得runtimeの全manifestとsource対応を検査する。Site採用は別の固定版導入・結合受入とする。

## 履歴と検証境界

[focus再受入](flat-focus-20261023.md)は版準備前候補であり、最終0.1.3の検証とは区別する。実機iOS/Android、Safariアプリ、soft keyboard/autozoom、実BFCache、screen reader、native OS clipboard拒否UI、WebKit物理回線切断、長時間/多Worker性能は未検証。WebKit offline emulationのapp-independent Blob Worker制約を維持する。

v0.1.2タグCIのNative validation初回失敗（10/11）と同条件1回再実行成功（11/11、全9workflow成功）、初回原因未確定の履歴を消さず、今回のUI修正で数値不具合を直したとは主張しない。GitHub Release公開とSite本番配信の結果は各PRとprovenanceに実測で記録し、手順の存在を実行済みの証拠にしない。
