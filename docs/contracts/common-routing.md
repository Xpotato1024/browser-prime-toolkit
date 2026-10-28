# 残余と共通予算に基づくルーティング候補

2026-10-28。ローカルの共通計画・実エンジンadapter・限定統合試験までです。
ローカルGUI候補へ接続しました。Site採用・公開版の変更は行いません。
入力は既存の309桁かつ1024bit候補契約で正規化します。
元入力・受理済み因子・残余を保存し、各段階の終了後は未分解の値から再計画します。
proper divisorも合成数になり得るため、返された因子の群も素数性を確認して再処理します。

## 暫定判断表

| 条件 | 次の候補 | 根拠・制約 |
| --- | --- | --- |
| 0／1 | neither | 素数・合成数ではない |
| 残余1 | 因子の素数性検証へ | 積の一致だけで素因数分解完了にしない |
| r < 2^128（bit長128以下） | 既存staged128、利用不可ならnative→ECM | 既存入口の能力境界。2^128自体は含まない |
| r ≥ 2^128 | nativeの有限前処理 | 小因子・素数／平方判定とBrentを含む既存portの想定 |
| 奇数5以上、r < 2^256 | ECM前処理候補 | 現行GMP bridgeの能力。総入力幅より見つける因子の大きさが重要 |
| 残余が332bit以下 | SIMD SIQS候補（前段の後） | 通常／明示wideの既存能力。最適な切替点の実測値ではない |
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
native prefix250ms、ECM prefix250ms、後段がある場合は残り時間の最大1/4を
前段へ配る値を暫定設定とし、最適値や成功率の保証ではありません。
設定として検証可能にし、能力上限のbit数とは区別します。

logical operation counterとSIQS family数を足しません。
native／staged／ECMの論理work台帳と、共通SIQS family台帳を別々に減らします。
途中停止で消費workを確定できなければ要求枠全量を保守的に課金し、
実行済み数とは表示しません。全stage数にも有限上限を持ちます。
同じstage／同じ値を重複実行せず、確認済みprimeを後段へ再投入しません。
合成因子群を再分解するときは元の重複度を掛け、既知の厳密な分割を再利用します。
1つの合成因子の候補を使い尽くしても、ほかの未分解因子に有限の処理を続けます。
同時に実行するportは1つで、退役確認前に次へ進みません。
SIQSの具体的な役割別割当は既存のnormal／wide資源policyで作成します。
たとえば通常128MiBでは1 Worker、384MiBでは最大3 Workerに縮めます。
既存wide332は1536MiB枠・coordinator1024MiB・helper64MiB・最大5 Worker・
最大3600000msを維持します。通常SIQSの600000ms枠へ黙って置換しません。
400bitの実験opt-inと既存wide332の利用は別条件です。
WASM割当上限はJS／転送／Chrome RSSを含む総メモリ値ではありません。
単にmaxWorkersとメモリ上限を別々に渡して、合計割当を超過させません。

## 部分結果と停止

portはjob ID・stage・元残余・単調sequence・work・累積snapshotを返す契約です。
snapshotは既存のengine-freeな厳密積検算を使います。
各報告はstage開始時点の因子に累積prefixを結合するため、繰返し報告を二重加算しません。
既に受理したprefixの消失・差替え、非約数、whole-inputをproper divisorとする報告、
過剰work、stale jobの結果を拒否／無視します。

本候補の積検算は素数性の検証ではありません。
probableというengineの申告も、検証前の申告として未分解残余と区別して保持します。
engine-freeなcreateRoutingSessionは残余1でもfactorizationComplete:falseを維持します。
createVerifiedRoutingSessionは既存assessPrimeで計画対象を分類し、
verifyRoutingResultで厳密積と各項の素数性を独立に再確認します。
固定MRで64bit以上はprobableのままで、decompositionComplete:trueでも
allFactorsProven／factorizationComplete:trueにはしません。
検算は1回最大25ms（明示設定時も100msまで）、共有100000論理tick以下、
共通job deadline内です。0／1は素数としません。
proof時間・work上限、実行時の停止理由、取消を別フィールドで保持します。

取消・job期限・phase期限・work上限・メモリ保護・Worker異常・不正結果・検算の時間上限を区別します。
portは有限disposeでWorker／URL退役を返す必要があります。
退役が確認できなければscopeをquarantineし、次のstage／再実行を禁止します。
取消後・古いstageからの遅延callbackは状態を変えません。

## 実装・検証の境界

src/routing/index.jsの計画と制御はengine-freeのままです。
実engineのimportは各portとverification.jsに分離します。
mock/protocol試験と実ChromeのBrent→ECM→SIQS試験を区別して記録します。
arithmetic.jsは対象を限定した本人許可後の正規読取で確認でき、既存関数へ接続しました。
全体test/checkの既存拒否は再試行しません。隔離資産の復元や別コピーは使用しません。
[実接続・限定試験と残件](../operations/common-routing-integration.md)を参照してください。
GUI候補の接続は[別の限定受入](../operations/common-routing-gui.md)に記録します。公開・長時間400bit全分解は未実施です。

## Port境界

入口はsrc/routing/index.jsです。registryは作成時に固定します。
start(request,{signal,onSnapshot,scope,scopeToken})は同期的に所有leaseを返します。
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
native-port.jsは既存runExtendedInputの検証済み進捗／最終結果を変換し、
staged-port.jsは既存p64選定API、ecm-port.jsは既存GMP splitterを専用64MiB Workerで使います。
siqs-ports.jsは通常332／wide332／実験400の既存APIを用い、familyLimitで発行数を有限にします。
registryは利用側が明示的に組み立てます。未知資産の自動取得は行いません。
メモリ停止もportの報告理由であり、実測OOMと断定しません。
定数の性能調整と公開は別の未完工程です。

work台帳はportごとの論理単位で、CPU命令数の共通計ではありません。
staged macro内部のBrent／ECM消費を別portの観測値へ推定加算しません。
要求枠を実engineで守ること、実work・解放を正しく返すことも実adapterの結合検証対象です。

## ローカルGUI採用

通常／高精度／大メモリを共通routingの予算presetとして接続します。
通常は1024bitまでの有限前処理と332bit以下の後段、高精度は332bitまで、
大メモリは400bitまで受け付け、333〜400bitのSIQSは実験的・全分解未検証と明記します。
既存wide332のcoordinator1024MiB／総1536MiB／最大1時間は維持します。
小入力のstagedは最大60秒、以後もjob deadlineは延長しません。
GUIは工程開始と受理された関係収集量だけを進捗へ変換し、
最終確認前に全体完了を表示しません。modeは別アルゴリズムではありません。

後段がある時のECM prefixは、[小規模実測](../benchmarks/llm01-routing-micro.md)の
1000ms対250ms ABBA比較に基づき250msへ変更しました。
Nativeの250msと5万操作枠は維持します。最適なbit閾値を確定したものではありません。
受理済み分割はGUIの開閉表示へ因子候補として転送し、素数性の最終確認前と明示します。
