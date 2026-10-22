# LLM-01: SIQS・fresh 1/2 Worker・p−1再評価

非公開・固定少数問。主測定HEAD: a021c0590dfb77a425f61773f7d57960221b94e7。
生データのSHA256: long=f5886e7c9fe4422f32569340327ebd9a45bf064c2af86c7794ed23cbff339655 / pm1=42a1f6d1764435f7e71e8a3c44a79afb922645a032fed0af0a6aa83e0187bae7 / pool=07543aab5e0163017334f0723dea869c5717b143d21d80dc31872ee8cd7df9a5。

## SIQS（無計装の主測定）
| 入力 | 計算枠ms | status/reason | request ms | operations |
| --- | ---: | --- | ---: | ---: |
| siqs-smoke | 10000 | complete/— | 1451.90 | 6471694 |
| balanced-13-0 | 10000 | complete/— | 1571.00 | 7289076 |
| balanced-13-0 | 30000 | complete/— | 1606.20 | 7289076 |
| balanced-96bit-0 | 10000 | complete/— | 1712.80 | 8006951 |
| balanced-96bit-0 | 30000 | complete/— | 1726.80 | 8006951 |
| balanced-112bit-0 | 10000 | complete/— | 2550.30 | 11879607 |
| balanced-112bit-0 | 30000 | complete/— | 2551.70 | 11879607 |
| holdout-balanced-80 | 10000 | complete/— | 1920.60 | 8801015 |
| holdout-balanced-80 | 30000 | complete/— | 1906.10 | 8801015 |
| holdout-balanced-112 | 10000 | complete/— | 2126.80 | 9912439 |
| holdout-balanced-112 | 30000 | complete/— | 2111.70 | 9912439 |

50M操作枠が先なら30秒枠を使い切った結果ではありません。smoke成功を一般群へ外挿しません。
旧WASMのままであり、独自dense GF(2)を使います。上流Lanczosは未使用です。

## 別profile（最後のsplitのcallback間wall近似）
| 入力 | phase mask | callback数 | phase別ms（base/poly/sieve/relation/matrix/sqrt） | 管理peak bytes |
| --- | ---: | ---: | --- | ---: |
| balanced-13-0 | 126 | 7288335 | 33.40/10.00/548.10/948.10/37.10/15.40 | 22614900 |
| balanced-96bit-0 | 126 | 8006091 | 32.70/20.10/690.70/922.80/34.20/15.40 | 22564832 |
| balanced-112bit-0 | 126 | 11878622 | 34.40/34.20/1600.00/942.50/21.20/33.60 | 22540356 |
| holdout-balanced-80 | 126 | 8800294 | 32.60/9.40/859.10/1011.20/38.50/13.20 | 22744496 |
| holdout-balanced-112 | 126 | 9911452 | 34.20/20.00/1140.10/1042.60/32.80/15.90 | 22558484 |

追加時計読み、JS import/Budget/出力検証費を含み、純C時間・全job profileではありません。
relation/A/block途中カウンタは旧ABIにないため取得不能です。logはrawのauditに保存しています。

## fresh Chrome・同じ32曲線総数
| 入力 | 本数 | complete/probable | request中央値ms | 初期化中央値ms | 全体peak PSS中央値MiB | 全体peak RSS中央値MiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| balanced-13-0 | 1 | 2/2 | 140.80 | 71.90 | 426.11 | 1188.86 |
| balanced-13-0 | 2 | 2/2 | 133.95 | 77.00 | 438.99 | 1200.93 |
| balanced-96bit-0 | 1 | 2/2 | 144.80 | 71.40 | 433.72 | 1195.64 |
| balanced-96bit-0 | 2 | 2/2 | 134.10 | 72.15 | 438.09 | 1201.65 |
| balanced-112bit-0 | 1 | 0/2 | 501.85 | 73.45 | 431.55 | 1193.17 |
| balanced-112bit-0 | 2 | 0/2 | 312.20 | 71.00 | 452.08 | 1216.14 |
| holdout-balanced-112 | 1 | 1/2 | 388.90 | 77.35 | 424.51 | 1186.69 |
| holdout-balanced-112 | 2 | 1/2 | 257.65 | 76.20 | 449.33 | 1212.39 |
| holdout-unbalanced-m127 | 1 | 2/2 | 122.35 | 75.30 | 425.57 | 1188.89 |
| holdout-unbalanced-m127 | 2 | 2/2 | 129.30 | 78.15 | 440.23 | 1203.71 |

