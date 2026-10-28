# 工程別進捗と停止理由の表示候補

2026-10-27。基点は公開 v0.1.5 / main 99133842d311d944d09f258bd29afd3d17ba9514。

このページは初期の独立UI段階の記録です。現行ローカル候補の実接続・入力境界は
[共通routing](common-routing.md)、方式横断UIと実測は[後続記録](../benchmarks/llm01-routing-micro.md)を参照してください。
以下の未結合・旧上限・200ms通知間隔は当時の仕様／検証範囲です。
これはローカルの独立UI変更であり、公開・engine結合検証の完了を示す文書ではありません。

## 表示の契約

- progress.js はengineをimportしない、固定量の最新状態だけを持つ表示モデルです。
- 初期の計算中、結果検算、取消処理の割合は不定。全工程の完了率・残り時間を作りません。
- 既存 onProgress が通知した関係数 / 目標数だけを収集の割合に使い、family数も表示します。
- 収集目標到達後は不定表示へ戻し、検算を含む後続処理が未完了であることを示します。未達の99.99%を100%へ丸めません。
- engineには初期化・filter・行列・GCDの詳細工程通知がまだありません。これらを測定済みと表示しません。
- 結果表示は既存の因子積・確度・解放確認を通った後だけ。未完了結果もあるため、進捗欄の終端は「実行記録」であり成功の100%ではありません。
- job世代、単調なcounter、固定targetを検査。検算・取消・終端・dispose後の収集イベントを拒否します。履歴配列やpacketは保持しません。
- sessionからの進捗描画通知は通常200ms間隔。初回と目標到達は即通知し、elapsedは既存の100ms時計を使います。
- native progressに工程名を関連付け、不定区間ではvalueを外します。既存statusを単一の工程見出しとして共有し、同じ工程のcounter更新では本文を変更しません。終端では既存の結果状態へ通知を委ね、次の準備通知より先にliveをpoliteへ復帰します。
- DOMノードは更新中に作り直さず、focus・scroll・timerを新部品に持ちません。既存の平面デザインとscoped tokenを使い、領域の最小高を予約します。

## 停止理由

時間上限、初期化時間、計算量、取消、観測されたWASM保護閾値、Native割当予算の拒否、検算失敗、Worker生成/実行/通信異常、退役確認失敗を分けます。
未知のtrapやWorker消失をOOMと断定しません。WASM観測値は空きRAMやChrome RSSではありません。
日本語の停止理由を結果本文とコピーで共有します。確定/未証明の因子と未解決の余因子は既存の結果契約を維持します。
engineが時間上限で捨てた中間因子を、この表示変更が復旧することはありません。

## 実施した検証と残件

Node 24.22.1で、engine以外の指定9ファイルだけをimport可能にするloaderを使い、mock DOM・表示・font準備の20試験が成功しました。
font-textは許可された固定UIソースから更新し、再現一致を検査しました。独立read-onlyレビューで、dispose後の旧progress、二重live通知、準備時の通知復帰順序を修正しました。
計算engine、Worker、WASMはロード・再生成・実行していません。隔離JSと拒否されたarithmetic.jsは読み取っていません。

Firefox151.0とdesktop WebKit26.5で、実session/mountに固定mock providerを接続した16項目が成功しました。Playwright1.61.0の既存配置とWindows Node24.14.0はブラウザdriverにだけ使いました。公開UIやengineのNode要件を変更していません。
320/393/1280pxで収集・目標到達・取消・終端を描画し、進捗/実経過欄の位置、scrollとviewport scale、横overflow、Enter操作、copy、12停止理由、検算失敗後の再試行、解放不明のblocked、準備失敗からの再試行、unmount後の遅延イベントを確認しました。
同工程の通知本文mutationは0件、準備通知は本文更新時点でpoliteでした。画像を実ピクセルで確認しました。実スクリーンリーダー、実機iOS/Android、物理keyboard、実SiteのCSS合成は未検証です。
fixtureは画面上で実計算・性能測定ではないと明示し、exact HTTP allowlistとimportmapで実engine URLを拒否します。Worker/WASMとarithmetic stub実行も禁止し、実行試行0件・engine URL request0件でした。makeResultViewは固定表示fixtureなので、数学的検証の証拠にはしません。
実engine結合、全体npm test/checkとCI、配布再現ビルドは未実施です。
現在の通常2^128未満、高精度/大メモリ100桁かつ332bitという入力境界は変更していません。1024bit受理/400bit残余SIQSは別の未実装提案です。
push・PR・release・Site採用はしていません。隔離による既存欠落を維持したブランチ参照の作成だけを行い、checkoutによる復元は行っていません。

## 再検証用の入口

- scripts/verify-progress-ui-fixture.mjs と scripts/fixtures/progress-ui-provider.mjs は公開配布graphへimportしないUI専用harnessです。
- 既存のplaywright-core/index.mjs、対応browser cache、保存先を明示し、node scripts/verify-progress-ui-fixture.mjs --playwright <module> --browsers <cache> --out <new-output> で使います。依存やbrowserを自動取得しません。
- sourceの読取allowlistはharness内に固定し、実engineや任意folderをserverから読める実装にしません。report.jsonと画像は指定した非公開出力先へ保存します。

## 停止理由と既存入力仕様の追補

既存Workerのwasm-oomはallocationFailures>0という累積報告から付くコードです。割当失敗の報告として表示し、停止の直接原因、設定予算拒否、端末全体のRAM不足とは区別します。fatal-unknown/native-unknown/missing-session/composite-divisorも既存producerに対応する説明を持ちます。
入力・設定のpure policyだけを追加allowlistにして確認し、parserが受け付ける科学表記101/1024桁と、public adapterが拒否する範囲を分けます。4096文字のゼロ、先頭ゼロ、指数境界、39/100桁・128/332bit、60秒/10分/1時間の既存値は変更していません。
この追補のmock/表示/font/policy試験はNode24.22.1で30件成功しました。engineの完走・入力上限拡張を示すものではありません。
