# 計算終了と因子判定の表示候補

対象: main 9d36c7d からの分離ローカル候補。公開済み0.2.2の配布物・Site vendor/pinは変更しない。

## 表示契約

sessionが検算したview.statusをprogressの終端へ渡す。phase=resultだけでは成功とみなさない。検算と資源解放が正常終了したcomplete・probable・neitherを満杯のaccent色とし、incomplete・cancelled・blocked・例外・未知の状態は空の終端にする。ゲージは処理の完了であり、素数証明の確度ではない。エラー／時間上限の後で完全な因子snapshotを検算できても、因子の確度を維持したままゲージは停止扱いにする。再実行、入力検証失敗、準備、入力編集では前回の完了ゲージを消す。既存の結果本文と前回表示・コピーの対応は保持する。

因子は1項1状態として「素数（確定）」「素数判定を通過（未証明）」「不明」、検算済み合成数は「合成数（未分解）」と表示する。長い判定理由の反復を画面・コピーから除き、全桁・指数・未解決項・停止理由は保持する。pendingGroupsの未確認値を素数扱いにしない。

数学的根拠は変更しない。SMALL_PRIMESとの照合または既存固定基底Miller-Rabinの2^64未満のprovenのみ確定。それ以上のprobableは固定7基底をすべて通過した判定で、独立な乱数検査でも素数証明でもない。任意の64bit以上の入力に4^-7等の誤判定確率を適用できず、入力の分布も制限していない。「ほぼ確定」の保証や確率数値は加えず、候補文言は検査の事実を示す「素数判定を通過（未証明）」とした。verifyRoutingResultの時間・操作量上限、取消、検算失敗は既存のunknown扱いを維持する。

native progressのvalue・aria-valuetextと色を揃え、終端通知は既存の結果statusへ委ねる。DOM順・focus・スクロール・Worker／WASM・資源予算は変更しない。

## 検証


| 検証 | 結果 |
|---|---|
| TDD | 初回11件失敗（exit 1）を確認し修正。独立reviewのWorker異常後完全prefixも先に失敗再現し修正 |
| 対象テスト | Node 24.22.1 / npm 11.19.0、site 111件成功 |
| 全体テスト | runtime source f89afeee0528f99a0f59e8d8a4f26b90e0ddba40で853件成功 |
| 静的検査 | npm run check成功。型／lintの専用entrypointはなく、check内の構文・UTF-8/LF・source/生成物検査を使用 |
| 再現出力 | runtimeとbuilderの入力が同一のca15a8a76e0f8d6e967e25bec0f1cbb7181ceee6からfresh出力2組。各97files / 5,805,444bytes、artifact SHA-256 248ab55748145ace1ab9713e1eadd689ad532289ba7ac1a4506fa95372d0a68c |
| 実ブラウザー | Edge156.0.4314.58、別置Playwright1.61.0 / Windows Node24.21.0はdriverだけ。ローカル候補で9項目成功、ready後HTTP要求0・page error0 |
| 狭幅・操作 | 1280/390/320px、確定・未証明の紫満杯、実RSA100の1秒deadline、中止、再実行、コピー、Enter/Space、200%文字でdocument/toolの横overflowなし |
| アクセシビリティ | native progressのrole・数値・最大値・確定／未証明を含むaccessible nameを実AX treeで確認。Edgeでaria-valuetextが空になるため終端名にも状態を付与 |
| 独立review | 最終runtime f89afeeの数値状態・正常完了・ARIAをread-only確認。初回P2を解消し追加指摘なし |

artifactのpackage版名0.2.2は既存sourceの値で、上記は別directoryの未公開検証物です。正式な0.2.2の上書き、新releaseの成立、Site採用を意味しません。ca15a8aからf89afeeの差分はテスト／ファイル属性のみでruntime・builder入力は同一です。

代表画像はcomplete-320.png、probable-320.png、timeout-320.png。生のreport.json、browser harnessとログはprivate task artifactsへ保全し、画像をGitへ入れません。初回のGUI検査は「対応範囲外」入力を時間切れと想定、次は高速に分解できる入力を想定して失敗し、その記録も保持しました。最終9項目の成功と混同しません。

実機iOS/Android、Firefox/WebKit、実screen reader、SiteのCSS合成・固定版採用・Hosted CIは未実施です。toolkit push/Draft PRの個別承認が未確認のためリモート公開はしていません。正式release、Site採用、merge、本番配信はそれぞれ別の明示承認が必要です。