各trialはfresh Chrome/fresh Worker、初期化込み総1000ms・総50M操作。cold asset取得は別記録です。
線形は1本64MiB/2本128MiB。PSS/RSSはChrome全treeの標本で、hard上限や瞬間peak保証ではありません。
auditは返却時の観測で、破棄した敗者の最終曲線数は未観測になり得ます。計画σとlane indexは構造で分離します。

## p−1 stage1-only
| 入力 | base | status/reason | request ms |
| --- | ---: | --- | ---: |
| pm1-favorable | 2 | complete/— | 81.30 |
| pm1-favorable | 3 | complete/— | 56.90 |
| pm1-both-orders | 2 | incomplete/algorithm-exhausted | 61.00 |
| pm1-both-orders | 3 | incomplete/algorithm-exhausted | 63.20 |
| pm1-nonsmooth | 2 | incomplete/algorithm-exhausted | 56.60 |
| pm1-nonsmooth | 3 | incomplete/algorithm-exhausted | 58.30 |
| balanced-13-0 | 2 | incomplete/algorithm-exhausted | 56.10 |
| balanced-13-0 | 3 | incomplete/algorithm-exhausted | 55.60 |
| balanced-96bit-0 | 2 | incomplete/algorithm-exhausted | 56.80 |
| balanced-96bit-0 | 3 | incomplete/algorithm-exhausted | 64.90 |
| balanced-112bit-0 | 2 | incomplete/algorithm-exhausted | 60.40 |
| balanced-112bit-0 | 3 | incomplete/algorithm-exhausted | 61.00 |
| holdout-balanced-80 | 2 | incomplete/algorithm-exhausted | 57.10 |
| holdout-balanced-80 | 3 | incomplete/algorithm-exhausted | 56.80 |
| holdout-balanced-112 | 2 | incomplete/algorithm-exhausted | 58.60 |
| holdout-balanced-112 | 3 | incomplete/algorithm-exhausted | 66.10 |
| holdout-unbalanced-m127 | 2 | incomplete/algorithm-exhausted | 60.90 |
| holdout-unbalanced-m127 | 3 | probable/— | 58.00 |

B1=2000、B2=1<B2min=2000。合同式の対照は[固定controls](../../bench/pm1-controls.json)。
全18件の[独立合同式](../../bench/pm1-order-evidence.json)も照合しました。M127 controlではbase2が両因子で1となりgcd=n、base3はproper factorです。
有利な位数・gcd=n・非適合例を分けます。一般入力に効く保証はなく、p+1/SQUFOF等は未測定です。

## 固定full msieveのnative参考
| 入力 | elapsed ms | exit/timeout | 観測因子 |
| --- | ---: | --- | --- |
| balanced-96bit-0 | 23.37 | 0/false | 211106232545339 |
| balanced-112bit-0 | 26.26 | 0/false | 72057594030273703 |
| holdout-balanced-112 | 24.83 | 0/false | 50751572209658171 |

固定原本のQSを直接実行し、CPU dispatchをgeneric C sieveに接続したnative参考です。
512MiB address space・30秒host timeout・1thread。browserの同条件速度比でもLanczos単独比較でもありません。
同一relation/cycleを使ったdense対Lanczos比較・browser portは残ります。

全54 browser計算で初回asset取得後はserver停止・cache無効・通信0、全lane破棄を確認しました。
主計測前後の検証と取消は別のquick検証です。Alpertronは追加許可根拠による同一read再試行後、選択8原本の独立静的reviewが完了しました。WASM build/性能は未測定です。
[設計境界と一次資料](../architecture/supplementary-evaluation.md)を参照してください。
