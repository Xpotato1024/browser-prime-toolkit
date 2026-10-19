# LLM-01: RSA専用30秒profileの基準測定
RSA-100（公式原数100桁・330bit）を5 seedで実測しました。成功は0/5、観測最大成功値はNoneです。未測定問題の最大能力や普遍的上限は示しません。

初期化込みrequest時間は中央値29.9770秒、範囲29.9764–29.9774秒です。この時間は未完了試行の終了時間で、分解成功時間ではありません。全5件の停止分類は{"timeout/time-budget": 5}です。

|seed|結果 / 理由|初期化込み秒|checkpoints|
|---|---|---:|---:|
|1|timeout / time-budget|29.9771|85,921,159|
|11|timeout / time-budget|29.9770|85,108,348|
|23|timeout / time-budget|29.9774|87,158,263|
|41|timeout / time-budget|29.9769|86,334,233|
|67|timeout / time-budget|29.9764|86,300,590|

測定code head: 6c728c37c98fa08313e6ff84b10a5009fd6e99f5。Chrome Chrome/155.0.8059.39、Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz、WSL 6.18.33.2-microsoft-standard-WSL2、論理CPU 6、1 Worker、WASM0、native BigInt Brent、有限2億checkpoint、初期化込み30000msを固定しました。各回fresh Chrome/profile、assets/source hashは全回一致です。assets取得・Chrome起動はrequest時間外の別欄です。

既知因数・期待因数・分割hintは使っていません。全件でfactorsは空、余因子は公式N全体のままです。積の再構成は一致しますが、素因数を発見・証明した実績はありません。probableを成功に数えていません。全試行は旧50M上限を越え、30秒の時計枠を使っています。50Mで先に止まった[予備5試行](archive/staged-rsa50m/README.md)をこの集計へ混ぜません。

全件で初回asset後server停止/offline、page/Worker/CDP/HTTP/CSP違反0、正の検出対照成功、maxLive1/live0です。RAMは全Chrome treeの標本最大RSS 1317687296 bytes、PSS 443453440 bytes。起動を含む標本で、JS全体hard capや瞬間peakではありません。

[集計JSON](llm01-staged-rsa100-summary.json)は5 rawのhashを保持し、npm run report:rsa -- --checkが入力・積/確度・source・固定条件・集計を再検算します。[契約receipt](llm01-staged-rsa-contract.json)の合成冪/加速時計/faultは性能結果へ含めません。GMP/ECM/SIQSはこのprofileで未対応です。[大SIQSの実上限と必要変更](../architecture/rsa-backend-limits.md)は残件であり、このnative基準の測定をもって方式探索や元の性能目標全体の完了とはしません。
