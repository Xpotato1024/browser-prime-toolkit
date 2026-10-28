# ローカル候補の1024bit受付と有限BigInt Worker

2026-10-28。src/extended/runner.js のrunExtendedInputは、独立候補契約を既存native-only Brent Workerへ接続する内部入口です。通常adapter/GUIへの接続は[採用契約](adapter-extended-input.md)に従います。
本ローカル候補では通常adapter/manifestの受付を309桁・1024bitへ変更しました。公開済み版とSiteは未変更です。staged128bit、SIQS332bitの処理境界は維持し、SIQS400bitへのdispatchは未実装です。
新しい因数探索や素数判定は作らず、既存factorInteger・算術verifier・native Workerを使います。WASMは使いません。

## 有限の受付・実行・検算

受付は4096文字の既存parserと、309桁以下かつ2^1024未満の候補契約で検査します。
0/1は計算しません。時間は既定1000ms・最大5000ms、計算量は既定50000・最大1000000操作です。
一つのWorkerだけを所有し、初期化と検算を総時間に含めます。module内のleaseで同時実行を拒否し、adapterからは既存Document scopeの所有tokenを借り、表示まで親のleaseを保持します。
これはJS heap/RSSのhard capではありません。operand・因子数1023・反復・Worker寿命を制限しています。

因子積と正規形を候補契約で照合し、既存verifierと独立の素数性再評価を通します。
7基底MRのprobableは証明へ昇格しません。小素数の抽出済みという前提を再確認してassessPrimeを使います。
受理済みprefixの因子数を後戻りさせず、不正な後続結果では前の検算済みprefixだけを保持します。
検算は最大25ms/100000tickの協調的な枠です。単一のBigInt演算や既存verifierの内部を途中で割り込める保証ではなく、呼出し前後でも期限を確認します。

## 進捗と停止

準備・計算・検算・終端を通知し、全体割合はすべて不定です。受理因子数は完了率ではありません。
時間、初期化時間、計算量、検算時間/検算量、取消、Worker/通信/計算/検算不正を区別します。
取消・終了後の遅延eventを無視し、Worker終了とsource URL解放の両方を確認してleaseを返します。
解放不明はscopeをquarantineし、次の実行を拒否します。返却値のcalculationStatus/stopCauseは、退役失敗の背後にある停止理由も保持します。
これらの確認はbrowser API操作の成功であり、OS上の全メモリが返却された証明ではありません。

## 実証と残件

Nodeの実factorIntegerを使うtransport試験と、実Chrome/native Workerの短時間試験で検証します。
平滑数の1024bit完了、101桁の指数表記、521bit probable、1024bitでの計算量停止、取消・再開、範囲外を確認します。
これらは大きな均衡半素数の完走性能・他端末の速度・最大級/最速級の比較根拠ではありません。
既存公開UIの実WASM/取消/解放も別試験で確認します。実機スマホ、実スクリーンリーダー、Site採用、新しい公開配布は未検証です。
SIQS400bitはNative ABIの宣言だけで有効化しません。JS/embedded Worker契約、有限の初期化/収集/抽出、因子packet/素数性/取消/メモリ検証が次の工程です。

検証記録: Node24.22.1/npm11.19.0の全723試験とnpm run checkが成功。Chrome155.0.8059.39で公開候補UI18項目、非公開拡張入口8項目、234bit実SIQSの進捗→取消1項目が成功しました。
234bitでは21/15166の収集通知とnative progressの一致を確認しました。RSA-100は3秒内に通知がなく不定表示のままで、完走・性能評価には使いません。
独立read-onlyレビューの3指摘（検算予算の分類、最終検算の予算、whole-input素数snapshotの分類）を修正しました。レビュー担当のarithmetic.js読取は自動承認で拒否され、内部の独立再評価は含まれません。再読・迂回はしていません。

この採用段階の関連93試験と、配布候補を使うChrome21項目が成功しました。最新差分の全体npm test/checkは自動承認レビューが実行前に拒否したため未実施で、前段の723試験成功を今回の全体成功とは扱いません。
