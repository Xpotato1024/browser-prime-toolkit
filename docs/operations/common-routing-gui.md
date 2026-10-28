# 共通routingのローカルGUI受入

2026-10-28。元の実接続head1fda786の次段階です。
公開v0.1.5とSiteの採用版は更新せず、push／PR／release／deployを行いません。
[共通契約](../contracts/common-routing.md)と[実接続の証跡](common-routing-integration.md)を引き継ぎます。

## GUIの処理経路

src/site/session.jsは同一のcreateVerifiedRoutingSessionへ各モードの予算を渡します。
小入力のstaged、Nativeの有限前処理、GMP ECM、SIMD SIQSを、
残る合成因子と残り予算から選びます。入力全体の桁数だけで固定しません。
WASMとSIMDは小さい固定moduleのvalidateで利用可否を確認し、未提供時は候補から外します。
新しい方式や外部計算サービスは追加していません。

| モード | 受付 | job時間上限 | SIQS資源 |
| --- | --- | --- | --- |
| 通常 | 309桁かつ1024bit以下 | 60秒 | 332bit以下、既存の保守的自動配分 |
| 高精度 | 100桁かつ332bit以下 | 10分 | 既存自動／手動、最大6 Worker、WASM予算128〜768MiB |
| 大メモリ | 121桁かつ400bit以下 | 1時間 | 総予算1536MiB、coordinator1024MiB、最大5 Worker |

WASM上限とブラウザRSSは別です。各段階はさらに固有の有限上限を持ちます。
たとえばNativeは最大5秒、stagedは最大60秒で、job deadlineを延長しません。
大メモリの332bit以下は既存wide経路を保ち、333〜400bitだけ実験400経路を許可します。
モード名・入力説明・設定内に実験的／全分解未検証と明記します。
309桁受付は難しい1024bit半素数の完走を意味しません。GNFSは未実装です。

## 進捗と結果

工程開始で「小入力の分解」「前処理・Brent」「ECM」「SIQS」へ切り替えます。
工程を切り替えたら前工程の収集割合を持ち越しません。
割合は実際に受理したfamily／関係数／目標だけから作ります。
収集目標到達も全体完了にはせず、最終確認は不定表示です。
取消・完了・unmount後の古い進捗は受理しません。

表示はprivate brand付きの検証結果だけを受け付けます。
全因子proven、probable、未分解・未確認を区別します。
検算停止や取消時の厳密prefixは保持し、primeと未確認の項を混同しません。
0／1の検算停止でも空の右辺を作らず恒等式を保ちます。
計算側の停止理由と最終確認の停止理由を分け、コピーにも状態を含めます。
Workerの異常消失をメモリ不足と推測しません。退役不明なら再実行を禁止します。

## 限定ブラウザ試験

scripts/verify-site-routing.mjsをChrome155.0.8059.39／WSL2 headlessで実行します。
通常のGUI操作による小入力、probable、1024bit smooth入力、
1024／332／400bitの上限超過拒否、取消後fresh実行を確認します。
SIQSの収集表示と400bit停止／取消／unmountは、利用可能なportを当該SIQSに限定する
実エンジン対照を使います。計算関数や素数判定をfixtureへ置換したものではありません。
この対照を既定ルーティング全体の性能測定とは扱いません。

各試行は1秒の設定です。400bit全分解や長時間の均衡半素数試行は行いません。
mobile幅390pxとdesktop幅1280pxの画像を保存し、実ピクセルを確認します。
収集中の入力位置／幅／viewport scale、横overflow、16px以上の入力fontも検査します。
実機iOSのkeyboard／autozoom、物理スマホ、実スクリーンリーダーは未確認です。

最終raw・画像・source SHA256・対象試験ログはローカルの
prime-gui-routing-20261028に保存します。旧失敗の原本は上書きしません。
全体npm test／npm run checkの既存拒否は再試行せず、CIも未実施です。
配布build、manifest／checksum、Site側受入と公開は後続です。

## 保存した結果

関連21ファイルを明示した限定試験168件が成功し、失敗は0件でした。
生成UI文字集合とselected-wideの整合性checkも成功しています。
最終GUI試行は12ケース、Worker10/10・Blob URL10/10の解放、
準備後の外部通信0件、page error／未許可リクエスト0件でした。
実測関係収集中に入力位置・幅とviewport scaleが変わらず、横overflowもないことを確認しました。
最終原本はgui-final-v4.json、対象試験はfinal-targeted-v3.logです。
served CSSのtool.cssはsrc/site/tool.cssのaliasで、他のsourceは同名pathのSHA256に対応します。

初回の旧テスト期待差分、Clipboard応答より先に確認してしまうharnessの非同期待ち不足は
修正し、失敗ログも保存しました。成功するまで無条件再実行したものではありません。
0／1の停止時の式と旧Native単独注記という独立レビューの2指摘を修正しました。

既定の高精度GUIでも133bit対照がNativeのwork停止→ECMのphase停止→SIQSへ進み、
2因子をprobableとして返す経路を確認しました。所要時間の優位性は比較していません。
このharnessはローカルの最小hostです。Site本番テーマ／CSP／配布artifactの受入とは別です。
