# site adapter の現行契約と管理境界

確認日: 2026-10-22。v0.1.0はsite PR112、v0.1.1はsite PR114で固定版として採用・配信済みです。旧案の「PR110未統合」「Worker/WASM禁止」「site未変更」は [歴史資料](../history/site-adapter-2026-10-18.md) に保持します。

共通の正本はsiteの [作成契約](https://github.com/Xpotato1024/xpotato-site/blob/main/docs/contracts/browser-tool-authoring.md)、machine schemaは [browser-tool.ts](https://github.com/Xpotato1024/xpotato-site/blob/main/packages/content-contracts/src/browser-tool.ts) です。このrepoへ仕様・生成器・Skillの別コピーを作りません。作成契約はsite PR113で統合済みです。以後の候補変更は該当Draft PRの差分として確認します。

## このrepoが所有するもの

- src/site/index.js: default React adapter。refのmount/unmount、page復帰。
- src/site/mount.js と tool.css: 固有GUI、label・focus・scoped style、詳細設定。GUIはsite側へコピーしない。
- src/site/session.js: 入力・結果検証、計算状態、deadline/cancel/dispose、stale応答拒否。
- src/site/document-scope.js: document単位のleaseと退役不明時のquarantine。
- src/site/policy.js とcore/Worker/kernel: 有限の役割別予算、正確な整数計算。
- scripts/build-site-release.mjs: source graphとlicense一式を固定配布物へ変換。

siteはroute、registry、hydration、immutable vendor/pin、CSP、version/license/対応ソース表示を所有します。hostのsemantic CSS tokenはfallback付きで参照し、計算hardcapをhostから注入しません。React以外のruntime SDK依存は追加しません。

## profileと配布

既定の同期v1と公開v0.1.0の prime-factorizer-async-v1 は互換性のため保持します。公開v0.1.1はsite PR113の共通 bounded-browser-v2 を使います。Worker/WASMとクリック時のclipboard書込を明示宣言し、固定同梱資産・有限時間/Worker/WASM/輸送量・AGPL対応source/第三者条件を維持します。一般のツールも用途に必要なcapabilityを宣言できますが、公開CSPや採用承認が自動で広がるものではありません。

prepareが初回資産を使えるようにした後、入力・結果はmemory内、再試行・取消後も通信なし。WASM上限はJS/ブラウザRSSの上限ではなく、OSによるタブ強制終了を防げるとはしません。通常移動、複数instance、unmount、cancel/deadline後のWorker退役を実distで確認します。

公開v0.1.1は固定済みです。今回のフラット表示候補は次回採用前の別差分であり、新release/tag/site採用は未実施です。旧v0.1.0 bytes/pin/測定SHAは保持します。v0.1.1以降のbuilderはmusl COPYRIGHTも配布exact-setへ含めます。既存v0.1.0の対応補遺を上書きするものではありません。

## 結果と操作

src/site/presentation.js は画面の式・短い状態・コピー文字列を分けます。完了はstatusで一度だけ表示し、因子の個別確度はdetailsへまとめます。probable/未完了/取消と停止理由は要約とコピーから失わせません。コピーはクリック時だけwriteTextを試み、非対応・拒否では状態付き全文を選択する手動コピー欄へ切り替えます。clipboard読取・自動書込・execCommandは使いません。

実経過はstartから初期化・結果検証・退役完了まで。資産prepareは除外し、上限の秒数とは別にmsまたは小数秒で表示します。表示timerはunmount/完了で停止します。サンプルは用途・難易度の目安を表示して入力するだけで、選択による計算開始や重い設定変更はしません。桁数だけで所要時間を保証しません。

SEO、document head、canonical/OG、routeと意味的なページ見出しはsiteが所有します。入力・結果をURLやmetadataへ入れません。

## サイトの視覚規約とfocus

hostの[視覚規約](https://github.com/Xpotato1024/xpotato-site/blob/main/docs/design/visual-design-reference.md)へ合わせ、固有GUIも反復するカード・影・塗り面を使わず、detailsは細い上罫線で区切ります。文字の寸法・色をhostへ合わせ、入力枠とprimary/補助/取消の階層を保ちます。GUIのfont-familyは端末内のsystem-uiを使います。hostのunicode-range付きWebフォントを継承すると、結果で初めて現れた文字にready後の追加取得が発生しうるためです。controlは16pxまたはrem以上、操作領域は44pxまたはrem以上です。

サンプルとresetで入力へ強制focusせず、必要な実行・取消・再試行・コピーのfocus移動は preventScroll を使います。手動コピー欄の選択や内容の開閉は実ブラウザでも確認します。文書が短くなった時の末尾位置への自然なclampと、focusによる意図しない移動は分けて記録します。ピンチ拡大の禁止で対処しません。実機iOSのキーボード・autozoom挙動はChrome viewport emulationから保証しません。

通信方針はsiteの導入説明、保存・送信しない旨はGUIの一文にまとめ、状態行は状態だけを表示します。version/license/対応ソースはhostの末尾表示を使います。

### 2026-10-24 狭幅と結果表示の補足

長い説明付きサンプルは OS の選択ポップアップへ渡さず、ページ内の native details と通常のボタンで折り返して表示します。選択は入力だけを変更し、計算・設定変更・入力への強制フォーカスは行いません。短い技術設定の native select は維持します。root と内側の control は最小幅を抑え、global overflow clipping やズーム禁止を追加しません。

実経過は独立した実測結果、実行上限・計算経路・Worker/WASM 上限は別の開示項目にします。実経過はこの計算の初期化・結果検証・解放を含み、初回ファイル準備を含みません。因子判定は native ul/li で1因子1項目にし、重複度・確度・未解決の余因子・停止理由を保持します。コピー本文にも同じ情報を含めます。

document/tool の横幅は別々に計測し、狭幅・長い選択肢・選択前後・focus/blur・文字200%を確認します。OS の native popup の幅、入力フォーカス時の zoom、DOM overflow は別の現象です。desktop WebKit の検証を実 iOS の受入とは呼びません。

### 2026-10-24 入力から結果までの操作距離

入力の直後に primary 実行操作を置き、進行状況と結果をその直下に表示します。入力例・詳細設定は結果より後に置き、展開状態でも結果との間に入りません。汎用の入力例は引き続き入力だけを変更します。

「360 を入力して分解（1秒上限）」は明示的な実行ボタンです。固定値 360 のみを通常の小入力経路・1000ms 上限で開始し、次回の実行設定は変更しません。入力例の選択を自動実行へ変えたり、大入力・高負荷経路へ自動変更したりしません。

結果への移動は専用ボタンを押した場合だけ行い、結果の全桁欄に focus を移して表示位置を合わせます。計算完了時の自動スクロールは追加しません。既存の実行・取消ボタンに対する focus 引継ぎは保ち、別の control を操作中なら完了時もその focus を維持します。

### 承認後の共通フローと入力上限

同日の専用360実行案は取り下げ、この節を現行の表示契約とする。手入力と全入力例は共通の入力欄へ合流し、実行は「分解する」だけにする。例は入力のみで、一覧を閉じて共通実行ボタンへfocusを戻す。開始操作時に共通の進行／結果領域を見える位置へ置き、完了時には自動スクロールしない。実行中の入力は読取専用、設定は無効にし、取消・解放完了後に編集と再実行を可能にする。

数値の受入範囲は変えない。通常は2^128未満で最大39桁だが、39桁すべての値が入るわけではない。高精度／大メモリは最大100桁かつ332bit以下。桁数は先頭の0を除いた正規化値について判定する。科学表記は整数になる場合のみ受理し、入力表記は4096文字まで。欄の枠内にモード別の数値上限を常時表示し、aria-describedbyで入力中も参照できる説明を結ぶ。数値上限と分解完了の保証は区別する。maxlengthによる切り詰めを使わず、上限超過の元の表記を残してエラーにする。

実行済み結果は入力値・入力表記・設定snapshotと対応させる。入力または設定の編集後は「未実行」「前回の結果」と示し、コピー対象もその実行済み結果に固定する。検証失敗からの再実行でも別のjobのsnapshotを流用しない。小数・範囲等の入力エラー、資源設定、読込失敗、実行／解放失敗は表示先と復旧操作を分ける。実経過は実測値、次回設定と今回の設定上限は別の文脈で表示する。

## 確認手順

### 案Aへの表示整理（2026-10-24、限定プレビュー候補）

全幅で入力→実行・中止→一つの進行／結果領域→実行条件の順にする。実行前にモードと時間上限を短く示し、資源設定は結果の後へ置く。全入力例は補助操作として入力だけを行う。実行と中止のクリック位置は別にし、実行連打・Enter長押し・IME確定を中止や重複実行へ変えない。実行開始時のfocusは状態行とし、完了時には別controlのfocusを奪わない。状態のlive領域をaria-busy配下に置かず、更新timerの実経過はlive通知しない。

結果本文は一つだけとし、全文の式・状態・余因子・停止理由と因子ごとの判定説明を保持する。コピー失敗時は因子詳細を開き、その本文自体をRangeで選択する。別の結果textareaは生成しない。手動選択が使えない環境では本文の長押し／選択を案内する。HTTP上の機能制限を隠さず、コピー読取やexecCommandは使わない。

欄内の最大桁数・数値範囲は維持し、短い常時説明と下部の詳しい入力規則を分ける。資源設定は適用されるcontrolだけを説明付きで表示し、モード間・自動／手動の切替でも保存した手動値を失わせない。選択したWASM予算と入力で選ばれた経路のWASM上限を区別し、不要な経路は「この計算では使わない」と表す。0 MiBを実測使用量として表示しない。実経過の計測範囲と未検証の実機条件は従来通りとする。

### 入力例と設定のモーダル化

通常画面は欄内の数値上限、二つの補助メニュー、短い適用済みモード／時間上限、明示的な実行・中止と一つの結果に絞る。分解完了を保証する桁数ではない旨はSite下部のライセンス・配布情報・処理上限へ置く。入力例はnative dialogで選択し、入力だけを変更して共通実行へfocusを返す。

設定はappliedとdraft、モードごとの記憶値を分離する。開く／編集ではprepare、入力の上限表示、前回結果の関連付けを変更しない。妥当なApplyだけをcommitし、取消・閉じる・Escapeは下書きを捨てる。計算と退役中は両メニューを無効にする。Apply後は必要ファイルの準備を行うが、因数分解は開始しない。

native showModalのtop layerと背景のinertnessを使い、初期見出し・Tab境界・Escape・focusと元のページ位置の復帰を確認する。長い内容や短い画面ではdialog自体をスクロールし、global clipping、body style、ズーム禁止、portal、CSP拡大で対処しない。unmountでは開いたdialogも閉じる。

buttonの文字色と背景は一組でscopedに定義し、Siteのprose/form ruleとの合成後に通常・focus・hover・active・disabledのコントラストを検査する。結果見出しも端末フォントを明示し、動的な「前回」表示でhost Webフォントを追加取得させない。OSの色設定とSiteが対応するthemeを区別し、実機iOSや支援技術をdesktop WebKitから保証しない。

指定Node/npmで npm test と npm run check。fresh外部directoryへ npm run build:site-release -- <output> を2回実行しhash一致、siteのcanonical artifact checkerで検査します。未知のsource builderを検査器に自動実行させません。

実distを非公開hostへ接続し、desktop/mobile、入力→結果、詳細設定、error/retry、keyboard/focus、tap/contrast、長い因子、cancel/unmount/複数instance/移動、ready後通信/offline/Worker退役を確認します。合成試験・emulationと実機、公開済み版と候補版の結果を区別します。

merge/release/本番配信は今回のDraft作成許可に含まれません。
