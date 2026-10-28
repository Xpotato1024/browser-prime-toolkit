# 配布ファイルと元ソースの監査receipt

scripts/build-site-release.mjs は配布treeへ artifact-provenance.json を追加します。
公開済みreleaseは変更していません。現在のローカル実装は隔離生成物を使わないfixtureだけで検証しています。

## 実装した検査

scripts/artifact-provenance.mjs はファイルを読み込まず、渡された有限のBufferとMapだけを検査します。
各配布ファイルに、元ソースのpath・bytes・SHA256、出力のpath・bytes・SHA256、変換方法を結びます。
変換はcopy、local-esm-extension、release-packageの3種だけです。実出力が変換結果と一致しなければbuildを止めます。
ESM変換とpackage情報生成は従来の配布処理を共通関数へ移したもので、コードをimport・decode・実行しません。

全入力に由来が必要で、欠落・余分な対応・未知の変換・path traversal・case衝突・循環する予約出力名を拒否します。
入力・出力は各10000件かつ合計64MiB以内です。これは配布検査の上限で、計算時のメモリpolicyではありません。
receiptに配布recipe、helper、font recipe、capabilitiesソースのSHA256と実行Node版を記録します。
Git HEADは固定commitの文脈として記録し、未commit変更がないとは主張しません。実際に使ったソースのdigestが別にあります。

receiptは自身とbrowser-tool.jsonを出力一覧に含めません。外側のbrowser-tool.jsonがreceipt自体をSHA256固定します。
SOURCE_OFFER.md、THIRD_PARTY_NOTICES.md、LICENSING.mdへの参照は、配布treeに実在することを検査します。
JS containerのSHA256と、内部WASM・Git blob・zipのdigestは別物です。内部WASMのhashを検体JSのhashに流用しません。

## 隔離物を使わない試験

Node24.22.1で次の2ファイルを直接指定します。全engineを読むnpm test/checkや実buildは現在の境界では実行しません。

    node --test test/build/artifact-provenance.test.js test/build/site-release-provenance.test.js

新規11試験と既存の独立UI/入力契約44試験、合計55件が成功しました。
単体試験は、改変、欠落、path、変換、決定性、metadataの有限上限を検査します。
結合試験は実際の配布スクリプトを閉じた仮想filesystemで動かします。ソースは短い無害な文字列だけです。
read/write、Git呼出し、capabilities、font取得をfixtureへ閉じ、未知のimportやengine pathへの読取は失敗させます。
通常のnode --testでは、同じfixtureをNode VM対応flag付きの子processで実行します。実Gitやengineを起動する子processではありません。
receiptがmanifestに含まれ、自己hashの循環がなく、配布byteに一致し、既存runtime予算が保持されることを確認します。

## 未確認の範囲

この実装は出自の追跡と変換一致の検査です。改変者がソース・recipe・receiptすべてを変更した場合の真正性を保証しません。
内部WASMの由来、Rust/compiler/containerのreceipt連鎖、独立clean rebuild、署名、実releaseとの一致は別の未完了検証です。
receiptにもinternalWasmInspected=false、cleanRebuildCompared=false、authenticityVerified=false、securityVerdict=not-assessedを明示します。
Defenderの検知理由、誤検知、安全性、隔離実体との一致を確定するものではありません。
隔離ファイルの復元・取得・再生成・実行、拒否済みarithmetic.jsの再読、保護設定変更は行っていません。
公開adapter、入力上限、計算予算、生成engineのbytes/形式、Site採用、公開物は変更していません。
