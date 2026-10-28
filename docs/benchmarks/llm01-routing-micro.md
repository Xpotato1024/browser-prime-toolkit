# 分岐予算の小規模実測と工程UI

2026-10-28、計算・routingの基準HEADは62443141f8afbbb96a1c2e3e8d1846117b5fd3d9。測定harnessと固定問題は今回追加し、rawのsource SHA256で実際のserved sourceへ結びます。
i7-9700K／Windows8論理CPU、WSL2は6論理CPU、Chrome155.0.8059.39。
Windows総RAMは今回約31.9GiB、WSL割当約9.7GiB。過去の別RAM条件へ換算しません。
[固定plan](../../bench/routing-micro-plan.json)、[因子付き問題](../../bench/routing-micro-fixtures.json)、
[集計JSON](../../bench/routing-measured-summary.json)に条件と全反復値を保存します。

## 単独経路、各500ms・2反復

1 Worker・WASM予算128MiBを共通上限とします。実割当はNative0／GMP ECM64／通常SIQS128MiBです。
assets準備後のWorker初期化・既存前処理・探索・部分検算・退役を含み、最後のverifyRoutingResultを呼ぶ前までのelapsedMsです。純粋な算法kernel時間ではありません。
各入力でNative→ECM→SIQS、次は逆順。fresh Workerを使い、初回compile/cacheの影響も含みます。
最小因子幅と参照因子は返却後の監査専用で、engineへは入力と有限予算だけを渡します。
64bit以上の参照項は既存固定MRのprobableで、今回新しく素数証明したものではありません。
表は中央値msと参照因子対を復元できた回数です。0/2の短い値は分解速度ではなく停止までの時間です。

| 入力bit / 最小因子bit・形状 | Native Brent含む | GMP ECM | SIMD SIQS |
| --- | --- | --- | --- |
| 64 / 31・均衡・非平方 | 35.8 ms (0/2) | 103.1 ms (2/2) | 126.5 ms (2/2) |
| 96 / 17・非均衡 | 19.6 ms (2/2) | 72.4 ms (2/2) | 119.5 ms (2/2) |
| 96 / 48・均衡・非平方 | 25.9 ms (0/2) | 83.0 ms (2/2) | 109.0 ms (2/2) |
| 133 / 67・均衡・非平方 | 40.5 ms (0/2) | 500.1 ms (0/2) | 351.4 ms (2/2) |
| 193 / 24・非均衡 | 24.6 ms (2/2) | 69.2 ms (2/2) | 500.6 ms (0/2) |
| 192 / 96・均衡・非平方 | 29.4 ms (0/2) | 500.4 ms (0/2) | 500.3 ms (0/2) |
| 255 / 48・非均衡 | 26.1 ms (0/2) | 500.0 ms (0/2) | 500.0 ms (0/2) |
| 333 / 17・非均衡 | 12.8 ms (2/2) | 未対応 | 未対応 |
| 400 / 17・非均衡 | 13.3 ms (2/2) | 未対応 | 未対応 |
| 122 / 61・平方対照 | 8.6 ms (2/2) | 453.7 ms (0/2) | 224.6 ms (0/2) |

Nativeは失敗群で5万操作上限に先に達しました。ECM／SIQSの500ms停止も全rawへ保持しています。
122bit平方対照のECM／SIQSは探索終了して約数を返さず、Nativeは平方処理で復元しました。
ECMはn < 2^256、通常SIQSは332bit以下という実装能力であり、最適な切替点ではありません。
333／400bitでNativeが返せたのは17bit因子を持つ非均衡入力です。均衡400bitの完走実績ではありません。
96bitの2行は入力幅が同じでも最小因子幅で結果が変わる例で、未知の最小因子を事前に使う設計にはしません。

## 共通2秒枠でECM prefixだけをABBA比較

[事前plan](../../bench/routing-prefix-plan.json)のbaselineはNative250ms／ECM1000ms、候補はNative250ms／ECM250ms。
残り時間の最大1/4、単一deadline・work台帳・128MiB・1 Workerは同じです。各policy2回、順序はA-B-B-A。
以下は共通ルーティングの最終検算前までの中央値（初期化・探索・退役込み）と、最初の実測収集callbackまでの時間です。最終検算込みはrawのelapsedWithFinalProofMsに別記し、GUIの実経過表示とは区分します。

| 対照 | baseline → ECM250 最終検算前ms | 最初の収集ms | 因子対復元 |
| --- | --- | --- | --- |
| balanced133 | 763.2 → 503.1 | 614.8 → 356.6 | 2/2 → 2/2 |
| unbalanced193 | 15.7 → 15.4 | 収集前に終了 | 2/2 → 2/2 |
| balanced192 | 2000.7 → 1999.2 | 596.6 → 357.2 | 0/2 → 0/2 |
| unbalanced255 | 2000.0 → 2000.1 | 713.0 → 468.8 | 0/2 → 0/2 |
| unbalanced400 | 14.0 → 13.8 | 収集前に終了 | 2/2 → 2/2 |

133bit均衡対照は最終検算前までの中央値約34%短縮し、どちらも2/2で同じ因子対とprobable分類を得ました。
192bit均衡／255bit非均衡は両policyとも2秒内未完了です。収集開始の短縮を全工程の加速率へ換算しません。
観測済みの復元対・検証済み分解を失わず、後段の収集が毎回100ms以上早まる事前gateを満たしたため、
後段がある場合のECM既定prefixを250msへ採用します。Native250ms、能力上限、モード総時間・メモリは変えません。
ECMだけが利用可能な場合はprefixではなく残りjob予算を使います。より長いECMで救える因子領域は未検証です。
サンプルは各2回・1環境だけです。全入力の最適閾値や最速性の根拠にはしません。

## 実UIの確認

Brent含むNative／ECM／SIQSの単独能力対照と、既定のBrent→ECM→SIQS遷移を実計算で確認します。
未計測工程は不定、割合は関係収集の実カウンタだけです。収集目標到達を全体完了にしません。
受理した分割は「因子候補・最終確認前」として開閉表示し、primeとは扱いません。
取消後の実イベントを新しい実行へ遅延再配送してもUIが変わらないことを確認します。
時系列には工程名・実経過表示・bar値・途中候補を保存します。
raw、時系列、画像はローカルprime-routing-measured-20261028に保持します。

## 制限と再現

実行はNode24.22.1、既存Playwright1.61.0とChrome155で行いました。環境設定は変更していません。
scripts/generate-routing-micro-fixtures.mjsで問題、scripts/benchmark-routing-micro.mjsで単独、
同スクリプトの--prefixでABBA、scripts/verify-site-routing.mjsでGUIを再現できます。
参照169bit項の初期256候補探索は上限終了したため、測定前に有限1024候補へ広げました。その負の準備ログも保存しています。
72の実測job（単独52＋ABBA20）と8の能力外組合せを記録し、計測のWorker／URLは96/96退役、準備後通信0でした。
全体test/checkの既存拒否は再試行せず、CI・push・配布build・公開も実施しません。
実機スマホ・スクリーンリーダー・長時間均衡400bit全分解・競合との同条件比較は未検証です。

最終GUI試験は16ケースで、Worker14/14・Blob URL14/14を退役し、準備後通信0・page error0でした。
Native／ECM／SIQSの単独経路、既定pipeline、実elapsed表示の単調性、収集割合の意味、
受理済みprefix表示と取消後保持、古いjob callbackの無効化、fresh実行、unmountを確認しています。
mobile390px／desktop1280pxとECM実行中画像を保存しました。限定171試験が成功しました。
