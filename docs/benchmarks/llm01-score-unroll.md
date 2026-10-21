# LLM-01 score加算の4回展開を単独比較

固定head `ff7458573611484fe1f4ff5ddd927862cb6e8e30`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、combined Worker 1。
RSA100先頭4family（8192多項式）、ABBA4回。期間2026-10-21T20:45:45.452Z〜2026-10-21T20:48:13.432Z。
最大480秒・各90秒＋予備30秒を事前固定。別build/計算との同時負荷はない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
| unroll4-1-baseline | 29.406 | 467.844 |
| unroll4-2-unroll4 | 29.294 | 472.877 |
| unroll4-3-unroll4 | 29.216 | 468.716 |
| unroll4-4-baseline | 29.829 | 470.652 |

時間中央値変化-1.23%、PSS変化0.33%。
5%の初回gateには届かず未採用。小幅の差をゼロとは断定しない。
既存sieve_root_pairとsieve_dense_rootの2回展開へ4回本体を前置し、旧2回/1回tailを残した。
追加scratchなし、resieve・SIMD・blockサイズ・数学・sentinel・剰余は変更していない。
既存上流のscore kernelを独自発明と扱わない。

旧scoreが必ず旧helperを使う参照関数を作り、574ケース（denseのscoreと繰越root128ケースを含む）、
Native40/64の全packet・列・counter・proper/canonical因子、実Chrome共通22契約を確認。
時計専用2件は対象外（harness記録は24エントリ）。各2clean build一致、時計importなし。
全4試行のpacket・4family列・各prefix counterはStage38成功原本と一致し、通信0、全退役。

requestは初期化・収集・packet検証・集約を含む。asset準備・親guard・build/CIを含まない。
1Worker2回ずつの中央値から5Workerや全RSA100完了時間を外挿しない。
WASM最大1024MiB、手動1536MiB、slots8、輸送64MiB、credit2、
available>=4096MiB・Chrome PSS<1536MiB、取消/deadlineを維持した。
PSSとWASM requested/linearは別指標。追加RSA100長時間試行は0回。

[事前契約](../contracts/score-unroll.md)、[固定plan](../../bench/staged-score-unroll-plan.json)、
[可逆原本](staged-unroll-stage43/evidence-index.json)は合計190,568 bytes、上限4MiB。
現在は通常入口未反映。今回の有限候補群を閉じ、小幅効果の未確定事項と次工程を整理する。
改善余地ゼロやmerge/release条件成立とは扱わない。
