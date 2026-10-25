# 入力・実行・結果の流れを整理した0.1.3の公開手順

PR31を起点に限定プレビューで受け入れた入力・実行・結果の流れ、入力例／実行条件のモーダル、状態・因子判定・説明整理と、Siteへの表示／仕様情報の境界を0.1.2の後継固定版として配布する。受入済みtoolkit sourceは `e654ed2cd2fa0521b03f106b693e3ac075db14c0`、Site sourceは `1a99bba4723614704c062637460467b92e03a745`。この文書は候補の識別であり、タグや公開を成立済みとはしない。旧タグ・Release・アセットは上書きしない。package、lock、React adapter、生成manifestを0.1.3へ揃える。数値エンジン、依存、入力・資源上限、Worker解放と取消の安全性、CSP能力を拡張しない。

## 公開前の必須確認

1. PR31と版準備の最終headをレビューし、通常CIを確認する。旧baseのCI成功を最新mainとの統合証拠に置き換えない。
2. 同じ確定sourceの2 clean checkoutから既存builderを実行し、全配布ファイルの集合・サイズ・SHA-256が一致すること。件数・bytes・manifest／artifact hashは実物から記録する。LICENSE、NOTICE、SOURCE_OFFER、第三者通知とmusl原文のexact-setを確認する。uiCapabilitiesが同じ配布物のruntime定義と一致することも検査する。
3. 実0.1.3 distを使い、最終UIに対応したFirefox/WebKitの限定受入と画像を直列検証する。全入力例は入力のみで自動実行しない。モーダルの開閉・適用／取消・focus復帰、実行・中止・再実行、入力変更と前回結果の区別、同じ結果欄でのHTTP手動コピー、狭幅・文字200%・Site合成後の文字とコントラストを検査する。React入口と正式Site採用は、直接mountした限定プレビューとは別に実物で確認する。
4. 通常マージが新SHAを作った場合、reviewed headとtree一致を確認する。実際のtag targetから完全tracked source ZIPを作り、そのSHA/tree、runtime manifest、source/lock hash、CI run/attempt、テスト・受入結果をprovenanceへ固定する。
5. 日本語Releaseノート、runtime ZIP、source ZIP、provenance、SHA256SUMS、限定browser証拠/画像を新v0.1.3へ公開する。archiveに.git、untracked私的ファイル、資格情報、local絶対pathを含めない。
6. 公開アセットを匿名再取得してサイズ/hashを照合し、取得runtimeの全manifestとsource対応を検査する。Site採用は別の固定版導入・結合受入とする。

## 履歴と検証境界

[focus再受入](flat-focus-20261023.md)と各ローカルGUI受入文書は版準備前の履歴であり、最終0.1.3の検証とは区別する。表示境界は `data-bt` と文書化したCSS変数、仕様情報は同じtoolkit sourceから生成したmanifestの `uiCapabilities` を使う。Siteは選択したmanifestのhash／版へ結合し、metadataのない旧版へ新しい情報を補わない。実機iOS/Android、Safariアプリ、soft keyboard/autozoom、実BFCache、screen reader、native OS clipboard拒否UI、WebKit物理回線切断、長時間/多Worker性能は未検証。WebKit offline emulationのapp-independent Blob Worker制約を維持する。

v0.1.2タグCIのNative validation初回失敗（10/11）と同条件1回再実行成功（11/11、全9workflow成功）、初回原因未確定の履歴を消さず、今回のUI修正で数値不具合を直したとは主張しない。GitHub Release公開とSite本番配信の結果は各PRとprovenanceに実測で記録し、手順の存在を実行済みの証拠にしない。
