# TDD 実行記録

実行環境: LLM-01 / WSL Ubuntu-24.04 / Node 24.19.0 / npm 11.19.0。
設計文書のcommit後にテストとスタブを追加し、以下を実際に実行しました。

| 単位 | red | green | refactor |
| --- | --- | --- | --- |
| 整数入力 | 4517a02: npm test、49件失敗、exit 1 | 67403c9: 49件成功、exit 0 | 指数読取・桁正規化の分離後も全件成功 |
| 因数累乗 | ece03ea: 対象テスト8件失敗、exit 1 | 84ac9c9: 合計57件成功、exit 0 | 範囲検査の分離・定数化後も57件成功 |

PR1のred は module 不在ではなく、export済みスタブの not implemented による挙動テストの失敗です。
入力テストには2250通りの整数科学的記法の相殺確認も含みます。
再実行: npm test -- --test-reporter=tap。
入力単独: node --test --test-reporter=tap test/core/integer-input.test.js。
因数単独: node --test --test-reporter=tap test/core/factor-powers.test.js。

ローカルの詳細logは受領ZIPと同じ非公開調査領域に保管し、リポジトリには取り込みません。
PR1時点ではブラウザ、Worker、素数判定・分解アルゴリズムは未実装で、実行検証も行っていませんでした。後続段階の実装と検証は以下に記録します。

## 計算・Workerの縦切り
- c7f3eb3で候補比較・契約を先にcommit。
- f4b8e95: engineの13挙動テストをスタブで全失敗、exit 1。
- 0fc5261: 13件成功。2..2500の独立trial oracle、Brent/Floyd、擬素数・予算・残余を含む。
- eab3161: forged mr64の新テストが失敗（14件中13成功）。7ad26c2で再検証し14件成功。
- 1697c79: controllerの9件をスタブで全失敗。8e73777でengineと合計23件成功。
- edb6269: browser timer receiverの回帰テストが失敗（10件中9成功）。d780bd0で10件成功。
- af317ce: job cleanupを共通化し、実Worker sourceの隔離実行も加えて合計82件成功。
- browserは実Chromeで検証し、[全72試行と限界](../benchmarks/llm01-baseline.md)に記録。

詳細logはリポジトリ外のLLM-01調査領域 prime-stage2/ に保管しています。
probableの長大値はWorker自己申告のscreeningとし、hostの積検算・有限mr64再検証とは区別しています。

- 95fc213: Worker CSP auditの新テストが失敗（11件中10成功）。a71d857で修正し合計83件成功。
- audit修正後、実Chromeでblocked Worker fetchの通知、取消/offline再起動、全72試行を再確認しました。

## 限定MPQS/WASMと並列比較
- 2afdf36でADR0003を先にcommitしました。
- abcc3b6: bridgeテストはmodule不在で1file失敗。e9940b2で4挙動が成功しました。
- C出力scratchの必要容量と戻りpointerを修正し、非自明divisorをC/JSで二重検算しました。
- b0bad26: dispatchの2挙動がUnknown algorithmで失敗。db301b1で合計90件成功しました。
- 76ab11e: portfolioテストはmodule不在で失敗。ac9be56でlane別seed・総予算分割・全終了を実装しました。
- b2b94f5: individual host timeoutの回帰が失敗（既存3件成功）。ac9be56で4件成功しました。
- 独立レビューで2-adic relation境界、factor-base初期化と広い試し割り前提を確認し、固定patchへ記録しました。
- native portable CのASan/UBSan（recover無効）で121入力、200回の中断・解放、synthetic relation境界を確認しました。
- d5f0609: 再利用factor-baseのmodsqrt==0回帰assertがexit134で失敗。57d913cで明示的に根をresetし成功しました。
- 修正artifactを2回clean buildし一致。94 Node tests、source/artifact hash、UTF-8/LF、diff-checkが成功しました。
- stale-root修正後の実Chromeで単独342試行＋並列72試行、通信監査・offline・WASM job取消/再生成を取り直しました。
- ローカル詳細logはrepo外のprime-stage3/、公開可能な測定receiptはdocs/benchmarks/に保存します。

## PR4: 低位GMP/ECM評価と資源所有権
2026-10-19、LLM-01、固定Node24.19.0/npm11.19.0で実施しました。

| 単位 | 実際のred | green |
| --- | --- | --- |
| GMP/ECM共通pipeline | 新algorithmがUnknown algorithm、6失敗 | 因子積・proof・明示exhaustion・不正除数拒否6成功 |
| GMP binding境界 | 新artifact未生成のmodule load失敗1件 | 実WASMのexact divisor・境界・停止後再利用・不正bytes拒否5成功 |
| factory別メモリ上限 | candidate factoryのnative Brent4本が拒否されず1失敗 | 生成前に128MiB超を拒否、portfolio9成功 |
| async admission | pool/poolが両方開始、run/poolが実行中jobを取消、2失敗 | 3競合の排他を確認 |
| cancel helper所有権 | cancel/pool等で意図しない受付・遅延rejectionを再現 | run/pool/cancel/auditの同期owner、7競合成功 |

