# 計算終了と因子判定の表示候補

対象: main 9d36c7d からの分離ローカル候補。公開済み0.2.2の配布物・Site vendor/pinは変更しない。

## 表示契約

sessionが検算したview.statusをprogressの終端へ渡す。phase=resultだけでは成功とみなさない。completeとneitherだけを満杯のaccent色とし、probable・incomplete・cancelled・blocked・例外・未知の状態は空の終端にする。再実行、入力検証失敗、準備、入力編集では前回の完了ゲージを消す。既存の結果本文と前回表示・コピーの対応は保持する。

因子は1項1状態として「素数（確定）」「素数判定を通過（未証明）」「不明」、検算済み合成数は「合成数（未分解）」と表示する。長い判定理由の反復を画面・コピーから除き、全桁・指数・未解決項・停止理由は保持する。pendingGroupsの未確認値を素数扱いにしない。

数学的根拠は変更しない。SMALL_PRIMESとの照合または既存固定基底Miller-Rabinの2^64未満のprovenのみ確定。それ以上のprobableに素数証明はない。verifyRoutingResultの時間・操作量上限、取消、検算失敗は既存のunknown扱いを維持する。

native progressのvalue・aria-valuetextと色を揃え、終端通知は既存の結果statusへ委ねる。DOM順・focus・スクロール・Worker／WASM・資源予算は変更しない。

## 検証

回帰テストと実行結果は作業完了時に追記する。実機・読み上げソフト、Siteの正式採用と本番公開は未実施。
