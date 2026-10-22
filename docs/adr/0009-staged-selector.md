# ADR0009: 有界な方式選択・段階予算・反復holdout比較
状態: 非公開の最小統合。2026-10-19、実装・測定前に固定。baseはPR8の82f1c3e。

## 契約
受付は0以上2^128未満だけとし、SIQSへ渡す残余は64〜128bitの既存範囲を越えない。
新private protocol/resultはstagedという方式名を明示し、旧options/result/selectorを上書きしない。
共通の小因子・MR・平方・積検証とproven/probable/incompleteの意味を維持する。
ジョブの一つのBudgetで前処理・全余因子・全方式を計数する。各段階の未完了は次段階へ進めるが、global枠はresetしない。
time/operationのglobal終了はincomplete、resource終了も未解決余因子を保持する。fatalは次方式へ隠れてfallbackせずWorker error/退役とする。
段階budgetの時計/操作値はroot Budgetに同期し、同じstage budget identityを全splitで保持してECM曲線を再使用しない。
UI/site/CSP/license/公開・Ready/merge/releaseは対象外。

## 有限の候補
既存Brent、固定ECM(Suyama/B1=2000/B2=200000/全job最大32σ)、集約dense SIQSだけを使う。
P64: 残余64bit以下はnative Brent。65〜128bitはBrent prefix→ECM prefix→SIQS。
P80: cutoffだけ80bitに変える。prefix配分はP64と同じにして閾値の影響を比較する。
Brent prefixはjob合計20ms/50000checkpoint、ECM prefixは80ms/500000checkpoint。残りはSIQSへ。
stage時計のcallback間隔超過は観測して記録し、厳密wall保証とはしない。外側terminate期限を常に持つ。
割当量は暫定値で、SIQSへ大部分の1秒枠を残すための有限比較である。holdout後の再調整は行わない。

## 所有・時間
hostは最大1 Worker、1jobを所有し、cancel/timeout/fatalで退役し自動再生成しない。
requestの単一deadlineはWorker作成より前に開始し、compile/ready/計算/結果配送を含め1000ms。
coreには残時間から25msの配送猶予を引いた枠を渡す。初期化期限も全request deadlineを超えない。
初回page asset取得は別記録。OS/GC/単一BigInt演算・proof検証を含む厳密リアルタイム保証ではない。
native-onlyはWASM0、ECM-only/SIQS-onlyは64MiB、stagedで両backendを持つ場合は計128MiB。
compileの費用とRAMを隠さずfresh browserで比較する。全Chrome tree PSS/RSSは25ms標本でhard RAM上限ではない。
method/operation/time/outcomeの有界traceを記録し、input/output byte上限も受信・送信で検査する。

## 一般群と未使用holdout
一般群6問はtinyな有利例の追加でなく、既存balanced64/80/約82/96/112bitとunbalanced(1009×M89)に固定。
Brent/ECM/SIQS/P64/P80、seed1/11/23の各3反復、各セルfresh Chrome/Worker、順序回転（90trial）。
一般群の成功数を最優先、次に全trialの初期化込みrequest中央値、同点は小さいcutoffで候補を一つ選びcommitする。
未完了は0ms成功として扱わず、成功限定時間と全trial時間を分け、中央値・IQR・min/max・成功数を報告する。
holdoutはseed固定生成の新6入力(64/76/100/124bit balanced、約81bit unbalanced、127bit MR-screened probable)。
全既存の記録済みinputとの非重複・独立Python powによる64bit因子検証を先に記録し、raw hashを固定する。
policy凍結後だけ、Brent/ECM/SIQS/選択policy×seed101/211/307/401/503の各5反復を測る（120trial）。
holdoutの結果でcutoff/seed/prefix配分を変更せず、失敗・未完了・probableも保存する。
取消loading/runningの応答・全Worker退役・再実行・fatal・短期限を別枠で検証する。

## 保全と完了
ユーザーの「比較した各方式は教育的価値があります。データを保全しておくように。」に従い、
不採用/旧版を含め実装/原本pin・hash/raw/input/環境・予算/失敗/再現手順/対応commitの比較目録を追加する。
既存測定・binary・scriptを削除/上書きせず、改訂した新実験もrevision単位でarchiveする。
保存していない一次資料や未実行方式は欠落/未実施と明示する。secret・token・署名URLは含めない。
TDD実log、最終head tests/check・CI・独立reviewを確認し、新Draft PRで返す。
