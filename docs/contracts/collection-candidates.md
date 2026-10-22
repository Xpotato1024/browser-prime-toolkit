# 関係式収集の有限改善候補（Stage40）

## 診断と選定

固定 head 741c741279a2aacc7af560cdf19a09c454cc0167、LLM-01 / Chrome155 / combined Worker 1、
RSA-100先頭4familyを baseline / instrumented / instrumented / baseline で比較した。
全packet・4family列・counterは37分成功時の原本と一致。計測版の時間比は1.019033、
時計上限200万・16phase・深さ16以内で異常0、全退役・計算中通信0だった。
instrumented 2回の平均経過時間30.1485秒に対し、exclusive resieve49.082%、score35.813%、
根更新3.692%、候補走査1.255%、A選択0.139%。同時5Worker成功時のCPU比率ではない。

## 今回の2候補

1. resieveのcandidate-major / prime-major境界の倍率2を4にする。
   採用済み組込みu32剰余によって費用比が変わった可能性を検証する。
   rootを正規化した場合、剰余一致とroot列挙は同じ因子を同じindex順で出す。
   scores長はsentinel1024込みの現状を保つ。48因子overflowとbitmap cleanupを変えない。
2. 疎scoreの範囲外rootをsentinelへ書く処理を省略し、有効rootだけ加算する。
   linear fallback、root重複の1回加算、飽和／wrappingを維持する。
   比較対象はactive score全byte。走査されないsentinelの値は一致を要求しない。

A選択の二分探索化は測定比率が小さいため保留。
bitmap word-rank追加はbinary search削減の利益と追加65,600B／Workerの費用が未測定なので保留。
根更新／report走査は既に上流SIMDであり、今回新規実装とは呼ばない。

## 固定条件と採否

両候補は独立に既存long-1024へ適用し、計測clockなし・同じ上流commit、
compiler・SIMD・memory hardcap・小さい初期memoryで2 clean build一致を要求する。
最初に別probe artifactで旧関数と実際の新関数を比較する。
resieveは候補密度、root0／p-1／重複／MAX、48／49overflow、scratch再使用を含める。
scoreは飽和／wrapping・active境界・sentinel衝突・同一位置反復加算を含める。
40／64桁全工程のpacket・列・counter・因子一致を満たしてから実Chromeへ進む。

各候補の初回性能比較は先頭4family、baseline / candidate / candidate / baseline。
1試行90秒、4試行と退役予備を合わせ最大480秒。2候補の合計最大960秒。
資源制限はcollection-profile計画と同じ（1Worker、WASM最大1024MiB、手動1536MiB、
輸送64MiB、8slots、WSL available4096MiB以上、Chrome PSS1536MiB未満）。
各候補の中央値時間比<=0.95、PSS比<=1.10、全数学証拠一致で次の確認へ進む。
不採用も原本を保存し、収量から全工程時間を外挿しない。
採用候補が出たら別の固定family対照で再現性を確認し、最終headの独立レビュー・CIへ進む。

## 原本

診断campaign2-profileは2026-10-21T19:16:40頃〜19:19:08.695Z。
先行campaign1は基準計算終了後、比較driverの変数衝突で停止。計算失敗とは扱わず原本保持。
Native clock importのzero-import検査による計算前拒否と、修正後の実Chrome24契約成功も保存する。
両候補はまだ未測定・未採用であり、改善枯渇・merge条件成立とは扱わない。
