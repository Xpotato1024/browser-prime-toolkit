# 非公開の全桁UI
[ADR0010](../adr/0010-private-exact-ui.md)に基づく依存なしstandalone画面。React/site adapter・公開配布は後続です。

Node/npmはルートREADMEの固定版を使い、npm run preview:privateで127.0.0.1:4173を開きます。-- --port 4174でportを変更できます。host変更・外部公開用のrouteはありません。app/とsrc/のHTML/JSだけを返し、docs・Git情報・native原本を配信しません。

入力は型を数値へ丸めず十進文字列として検証します。3.2e1は32に正規化、32は指数付きの2⁵、コピーは32 = 2^5です。2^53前後も全桁を保持します。受理範囲は0以上2^128未満。4096文字を超える入力は切詰めず拒否します。0/1、未証明のprobable、未解決余因子、取消を区別します。

1requestは既存の初期化込み1秒・5千万checkpoint・1 Worker。固定WASM領域最大128MiBはブラウザ全体RAMの上限ではありません。中止中はowner退役まで次を開始しません。pagehideでWorkerを終了し、persisted pageshowでは4096文字以内の入力だけを戻します。結果を復活させたり、自動計算したりしません。長すぎる下書きは復元しません。

コピーは明示clickで結果と確度をplain textへ出します。Clipboard APIが使えなければ読み取り専用欄を選択します。storage・telemetry・CDNは使いません。

## 検証
npm testは純粋表示、session、page lifecycle、loopback previewの振舞いを検証します。CHROME_BIN=google-chrome npm run verify:private-ui -- --out /tmp/private-ui.jsonは実Chromeでproduction entryを読み、初回asset取得後にserverを停止してUIと既存Workerを検証します。既存browser harnessのCSP条件を維持します。これは公開サイトのCSP設定を変更するものではありません。

9シナリオは全桁・重複・完全冪、範囲・0/1、probable、partial、コピー成功/拒否、遅延コピー、loading/running取消、persisted lifecycle、fatal後の明示再試行です。さらにnative文字挿入で4098文字を欠落なく拒否し、実Clipboard API往復、Enter/Tab、AX treeのlabel/math name、320pxの横overflowを検査します。lifecycleは合成PageTransitionEventであり、実navigationがBFCacheに入ったことの測定ではありません。スクリーンリーダー音声の実機確認は未実施です。

[固定receipt](../benchmarks/llm01-staged-ui.json)とsource hashをnpm run check:private-uiで照合します。最終HEADでは同じbrowser検証を再実行し、独立レビューとCIを別途確認します。[RSA30秒指標](../architecture/rsa-30s-plan.md)は後続評価です。
