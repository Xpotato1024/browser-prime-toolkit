# 分単位・小桁評価の操作
[ADR0012](../adr/0012-bounded-minute-evaluation.md)のprivate評価用profileです。製品UIと既存30秒profileを変更しません。方式はnative BigInt Brentで、GMP/ECM/SIQSはこの経路に未導入です。

`npm run verify:long-rsa -- --case RSA-100 --seed 1 --budget-ms 600000 --out /tmp/rsa100-10min.json`で公式Nの上限10分試行を行います。時間は3000/30000/180000/600000msだけを選べ、操作予算は有限100億、1 Worker、2048bit/617桁、WASM0です。每checkpointの時計とhost deadlineを併用し、初期化・proof・退役を課金します。time-budgetとoperation-budgetを区別し、未完了から成功時間を推定しません。

`python3 scripts/generate-practical.py --check`は事前固定した26入力・52素因数・generator/oracle hashを再検算します。生成済みの入力は置換不可です。catalog/cases.jsはNだけを含み、oracle.jsonはbrowser配信対象外です。新CLIはdecode後の明示14assetだけを配信し、encoded oracle/manifest/traversal等を実HTTP404対照で確かめます。計算中はserver停止/offline、通信0をCDP/HTTP/CSPで監査します。因数oracleの照合はWorker退役後のNodeだけで行います。

`npm run benchmark:practical`は各桁2入力×2seedを3秒から開始し、未完了だけ30秒、さらに未完了だけ180秒へ進めます。各試行はfresh browser/Workerで最初から再計算します。成功率は固定4組が分母で、retryを別標本へ数えません。短い枠での成功を長い枠の到達率にも含みます。成功時間へtimeoutを混ぜず、先行再試行込みの待ち時間は別に示します。

全rawは上書き不可です。計測途中の再開は既存rawのhead/source/input/seedを照合して利用します。performance対象のsourceを変更した場合は新しい測定versionへ分けます。`npm run report:practical -- --check`は全rawが集計に含まれ、積/確度・固定条件・分母が整合することを確認します。

初回10分試行の後に、計算前serverのoracle遮断を補強しました。[歴史source/raw](../benchmarks/archive/staged-long-router-v1/README.md)は原bytesを保全し、計算中部分が同一であったことを機械照合します。旧pilotは新matrixの分母へ混ぜません。独立レビューは歴史rawの再測定を不要と確認しました。

Chrome treeのRSS/PSSは標本で、JS全体heapのhard cap/瞬間peakではありません。数分でも未完了なら同じ方式での無制限延長をせず、資源と観測を返します。公式RSAの能力・異なる方式・未測定の桁数をこの小標本から断定しません。
