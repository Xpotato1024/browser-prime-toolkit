# 入力拡張候補の独立契約（公開経路には未接続）

目的は、入力受付・余因子の処理範囲・結果検証を別々に確定することです。
src/core/extended-input-contract.js は既存parserだけをimportする純粋な候補契約です。Worker、WASM、因数探索、素数判定は使いません。
APIはinspectExtendedInput(raw)とinspectExtendedDecomposition(canonicalInput,snapshot,options)に分けます。
公開adapter、manifest、現在の入力上限、計算予算は変更しません。実engineでの実装・性能・完走の検証ではありません。

## 入力と余因子の範囲

| 段階 | 候補の境界 | 意味 |
| --- | --- | --- |
| 表記 | 既存parserの4096文字・指数絶対値10000 | 丸めず整数へ正規化。parser自体の1024桁上限も維持 |
| 受付候補 | 309桁以下、かつ0以上2^1024未満 | 入力値として扱える候補。処理・完走保証ではない |
| 小さい余因子 | 2^128未満 | 既存small経路への候補。自動dispatchしない |
| SIQS余因子候補 | 121桁以下、かつ2^400未満 | 事前処理後の余因子の候補。SIQS導入・動作検証済みとはしない |
| 400bit超の余因子 | 受付範囲内なら保持可能 | 有限の事前処理で小さくするか、範囲外として止める。SIQSへ渡さない |

1024/400という候補値は既存wrapperが照合するNative ABI範囲に合わせた検証対象で、今回は実APIを呼んでいません。中間演算や高位入力の完走を保証する根拠にはしません。
同じ309桁や121桁でもbit上限を超える値はあります。10進桁数だけで境界を判定しません。
現在のpublic上限は通常2^128未満、高精度/大メモリ100桁かつ332bit以下のままです。

## 結果スナップショット

受付後のcanonical inputと、{factors:[{value,exponent}],remaining}を受けます。
value/remainingは先頭ゼロなしの十進文字列、因子は2以上で厳密昇順、指数は正の整数です。未知の確度/status欄は受け取らず、adapterが必要欄だけを明示して渡す契約です。
検査するのはinput = 因子累乗の積 × remainingという算術的整合性です。基数が合成数でも積が合えば整合し得るので、素数性や完全分解を認定しません。
出力はdecompositionVerified=trueと、primalityVerified=false / factorizationComplete=false / executionEnabled=falseを別々に持ちます。残余1も全因子が素数という意味ではありません。
0/1は素数でも合成数でもない専用扱いで、0に任意の因子を掛けたledgerは認めません。

最大group数と合計指数は1023に制限します。2以上の因子を2^1024未満へ掛けられる最大個数から導いた上限です。
累乗前にbit数から不可能な指数を拒否し、除算で整合を検査します。独自整数型や手書き剰余アルゴリズムは使いません。
検証は既定25ms、指定可能1〜100msの有限枠で、各groupの前後と終端で時間・取消を確認します。1回のBigInt演算中に割込みできる保証ではなく、operandと反復数の上限も併用します。
検査した値はlocalへ固定し、callbackによる元データ変更後に別の値を検算済みとして返しません。Array独自iteratorは呼ばず、最初の有限lengthと各indexのdata値だけを使います。
失敗時にはsnapshotを変更せず、時間上限・取消・shape・算術不一致を別codeで返します。過去に受理したprefixを壊す状態を内部に持ちません。

## 未実装・未検証の境界

これは候補契約を単独で試せるようにする変更です。小因子抽出、素数判定、SIQS400bitへの拡張dispatch、全engine結果の確度/寿命検証は実装・結合していません。
実際に公開する前には、有限のengine前処理、engine内部表現、結果の独立素数性評価、取消/期限/資源解放、実dist/manifest/Siteの整合を検証する必要があります。
将来の監査manifestの実装は今回の主目的から外すため追加しません。

## 検証済みの範囲

Node24.22.1で、実engineを許可しないexact module allowlistを使い、新しい契約14件と既存の純粋UI/入力/資源policy30件、計44件が成功しました。
境界、0/1、科学表記、600bit超の既知ledger fixture、指数1023、算術不一致、取消/期限、値とlengthのcallback変更を確認しました。これらは因数探索や大きな半素数の実測ではありません。
独立数値レビューを行い、検査後の元データ再読による不整合を修正して回帰試験を追加しました。
実engine、Worker、WASM、隔離生成物、拒否済みarithmetic.jsを読み込んでいません。全体test/check・CI・実ブラウザでの拡張入力は未実施です。

## 2026-10-28 の実engine接続

既存候補契約を使う[非公開のnative-only Brent入口](extended-engine.md)を追加しました。公開経路とSIQS400bitは未接続のままです。上記の独立契約試験と、新環境での実engine試験を区別します。

## 通常adapterへのローカル採用

[採用契約](adapter-extended-input.md)に従い、通常受付と有限Brentへ接続しました。pure checkerのexecutionEnabled=falseはchecker自体が計算を起動しないことを示し、hostのdispatch可否とは別です。SIQS400bitは有効化せず、公開版/Siteも未変更です。