GMP/ECMは完全に新規の通信禁止container2回で同じ454508byte WASMを生成しました。
SHA256は f2a31a887ccb7bc39da55acfdcdbfdc8b676630e799f895e063e0ee112b7a130 です。
SIQSは固定13ファイルの7Cソースから8objectを作り、2回のhashが一致しました。
SIQSはリンク・instantiate・数値実行していません。

native ASan/UBSanはGMP BrentとECMのcutoff各0〜199、計400停止と次jobのexact recovery、
raw ABIの空値・不正文字・非canonical・偶数・上限超過・未終端・seed0を確認しました。
停止phaseは計装しておらず、stage2専用の中断解放検証とは扱いません。
最終の件数・browser検証・独立レビュー・CIはPRの最終headで確認して記録します。

PR4実測コード5be4db3の119 tests/check成功後、Chromeで204単体+32poolを実測しました。HTTP/CDP/CSP/例外0、offline計算・取消・再初期化を確認しました。[rawと導出表](../benchmarks/llm01-gmp-ecm.md)は報告scriptで検算します。実WASMのmemory.grow拒否もcheckに含めています。最終CIと最終独立レビューのリンクはDraft PRに記録します。

## PR5: 有界 SIQS と実 stage2 検証
ADR0005 を236abddで先にcommitしました。実ログは repo 外の prime-stage5/ に保管します。

| 単位 | 実際の red | green |
| --- | --- | --- |
| SIQS binding | module未生成でfile失敗、prototypeの出力scratch誤用も検出 | 正しいmp_sprintf容量と戻りpointer、exact factor、解放・再利用 |
| 共通SIQS dispatch | Unknown algorithmで失敗 | complete/range/resource未完了と積の検証 |
| savefile EOF | nativeの3行再読assert失敗 | 有効最終行を保持、hex headerを検証 |
| 出力直前の予算 | 実Worker内でlongjmp再入ループ、1.5秒deadline失敗 | C解放・active解除後の有界文字列化、元例外と回復 |
| 64bit多項式選択 | 実browser computation-error、回帰testでfatal -5 | 既知の選択不可branchだけ容量終了、後続exact回復 |
| ECM stage2 fault | 4件失敗（stats未実装、faultなし） | 実stage2取消、trap、GMP/ECM割当失敗でpoisonと新instance回復 |
| RAM process tree | fixture注入未対応で実proc参照が失敗（集計不備自体は独立レビューで発見） | 全task集約、PID重複排除、RSS/PSS計数 |

SIQS native ASan/UBSanは6段階停止、代表成功jobの全2528割当地点の失敗、
13境界probe、ABI拒否と後続exact recoveryを確認しました。
ECM native は10候補中9地点の実stage2停止、出口・ecm_clear後、次jobの回復を確認しました。
未到達point3を検証済みとは扱いません。以前の400 cutoff停止も通過しています。
GMP OOMへlongjmp回復は行いません。実browserではfatal時のWorker破棄と明示再初期化を検証します。

最終レビューで初期化集計に再利用時のほぼ0msが34/68件ずつ混ざる問題を検出しました。
比較だけは各試行の旧Workerを必ずdisposeしてfresh生成する契約へ修正し、136試行を再測定しました。
報告checkは全比較行のfreshPerTrial=trueを要求し、初期化の過少計上とseed別の生成状態の混在を解消します。

## PR6: 保守的selectorとnative-only Worker
ADR0006を6eb97ebで固定後に実施しました。repo外prime-stage6/に実行logを保管します。

- selectorの境界/正規化/予算/不正指定テストはmodule不在でfile失敗（exit1）、実装後2挙動成功。
- WASMを無効にした旧bundleはready要求にinitialization-errorを返して回帰テスト失敗（exit1）。
  新native-only bundleは同じ条件でready/exact factor/非対応algorithm拒否に成功。
- 共通factor/proof/options/C/WASM runtimeは変更せず、selectorは既存の方式名と同一Budgetを使います。
- 新6入力はpolicy固定後に既存測定との非重複を確認し、small因子11個を独立uint64総当たりで証明。
  M127はruntime probable controlを維持し、証明・確率上限を追加しません。
- 中間135 tests/check成功。最小holdout18計算と最終headの検証は測定文書・PRへ記録します。

PR6実測code9b44327でholdout18計算、最大1 Worker所有、通信/例外/CSP0、offline/取消/再初期化を確認。閾値/seedは変更せず、135 tests/checkと導出表のsource/proof/全試行照合が成功しました。
