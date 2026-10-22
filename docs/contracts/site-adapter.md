# site adapter の現行契約と管理境界

確認日: 2026-10-22。v0.1.0はsite PR112で固定版として採用・配信済みです。旧案の「PR110未統合」「Worker/WASM禁止」「site未変更」は [歴史資料](../history/site-adapter-2026-10-18.md) に保持します。

共通の正本はsiteの [作成契約](https://github.com/Xpotato1024/xpotato-site/blob/main/docs/contracts/browser-tool-authoring.md)、machine schemaは [browser-tool.ts](https://github.com/Xpotato1024/xpotato-site/blob/main/packages/content-contracts/src/browser-tool.ts) です。このrepoへ仕様・生成器・Skillの別コピーを作りません。正本の作成契約は今回のDraft候補であり、そのmerge前は該当site PRを参照してください。

## このrepoが所有するもの

- src/site/index.js: default React adapter。refのmount/unmount、page復帰。
- src/site/mount.js と tool.css: 固有GUI、label・focus・scoped style、詳細設定。GUIはsite側へコピーしない。
- src/site/session.js: 入力・結果検証、計算状態、deadline/cancel/dispose、stale応答拒否。
- src/site/document-scope.js: document単位のleaseと退役不明時のquarantine。
- src/site/policy.js とcore/Worker/kernel: 有限の役割別予算、正確な整数計算。
- scripts/build-site-release.mjs: source graphとlicense一式を固定配布物へ変換。

siteはroute、registry、hydration、immutable vendor/pin、CSP、version/license/対応ソース表示を所有します。hostのsemantic CSS tokenはfallback付きで参照し、計算hardcapをhostから注入しません。React以外のruntime SDK依存は追加しません。

## profileと配布

既定の同期v1はWorker/WASMなし・短時間処理・permissive限定のままです。この分解機だけ prime-factorizer-async-v1、固定source repo、AGPL-3.0-onlyと対応source/第三者条件、有限時間/Worker/WASM/輸送量を使います。別ツールへこの例外をコピーしません。

prepareが初回資産を使えるようにした後、入力・結果はmemory内、再試行・取消後も通信なし。WASM上限はJS/ブラウザRSSの上限ではなく、OSによるタブ強制終了を防げるとはしません。通常移動、複数instance、unmount、cancel/deadline後のWorker退役を実distで確認します。

GUI変更候補はsource version 0.1.1。公開・tag・npm・site採用は未実施です。旧v0.1.0 bytes/pin/測定SHAは保持します。新candidate builderはmusl COPYRIGHTも配布exact-setへ含めます。既存v0.1.0の対応補遺を上書きするものではありません。

## 確認手順

指定Node/npmで npm test と npm run check。fresh外部directoryへ npm run build:site-release -- <output> を2回実行しhash一致、siteのcanonical artifact checkerで検査します。未知のsource builderを検査器に自動実行させません。

実distを非公開hostへ接続し、desktop/mobile、入力→結果、詳細設定、error/retry、keyboard/focus、tap/contrast、長い因子、cancel/unmount/複数instance/移動、ready後通信/offline/Worker退役を確認します。合成試験・emulationと実機、公開済み版と候補版の結果を区別します。

merge/release/本番配信は今回のDraft作成許可に含まれません。
