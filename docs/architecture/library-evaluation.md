# ライブラリ評価

初回は第三者依存なしの native BigInt と Node 標準テストを使います。
任意精度整数型や剰余演算を独自実装する必要はありません。

| 候補 | 一次資料で確認した特徴 | 今回の扱い |
| --- | --- | --- |
| native BigInt | 整数を表現。Numberとの混用に注意。暗号用途の定時間実行保証なし | 入力・集約に採用 |
| gmp-wasm | GMP/MPFR、圧縮base64内蔵WASM、LGPL-3.0 | 旧bundleは取り込まず保留 |
| bigint-crypto-utils | native BigInt、Miller–Rabin等、MIT | 完全な分解器ではない。候補として保留 |

WASM の要否は素数判定・分解の代表ケースで速度、起動時間、メモリ、bundle、取消を測定して判断します。
他用途のベンチマークから分解性能を推定しません。
採用時は原本ソース、release/commit、hash、licenseと必要な配布物、build再現性を記録します。
現時点では性能比較もライブラリ採用も行っていません。

一次資料:
- [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [gmp-wasm](https://github.com/Daninet/gmp-wasm)
- [bigint-crypto-utils](https://github.com/juanelas/bigint-crypto-utils)
