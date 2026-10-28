# 共通ルーティングの実接続と限定試験

2026-10-28、LLM-01の新checkoutでのローカル候補です。
公開版0.1.5、Site採用、GUIの高精度／大メモリ上限は変更していません。
[共通契約](../contracts/common-routing.md)が計画と返却値の正本です。

## 接続したもの

| モジュール | 既存の計算・検証 | 今回の責務 |
| --- | --- | --- |
| native-port.js | runExtendedInput／既存BigInt Worker | 検証済み進捗と最終結果の変換、root scope借用 |
| staged-port.js | runSelectedStagedRequest、p64 | n < 2^128の既存macro、WorkerとURLの個別退役確認 |
| ecm-source.js／ecm-port.js | createGmpSplit、既存固定GMP WASM | 64MiBの単独Worker、有限time／logical work、proper divisor検算 |
| siqs-ports.js | optimized／selected-wide／siqs400 | 既存profileの起動、familyLimit、停止理由と解放の変換 |
| verification.js | SMALL_PRIMES、既存assessPrime | 未分解target選択、共有proof予算、最終分類 |
| session.js／plan.js | engine-freeな厳密積契約 | 単一deadline、異なるwork単位、部分結果、重複防止 |

NativeのonAcceptedはhostが実際に検査した凍結snapshotだけを通知します。
任意objectのコピーを「検証済み」とはしません。
GMPがproper divisor15を返すこともあり、約数であるだけではprimeと扱いません。
合成因子の重複度を引き継いで再計画し、同じ値の既知分割を再利用します。
1因子が候補を使い尽くしても、残る別の合成因子は予算内で続けます。

createRoutingSessionは算術を含まない制御入口です。
実接続は必要なportだけをregistryへ渡してcreateVerifiedRoutingSessionを作り、
run後にverifyRoutingResultを呼びます。全portを一括で有効化する公開presetは追加していません。
WASM／SIMDの利用可否と明示メモリ枠は呼出側が指定します。
Native／staged／ECM／SIQSのwork単位を足し合わせません。

## 有限条件と停止

job deadlineは分割や後段移行でリセットしません。
native prefix250ms、ECM prefix1000ms、後段ありなら残り時間の最大1/4という値は暫定設定です。
通常SIQSは最大600000ms、既存wide332／実験400は最大3600000msの能力枠です。
既存wide332の1536MiB総WASM予算、coordinator1024MiB、helper64MiBを保持します。
今回の試験はこの最大時間を使ったものではありません。

発行family数は1..4096のfinite limitで制限し、通常のdrain／release／extractを維持します。
強制停止で実消費を確定できなければ要求work全量を保守的な上界として課金します。
進捗最終観測を総消費と偽りません。phase／job時間、work、proof時間／work、
メモリ保護、algorithm-resource、Worker異常、取消を区別します。
最終stageの時間／work停止を単にstage-countへ置き換えません。

素数性の計画時cacheと最終確認は同じjobの100000論理tick枠を共有します。
既存MR判定による64bit以上のprobableは証明ではありません。
decompositionCompleteとallFactorsProven／factorizationCompleteを分けます。
取消・解放不確定時に追加の素数性計算を始めません。
解放に失敗したscopeはquarantineし、次の計算へ進みません。
Workerの異常消失だけをOOMとは断定しません。

## 今回実施した検証

Node24.22.1／npm11.19.0で対象10ファイルの87試験が成功しました。
内訳はroutingの計画・制御・Native／staged／ECM／SIQS port・素数性確認と、
既存Native callback／SIQS400／selected-wideの差分回帰です。
mock/protocol試験は実際の分解性能の測定ではありません。
selected-wide生成整合性check、UTF-8/BOM/LFとgit diff --checkも確認します。

実Chrome155.0.8059.39（WSL2、headless）の限定13ケースを実施しました。
準備後は計算APIを差替えず既存Worker／WASMを使用します。

| 対照 | 確認したこと |
| --- | --- |
| staged91／100bit | 既存p64の分解、因子積・素数性・解放 |
| verified97 | prime確認済みなら計算Workerを作らない |
| 2^256−1、最大4stage | ECMの合成約数15をstagedへ再投入、部分結果は未完了のまま |
| Native91／M127 | 小さい完全分解、64bit以上のprobableを区別 |
| Native10^100 | 101桁のsmooth入力を2^100×5^100に分解・検算 |
| Native→ECM | 先頭work枠を使い切った後、71bitの小因子を既存ECMで発見 |
| Native→ECM→SIQS | 133bit対照で既存SIQSが9families後に約数を返し、2因子はprobable |
| Native途中取消／fresh91 | 受理済みprefixを保持、取消後に新規実行可 |
| wide332の133bit対照 | 既存wide1024MiB coordinator経路を維持 |
| 実験400、1500ms | 期限停止・未分解・Worker／URL退役。全分解ではない |

最終Chrome原本はローカル作業用evidenceの
prime-ecm-routing-20261028/integration-final-reviewed.jsonです。
served sourceごとのSHA256、入力／設定、rawと分類後の結果、traceを保存します。
13ケースでWorker18/18、Blob URL18/18の解放と準備後の外部通信0件を確認しました。
400bitではstageのphase-time-budget後に共通job期限へ到達し、
executionReason:job-time-budgetを保持したまま、最終確認はproof-time-budgetで止まりました。
未分解入力を保持し、メモリ停止や分解完了とは表示しません。
過去の失敗・旧試行も上書きしません。これは持続性能や他端末との比較ではありません。

## レビュー修正と残件

独立読取レビューで、Nativeの検証予算停止、SIQSの未知exit、
検証中取消の分類を修正しました。
また、最小compositeの候補枯渇後に別targetへ進めない問題を修正し、
225→9と25、9枯渇後に25→5²へ進む回帰を加えました。

arithmetic.jsは本人の対象限定許可後に正規の読取で確認しました。
既存の全体npm test／npm run checkへの拒否は再試行していません。
今回の87試験は全suiteの成功を意味しません。CIもpush禁止のため未実施です。
隔離JSの復元・再取得・再生成、セキュリティ設定変更はしていません。

400bitの算術全域・長時間収集・行列・GCDの通し完了、物理スマホ、
最速級／最大級を裏づける同条件比較は未検証です。
GUIへ共通routingを採用する接続と、公開前の全体試験・CIは残ります。
400bit単一familyの過去観測と、この短い期限停止試験は
[別の実測](../benchmarks/llm01-siqs400-family.md)として扱います。
