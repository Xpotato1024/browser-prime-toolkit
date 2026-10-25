# 説明リストとSite書体の統一

基準toolkit3752315fc218991a2d9069cbae83a6faa12bfef2 / Site689b57d6f25a4636dff0536e723c932dce462b08の実配信画面を新規撮影し、toolkitのsystem-uiとSiteのZen Kaku Gothic Newの差、下部の長い連続段落を確認した。提供されたiOS添付自体の画素確認とは区別する。

通常文・入力・ボタン・モーダルはhostの本文書体を継承し、単体はsystem-uiへfallbackする。コード／commit IDの等幅例外を維持する。新しい書体やfont URL・global CSS・CSP・権限は追加しない。

既存Site書体はunicode-rangeで分割されているため、document.fonts.readyだけでは閉じたモーダルや動的結果の未使用字形を先読みできない。固定UIソース由来の有限文字集合と、hostが明示的に渡す固定公開ラベルを、初回prepare中のFontFaceSet.loadで準備する。入力・結果や任意のページ本文は対象にしない。失敗は既存の準備やり直しへ戻す。初回準備は従来通り実経過へ含めない。

入力規則は4グループの意味的なul/liへ分割し、配布情報も注意・入出力byte上限・ライセンス／対応ソース・サイト組み込み版・固定commitに分ける。7つの既存リンク・AGPL表示・source offer・musl通知を保持する。

raw4096文字と配布側16384bytes、数値39桁／100桁とbit制限、分解完了保証は区別する。旧説明の「高精度最大2 Worker」は自動配分の上限だった。手動最大6 Worker・128〜768MiB予算・10分、大メモリ最大5 Worker・1536MiB予算・1時間を既存policyと照合し、挙動を変えず説明へ反映する。実測メモリ使用量やブラウザ全体のRAM上限とはしない。

開発版の関連55テスト、Siteビルド／型／security検査、Firefox／WebKitのSite合成各12ケースは成功した。通常の全状態コントラスト、狭幅・文字200%・modal、リストとリンク折返し、computed font、既存自己配信fontだけの初期取得とready後通信0を確認する。最終headの全体検査・再現ビルド・独立レビュー・配信後照合はタスクの固定報告へ記録する。

実iOS／Android・ソフトキーボード・IME・OS clipboard・VoiceOver等の支援技術・BFCache・正式React統合は未検証。統合・release・本番公開は保留する。v0.1.2 tag CI初回Native validation失敗と同source再実行成功の原因未確定という履歴も維持する。
