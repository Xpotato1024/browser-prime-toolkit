# LLM-01 resieve倍率1とbitmap rankの有限追試

固定head `77238b1d81453815e8097d6cbc26efcfbadbac67`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、combined Worker 1。
RSA100先頭4family（8192多項式）、各ABBA4回、8試行。期間2026-10-21T20:07:30.726Z〜2026-10-21T20:12:23.510Z。
最大960秒、各90秒＋予備30秒を事前固定した。別のビルド・計算との同時負荷はない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
| resieve1-1-baseline | 29.360 | 471.469 |
| resieve1-2-resieve1 | 28.748 | 471.222 |
| resieve1-3-resieve1 | 28.959 | 467.652 |
| resieve1-4-baseline | 29.485 | 470.071 |
| rank-1-baseline | 29.333 | 467.811 |
| rank-2-rank | 29.764 | 471.353 |
| rank-3-rank | 29.762 | 468.897 |
| rank-4-baseline | 29.523 | 473.298 |

| 独立候補 | 時間変化（中央値） | PSS変化（中央値） | 事前gate |
| --- | ---: | ---: | --- |
| resieve1 | -1.93% | -0.28% | 不成立 |
| rank | 1.14% | -0.09% | 不成立 |

倍率1は小さい時間短縮だが5%の事前基準には届かず未採用。差をゼロとは断定しない。
bitmap rankは追加65,600 bytes/Workerの有限配列でbinary searchを除いたが、時間条件不成立で不採用。
倍率4の負の結果と合わせ、倍率だけの調整で大きな短縮が得られるという根拠はない。
次は候補を無限に増やさず、追加bufferなしで前半2ループの順序だけを交換する局所候補を有限比較する。

requestは初期化・収集・packet検証・集約を含み、asset準備・親guard・ビルド・CIは含まない。
2回ずつの結果で一般的な速度優位や全RSA100完了時間を外挿しない。
基準の[現行phase診断](llm01-collection-hotpath.md)はresieve49.08%、score35.81%（1Worker経過時間）。
今回の候補は選定経路へ反映しておらず、その比率を変更後の割合とは呼ばない。

全8試行の全packet・4family列・各prefix counterがStage38成功原本と一致。
別probeで旧実関数と実際の新関数443ケースずつ（886）、Native40/64全工程のproper/canonical因子も一致。
共通22の実Chrome契約を各候補で確認した（時計専用2件は対象外、harnessは24エントリ）。
時計importなし、同じ上流commit/compiler/SIMD、各2 clean build一致。通信0、全Worker/source/port退役。
Native最大1024MiB、手動1536MiB、8slots・輸送64MiB、WSL available4096MiB以上、
Chrome PSS1536MiB未満の有限制限を維持した。PSSとWASM requested/linearは別指標である。

開始要求の応答が中断された際は、保存済runと既存processを先に確認し、二重起動しなかった。
全試行の正常終了とsource guard一致を原本から確認した。追加RSA100長時間試行は0回。

[事前契約](../contracts/resieve-followup.md)、[固定plan](../../bench/staged-resieve-followup-plan.json)、
[可逆原本索引](staged-resieve-stage41/evidence-index.json)。原本は合計341,238 bytes（上限4MiB）。
probe binary自体はローカル保存し、Gitにはsourceとreceiptを収録する。merge/release条件は未成立。
