# ADR 0002: 予算付き native 基準実装と専用 Worker
日付: 2026-10-19。状態: 縦切り基準実装に採用、最終高性能engineは未選定。

大きな半素数の高速分解が目標です。まず同じ結果・予算・取消契約で方式を実測できる基準を作ります。
native BigIntで小因子除去、Miller–Rabin、平方検出、Pollard–Brentを実装し、Floyd版Rhoを比較用に残します。
既存ZIPや第三者コードはコピーしません。任意精度型やdivisionベースの剰余を再実装しません。
この小さな基準実装の維持負担は負いますが、ECM/SIQS/NFSを独自実装する判断はしていません。

| 候補 | 正確性・機能 | 配布・licenseと維持負担 | 判断 |
| --- | --- | --- | --- |
| native BigInt + Brent/Floyd | exact算術。予算付きRhoは完了を保証しない | 追加資源/第三者依存なし。数論と停止のテストが必要 | 今回の比較基準 |
| gmp-wasm | 多倍長算術/素数screening。分解方式は別途必要 | LGPL-3.0、内蔵WASM、context解放とsource/build再現性の審査が必要 | 未採用。次の算術backend候補 |
| bigint-crypto-utils | native BigInt、MR/乱数等。分解engine全体ではない | MIT、browser bundle/自動Workerあり。二重Workerと停止契約の評価が必要 | 未採用 |
| FLINT | Brent/ECMや部分分解・素数判定のAPI | LGPL-3.0-or-later。C/GMP等のbrowser build、資源、memory、依存全体の審査が必要 | 高度方式の調査候補 |
| msieve | SIQS/NFS等のC実装 | READMEはpublic domain。個別file/依存/build flags/仮想FS/memoryを別途確認する必要 | balanced大入力向け調査候補 |

library READMEの別用途速度やnative端末での桁数を、browser性能の保証に転用しません。
WASMを採用する前に固定source・全license/NOTICE・再現build・同梱資源hash・CSP/Worker適合を審査します。
外部license採用やサイトcapability変更が必要になった時点で具体案を返します。今回は依存を追加しません。

64bit未満は記録された7基底MRの範囲でprovenとして扱い、それ以上の通過値はprobableです。
固定基底を使うため確率上限を主張しません。失敗は合成数証拠、通過は一般の証明ではありません。
分解途中でも因子と残余の積を検算し、取消時は最後に受け取った検証済みsnapshotだけを保持します。

一次資料:
- [Brent原論文](https://maths-people.anu.edu.au/~brent/pd/rpb051i.pdf)
- [SPRP基底の研究者記録](https://miller-rabin.appspot.com/)
- [gmp-wasm](https://github.com/Daninet/gmp-wasm)、[GMP条件](https://gmplib.org/manual/Copying)
- [bigint-crypto-utils](https://github.com/juanelas/bigint-crypto-utils)
- [FLINT分解API](https://github.com/flintlib/flint/blob/main/doc/source/fmpz_factor.rst)、[FLINT概要](https://github.com/flintlib/flint/blob/main/README.md)
- [msieve README](https://github.com/radii/msieve/blob/master/Readme)
