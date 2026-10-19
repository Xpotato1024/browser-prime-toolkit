# Stage12: 分単位・盲検比較のTDD
Stage11の218件を保全し、新しい有限時間枠・oracle配信境界・比較計画を独立に試験します。

- 旧30秒/2億上限をcloneした状態で、3/30/180/600秒、100億counter、600秒のclock/host grantの4件が実red。専用profile/制御層へ分離後4件green。
- Workerの600秒/100億grant・one-shot、初期化5秒と期限後success拒否、module bundle/外部oracle非混入を3件追加し7件green。
- 独立レビューでdecode前の禁止語検査からencoded oracleを配信できるP2を発見。実redでoracle pathへ解決することを確認し、decode後の固定14asset allowlistで13拒否・3許可の回帰をgreenへ修正。現行CLIは実HTTP404対照4件も記録する。
- 3/30/180秒それぞれの境界を2桁刻みで補うpolicyは、空refinementのstubで期待26/30が得られない実redからgreenへ。生成入力は初回前に固定し、成績による差替えをしない。

原ログは[validation-logs](../benchmarks/archive/validation-logs/)のstaged-long-{red,green}-{contract,route,refine}.log.txtへ保存します。最終全体は227件を想定し、実行結果を確認します。

実Chrome8群は最大2048bit/617桁の正確な冪、未対応方式の0 allocation、probable分類、600秒grantのloading/running取消、600秒加速時計によるhost deadline、不正protocol後の退役/新要求、不正ready、0/1です。加速時計とfault注入を性能試行へ混ぜません。初回asset後server停止/offline、page/Worker通信0、CSP/CDP/HTTPの正対照、maxLive1/live0を確認します。

600秒RSA-100は固定8a63892…で実施した原記録を[歴史source/raw](../benchmarks/archive/staged-long-router-v1/README.md)へ保存します。router修正時に進行中sourceを変えず、終了後に保全しました。独立レビューが27 source hash・14実配信asset・原bytesを照合し、計算中部分が不変のため10分rawの再実行は不要と確認しています。

小桁matrixは修正後CLI/contractに統一し、input×seedを分母に再試行を重複計上せず、成功時間へtimeoutを混入しません。全rawを集計から落とさない検査、生成MR64と別実装での素数cross-check、積/余因子、source/host/Chrome/予算、oracleの退役後照合を再検算します。未計測の桁や別方式を断定しません。

状態追記: Stage12の計測は途中停止です。227件は当時の予定であり、最終合格件数ではありません。44件のpartial matrixとRSA100の600秒timeoutを保存し、全matrix完了とは主張しません。
