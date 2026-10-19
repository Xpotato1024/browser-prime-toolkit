# 開発手順

Node 24.19.0 / npm 11.19.0 を使用します。npm ci、npm test、npm run check を実行してください。
npmの追加runtime依存はありません。review済みvendor sourceとcompiler runtimeは固定同梱します。package-lock.json は環境を再現するため管理します。
AGENTS.md と関係する契約を読み、文書・テスト・実装の責務を分けて変更します。

1. 挙動と境界の契約を先に記述します。
2. 実体のある失敗テストを走らせ、red の終了値と件数を記録します。
3. 最小実装で green にします。
4. 責務を整理して再実行し、green を保ちます。
5. 数値境界の独立レビュー、最終headのCIを確認してDraft PRで返します。

npm run build:wasm -- --checkは固定Docker imageで2回のbyte一致を確認します。npm run verify:nativeはCのsanitizer試験です。
npm run check はWASM source/artifact hash、構文、UTF-8/BOM/改行、ローカルMarkdownリンクを検証します。
CIは単体・実browserのtestとcheckのみです。push / PRからdeploy、release、公開を行うworkflowはありません。
実装PRのmerge、Ready化、公開、既存サイト組込、資格情報・権限変更は別途承認が必要です。

CIではhost bind inputが参照できないため、必要な固定sourceだけをtar化してDocker標準入力へ渡します。host mountはなく、network=none・固定image・資源上限・2回一致を維持します。tarはownerを復元せず、余分なcapabilityを付与しません。WASM_BUILD_TMPはNode側の自身の一時領域だけを指定します。

GMP/ECM評価用の原本とbuild toolは、repo外の明示保存先へ取得します。

```sh
export PRIME_UPSTREAM_DIR=/tmp/prime-upstreams
npm run fetch:candidates
npm run build:candidates -- --check
npm run verify:candidate-native
npm run verify:candidate-primes
CHROME_BIN=google-chrome npm run verify:candidate-browser
CHROME_BIN=google-chrome npm run benchmark:candidates -- --out /tmp/prime-candidates.json
```

詳しい原本・条文・隔離build・再リンクの配布境界は[原本評価](../architecture/gmp-ecm-source-review.md)を参照してください。
通常bundleと候補bundleは共通protocol・controllerを使い、候補の追加をwireから受け付けません。
CIの原本取得後のコンパイルは通信禁止です。CIの権限はcontents:readのみを維持しています。

有界SIQSの評価用build/browser検証は以下です。RAM標本化はLinuxのprocを使います。

```sh
npm run build:siqs -- --check
npm run verify:siqs-native
CHROME_BIN=google-chrome npm run verify:siqs-browser -- --out /tmp/prime-siqs.json
CHROME_BIN=google-chrome npm run benchmark:siqs -- --out /tmp/prime-siqs-full.json
node scripts/report-siqs.mjs --check
```

比較用100/1000ms枠と、正常なSIQS分解のoffline smoke用10秒枠は別です。
報告scriptは保存したrawと測定source/build hashを照合し、変更後の再測定なしに表だけ更新しません。

設計探索の区切りとselectorの根拠は[採否文書](../architecture/engine-selection-closeout.md)を参照してください。
selectorは純粋な実行計画で、公開site schedulerではありません。

```sh
npm run build:native-worker
npm run verify:selection-primes
CHROME_BIN=google-chrome npm run verify:selection-browser -- --out /tmp/prime-selection.json
CHROME_BIN=google-chrome npm run benchmark:selection-holdout -- --out /tmp/prime-selection-full.json
node scripts/report-selection.mjs --check
```

holdoutは方針固定後の6入力・18計算で終了します。結果で閾値/seedを調整したり、新方式portを続けたりしません。
