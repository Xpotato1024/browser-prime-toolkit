# 半素数分解の性能評価計画
状態: native基準の[初回実測](../benchmarks/llm01-baseline.md)と[限定MPQS/WASM・並列比較](../benchmarks/llm01-wasm-mpqs.md)を記録済み。最終engine・数値目標は未確定です。

中核目標は、backend通信なしのブラウザで、可能な限り多い桁の半素数を高速に分解することです。
native BigIntだけを最終engineに固定せず、WASM・多倍長library・アルゴリズムを比較します。
入力受付上限1024桁は、1024桁半素数の分解能力を意味しません。

## 比較軸と段階
小因子の除去・完全冪の前処理、Pollard系、p−1/ECM、QS/SIQS等を候補に段階評価します。
これは候補一覧であり、選定や速度・対応桁数の主張ではありません。必要な一次資料と実装を採用時に固定します。
計算コア・同じ問題集合・同じ時間/メモリ予算でnativeとWASMを比較し、UI更新コストと分離します。
大規模な方式を無条件に独自実装せず、実績ある実装のbrowser適合・license・build再現性を調査します。

半素数n=pqは総桁数だけでなく、p/q各桁数、近さ、p=q、p−1の性質等を記録します。
balancedと小因子を持つunbalancedを混ぜた単一スコアで性能を誇張しません。
素数・完全冪・多因子・0/1・悪意入力も正確性/停止の対照群にします。
benchmark corpusは公開可能な固定値、期待因子、その検証根拠、seedを版管理します。

## 測定表の必須項目
- engine/library/algorithm、source commit、build flags、WASM SIMD/thread有無、artifact bytes/hash
- browser/OS/CPU/RAM/端末電源状態、Worker数、memory上限、cold/warm ready時間
- nとp/qの桁数・bit数、因子バランス、case数、試行数、乱数seed
- 1秒/10秒/60秒など明示したjob予算ごとの完了率、打切り率、因子/残余
- 成功試行のmedian/p95、全試行の打切りを含む分布、peak memory、取消応答時間
- main thread応答性、準備後通信ゼロreceipt、offline一致、例外/crash
時間予算は評価用の例であり、現時点の性能保証ではありません。
失敗/timeoutを除外した「速さ」だけで比較せず、元入力と因子・残余の積一致を全件確認します。

## 判断ゲート
まず再現可能な小さなcorpusを作り、低性能端末を含むbrowser matrixで測定します。
採用engineは性能だけでなく配布size、memory、license、Worker/CSP適合、取消を満たす必要があります。
最大桁数・無制限時間・全半素数の完了は保証しません。端末とbudgetごとの実測限界を表示します。
Worker/WASMのサイト受入れは[既存形式との差分](../contracts/site-adapter.md)を満たして別PRで行います。

方式評価の一次資料として[FLINTの整数分解API文書](https://github.com/flintlib/flint/blob/main/doc/source/fmpz_factor.rst)も参照します。
これは採用決定ではありません。browser/WASM適合、license、性能の実測は未実施です。
