# 残余と共通予算に基づくルーティング候補

2026-10-28。設計・独立実装段階です。公開GUI／実エンジン接続ではありません。
入力は既存の309桁かつ1024bit候補契約で正規化します。
元入力・受理済み因子・残余を保存し、各段階の終了後は残余から再計画します。

## 暫定判断表

| 条件 | 次の候補 | 根拠・制約 |
| --- | --- | --- |
| 0／1 | neither | 素数・合成数ではない |
| 残余1 | 因子の素数性検証へ | 積の一致だけで素因数分解完了にしない |
| r < 2^128（bit長128以下） | 既存staged128、利用不可ならnative→ECM | 既存入口の能力境界。2^128自体は含まない |
| r ≥ 2^128 | nativeの有限前処理 | 小因子・素数／平方判定とBrentを含む既存portの想定 |
| 奇数5以上、r < 2^256 | ECM前処理候補 | 現行GMP bridgeの能力。総入力幅より見つける因子の大きさが重要 |
| 残余が332bit以下 | SIMD SIQS候補（前段の後） | 既存hostの能力。最適な切替点の実測値ではない |
| 残余が400bit以下 | 明示opt-inの実験的SIQS400（332版の後） | 準備・単一familyまでの検証。全工程完走は未検証 |
| それより大きい未解決合成残余 | 未対応を返す | GNFS未実装。無期限Brentや未実装ECM400へ流さない |

通常／高精度／大メモリは将来、同じルーティングの時間・メモリ・Worker予算presetとします。
通常を恒久的なBrent専用とはしません。実装済みportと資産、WASM／SIMD、
残り時間・work・メモリの条件が揃えば後段へ進めます。
今回の候補は公開modeの意味や既存資源policyを変更しません。
400版に333bitという下限を設けず、より小さい残余でも利用可能とします。
同じ残余についてSIQS profileを替えてfamily0から再計算するfallbackは行いません。
既存APIにはcollectorの安全な移譲がないため、同じ残余のSIQSは一度だけです。

## 予算と重複防止

job開始時に単調なdeadlineを一度決め、前処理・分割・残余変更で延長しません。
各段階へmin(phase cap, remaining time)を渡します。
native prefix250ms、ECM prefix1000ms、後段がある場合は残り時間の最大1/4を
前段へ配る値を暫定設定とし、最適値や成功率の保証ではありません。
設定として検証可能にし、能力上限のbit数とは区別します。

logical operation counterとSIQS family数を足しません。
native／staged／ECMの論理work台帳と、共通SIQS family台帳を別々に減らします。
途中停止で消費workを確定できなければ要求枠全量を保守的に課金し、
実行済み数とは表示しません。全stage数にも有限上限を持ちます。
同じstage／同じ残余を重複実行せず、既知因子を後段へ再投入しません。
同時に実行するportは1つで、退役確認前に次へ進みません。
SIQSの具体的な役割別割当は既存のnormal／wide資源policyで作成します。
たとえば128MiBでは1 Worker、384MiBでは最大3 Workerに縮めます。
単にmaxWorkersとメモリ上限を別々に渡して、合計割当を超過させません。

## 部分結果と停止

portはjob ID・stage・元残余・単調sequence・work・累積snapshotを返す契約です。
snapshotは既存のengine-freeな厳密積検算を使います。
各報告はstage開始時点の因子に累積prefixを結合するため、繰返し報告を二重加算しません。
既に受理したprefixの消失・差替え、非約数、whole-inputをproper divisorとする報告、
過剰work、stale jobの結果を拒否／無視します。

本候補の積検算は素数性の検証ではありません。
probableというengineの申告も、検証前の申告として未分解残余と区別して保持します。
残余1でもfactorizationComplete:false、primalityVerified:falseを維持し、
実engine別の検証済みattestation接続前はfactor-proof-requiredで止めます。

取消・job期限・phase期限・work上限・メモリ保護・Worker異常・不正結果・検算の時間上限を区別します。
portは有限disposeでWorker／URL退役を返す必要があります。
退役が確認できなければscopeをquarantineし、次のstage／再実行を禁止します。
取消後・古いstageからの遅延callbackは状態を変えません。

## 実装・検証の境界

src/routingの計画とport制御は算術engineをimportしません。
mock portで境界、残余再計画、引継ぎ、検算、取消と資源解放を検証します。
これは実Brent→ECM→SIQSの統合成功とは別です。
arithmetic.js読取と全体test/checkの既存拒否を迂回しません。
実portの接続・素数性証明／probable検証・GUI採用・長時間400bit分解は未実施です。

## Port境界と残る接続作業

入口はsrc/routing/index.jsです。registryは作成時に固定します。
start(request,{signal,onSnapshot})は同期的に所有leaseを返します。
lease.resultは{reason,packet}のPromise、
lease.disposeは{allWorkersDisposed,allWorkerSourcesReleased}を返す有限処理です。
packetはversion:1、jobId、stage、input、seq、work、snapshot、
reportedPrimalityだけを持つdata recordに限定します。
snapshotは{factors:[{value,exponent}],remaining}の累積報告です。
誤ったjob／stageは進捗callbackでは無視し、finalでは不正結果として拒否します。
同sequenceのfinalは同一内容だけを許し、古いfinalは受理しません。

nativeの既定work上限50000、staged50000000、ECM500000、
SIQS4096familiesを別の台帳として保持します。値は有限な設定範囲で調整できます。
消費workが確定するのは期限内に最終packetを検証できた場合だけです。
進捗の最終観測値を全消費と見なさず、不確定なら要求枠全量を差し引きます。
起動前の取消と確認できる場合は0です。
検算中にも共通job／phase期限を確認します。

実際のnative／GMP／staged／SIQS返却値はこのschemaと異なるため、
各engine固有の検算・prime certainty・work単位・停止理由・資源解放を
検証して変換するadapterが必要です。既存のverified outcomeを
単に任意objectへコピーして検証済みとすることはしません。
本候補はそのadapterをまだ提供・束縛していません。
メモリ停止もportの報告理由であり、実測OOMと断定しません。
実engine接続、定数の性能調整、GUI採用と公開は別の未完工程です。

work台帳はportごとの論理単位で、CPU命令数の共通計ではありません。
staged macro内部のBrent／ECM消費を別portの観測値へ推定加算しません。
要求枠を実engineで守ること、実work・解放を正しく返すことも実adapterの結合検証対象です。
