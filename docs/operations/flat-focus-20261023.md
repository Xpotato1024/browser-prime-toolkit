# フラット表示候補のFirefox / WebKit再受入

PR31をmain `9d16f826a3aba90794e150a5c34236b29419e49f`へ追従したローカルmerge `558e824c7ba749eefd1e52044d2474ecdb7d2afd`を対象にした。公開v0.1.2を置き換えた検証ではない。生成manifestの版表示はまだ0.1.2であり、この候補の公開・次版採用を意味しない。

PR30の受入runnerはサンプルとreset後に入力へfocusする旧仕様を検査していた。PR31の意図した仕様はサンプル選択欄のfocus維持とresetボタンへの復帰である。実製品の変更を加えず、runnerの2項目をこの契約へ合わせた。Tabによる入力からサンプルへの移動、非自動実行、Worker非生成、空入力へのresetのassertionは維持した。

## 実測

- Playwright Core 1.61.0、Windows上のdesktop Firefox151.0 / WebKit26.5を順番に実行。
- 修正前は各12項目中10成功、サンプルとresetのfocus期待値2項目だけが失敗。修正後は各12項目すべて成功。
- 各engineでWorker 8作成/8終了、Blob URL 8作成/8解放。ready後HTTP要求、計測対象network API、storage API、page errorは0。
- 整数・指数・不正入力、秒未満の表示、native copyのAPI/UI結果、controlled copy成功/拒否/非対応、有限WASM計算、keyboard開始/取消、取消後の再実行、reset/Tab、390pxの横overflow、実行中disposeを検査。
- 生成した72ファイルは5,013,016 bytes、artifact SHA-256 `186c704920cece938f0187595db0b35e14eaefac5724da99ab4cadb0b8bfa253`。runner SHA-256 `217da4afed4b08a9b3a30b5a357c450f0fd49713a82659f21bdfc7c34f43ec51`。
- 成功reportのSHA-256は `05b547f2aa164bc078a89f5a180c3aeee4f6fa3882eeafed4a974bb9a39ffc04`、旧期待値失敗reportは `2bf8b6fdca22f4b1ab39dd1281747b6b49669ab78a7b39d94b7ecb0d9d1f8ea1`。原本は作業領域の `v013-focus-verified/` と `v013-before-focus-native/` に保持し、成功reportを同梱する。

最初のsandbox内起動はFirefoxのレジストリ初期化失敗とWebKitのloopback接続失敗で製品検査へ到達しなかった。その原本も保持し、上記の製品側focus期待値不一致とは区別する。

## 境界

Firefoxはoffline emulationを使用。WebKitは既存のapp-independent Blob Worker/offline制約を維持し、restrictive CSPと静穏なonline HTTP traceで検査した。native copyはクリック後のwrite promise/UIの観測であり、OSへのpasteやnative拒否dialogの保証ではない。実機iOS/Android、Safariアプリ、soft keyboard/autozoom、実BFCache、screen reader、長時間/多Worker性能は未検証。Siteの実host統合、新版配布、最終head CI、本番配信は別の確認対象である。

既存v0.1.2のタグCIでNative validation初回失敗・同条件再実行成功となった履歴と原因未確定という状態は、このUI変更によって解消したとは扱わない。

## 独立レビュー後の診断修正

head `1f1164506db81a1b0f30df33dd077fd3e11db7ac` の独立レビューはP0/P1=0、P2=1。Chrome stderrの接続URLがchunk境界で分かれると、置換済みprefixの後にbrowser pathが残ることをin-memory fixtureで再現した。新規回帰テストを修正前に失敗させ、完全な行を組み立ててから接続URL/pathを伏せ、未完了行の内容を診断へ出さず、長い行は改行まで捨てるよう修正した。診断の保持上限10000文字と起動の単一期限は維持する。全分割位置・長い行の後の通常診断保持・既存の接続/終了/focus関連16試験が成功。これは検証用Chrome起動コードの修正で、配布runtimeと上記browser受入の対象bytesは不変である。
