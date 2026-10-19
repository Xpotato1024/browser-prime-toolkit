# RSA評価に関係する実上限と拡張設計
[ADR0011](../adr/0011-rsa-30s-profile.md)の設計監査。数値入力を受理できることと、30秒以内の分解成功を分ける。

| 層 | 現行の実上限 | 今段階の扱い |
| --- | --- | --- |
| 旧staged host/Worker | n < 2^128、39桁 | 変更しない |
| generic native BigInt engine | 10^1024未満、optionsは最大60秒 | 新profileで2048bit/30秒/1 Workerへ狭めて再利用 |
| GMP JS/C bridge | 256bit、input/output各80 bytes、入力78桁まで | 旧経路のまま。RSA profileでは未導入/未対応 |
| GMP WASM | 固定64MiB、ECM B1=2000/B2=200000/32曲線 | 30秒化で探索範囲や成功率が保証される訳ではない |
| SIQS JS/C input | 64〜128bit、奇数、39桁 | 公式RSAは未対応と明示 |
| SIQS runtime | WASM64MiB、managed heap32MiB、save4MiB、prime list4096 | 大きい入力へguardだけ外す変更は禁止 |
| counted dense/Lanczos adapter | 行/列1024まで、descriptor1250000 words、parity16384 uint64 | 大規模sparse経路を新設計する必要がある |
| Lanczos job | 最大2 attempt・4096反復 | 未完了/資源制約を成功へ数えない |
| vendored mp_t | MAX_MP_WORDS=30（32bit語） | 2048bitのSIQS対応と主張できない |

根拠はnative/gmp/bridge.c、src/engine/gmp.js、native/siqs-v2/runtime.c、src/engine/siqs-counted.js、vendor/msieve-siqs/include/mp.h、vendor/msieve-siqs/mpqs/mpqs.c。原本や旧artifactは変更しない。

## RSA-100で既に必要になる変更
一次資料を照合したRSA-100は100桁/330bit。上流parameter tableの315bit/80000と332bit/100000の線形補間ではfactor base要求は97647となる。fill_prime_listへ渡る個数は2×97647+100=195394で、現runtimeの4096上限を超える。これはソースからの計画値で、実行測定ではない。

factor base規模をそのまま正方のparity配列へ拡張すると二乗でメモリが増える。実際のfilter後の行列次元は未測定であり、factor base数と同一とは仮定しない。現在の小行列を受けるadapterのguardだけを広げることはしない。

新SIQSでは入力/output buffer、mp_tと中間積の語数、prime list、relation/save領域、cycle/filter、sparse matrix/依存検算、全割当のoverflow/所有権、停止pollの全経路を一体で設計する。既存のdense parity常駐を単純拡大せず、元の疎な列からの検算経路とメモリ見積りを先に示す。固定WASM/stack/managed heapとChrome全体の標本RAMを区別する。

## 次の受入条件
新しいnative上限は別versionのC runtime/artifactへ置く。既存rawのhashや比較条件を改変しない。入力境界とbufferのASan/UBSan、各割当失敗・各phase取消・trap退役、行列の元列での依存検算、初期化込みhost期限、実browserの停止後回復を揃える。source/license/pinと再現buildも必要で、公開/CSP/配布の判断は含めない。

今段階は全桁入力と30秒制御をnative BigInt基準経路で検証し、未対応のSIQSを評価結果から隠さない。新SIQSのメモリ規模・大規模adapter・中間算術の変更案が具体化した時点で、必要な判断を本人へ戻す。RSAの最大成功例は実測前には提示しない。

## Stage13 の後続実装
上の表・見積りはStage11時点の履歴です。独立した[full SIQS](full-siqs-source-review.md)をmsieve1.53から追加しました。100桁かつ332bit、固定512MiB、10万FB、元の大行列Lanczosを扱い、旧tableのguardを変更していません。入力受理と制限時間内の成功を引き続き区別します。
