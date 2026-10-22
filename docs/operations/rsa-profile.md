# RSA 30秒profileの利用・検証
この経路はprivate評価用で、既存UIの1秒profileへ接続していません。native BigInt Brentのみ有効です。2048bit・617桁を受理しても30秒内に分解できる保証はありません。GMP/ECM/SIQSは未導入としてWorker作成前にunsupportedを返します。大規模SIQSの残課題は[実上限と拡張設計](../architecture/rsa-backend-limits.md)を参照してください。

`npm run verify:rsa-profile -- --out /tmp/rsa-contracts.json`は実Chromeとmodule Workerで8群の契約を確認します。環境変数CHROME_BINでChromeを固定し、PRIME_MEASURED_HEADへGitの40桁HEADを渡します。各実行はfresh browser/profileで、初回asset取得後にserverを停止しofflineへ切り替えます。page/WorkerのCDP、HTTP、CSPと正の検出対照を記録します。期限の短縮時計テストは性能測定ではありません。fault群は不正protocolの注入で、native coreの実trap再現とは区別します。

`npm run verify:rsa-profile -- --case RSA-100 --seed 1 --out /tmp/rsa100-seed1.json`は[公式一覧の原数](../../bench/staged-rsa/catalog.json)を全桁そのまま投入します。出力は上書き不可です。既知因数、分割ヒント、期待因数は入力しません。旧名称の数字は十進桁、新名称の数字はbitです。参照した公式53件にないRSA-129は未収録です。[出典と取得hash](../../bench/staged-rsa/provenance.json)は原著者の一覧と公開checksumを保持します。

計測は入力検査前から、Worker生成・compile/初期化・計算・delivery・hostの積/確度検証・退役を含みます。初回asset取得とChromeプロセス起動時間は別欄です。初期化は同じ30秒内で5秒上限、Worker計算枠は残時間から25ms控除します。event loop遅延によるtimeout応答の超過は実測値を残し、30秒内成功に数えません。

1 Worker、30000ms、2億algorithm checkpointを固定します。checkpointはCPU命令数ではありません。operation-budgetの早期停止はincomplete、時間切れはtimeout、方式範囲外はunsupportedです。prime/probable/factorizedを区別し、probable因数だけの完了は分解成功へ数えません。単位0/1はneitherです。取消/fatal後のWorkerを再利用せず、同一evaluatorの並行要求を拒否します。全JS heap hard capはありません。WASMは0 bytes、RAMはChrome process tree RSS/PSSの標本であり瞬間peakや上限ではありません。

性能は同一head/source hash・host・Chrome・Worker数・固定seed群で反復し、全試行の結果、成功率、初期化込み時間の中央値/範囲、積一致と素数確度を併記します。最大値は「この条件で測った公式問題のうち観測された最大」に限定し、未測定の問題や普遍的上限を推定しません。成功0なら最大成功値は未成立です。契約試験と実時間の性能試行は別receiptにします。
