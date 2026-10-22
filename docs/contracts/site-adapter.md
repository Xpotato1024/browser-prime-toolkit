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

## 確認手順

指定Node/npmで npm test と npm run check。fresh外部directoryへ npm run build:site-release -- <output> を2回実行しhash一致、siteのcanonical artifact checkerで検査します。未知のsource builderを検査器に自動実行させません。

実distを非公開hostへ接続し、desktop/mobile、入力→結果、詳細設定、error/retry、keyboard/focus、tap/contrast、長い因子、cancel/unmount/複数instance/移動、ready後通信/offline/Worker退役を確認します。合成試験・emulationと実機、公開済み版と候補版の結果を区別します。

merge/release/本番配信は今回のDraft作成許可に含まれません。
