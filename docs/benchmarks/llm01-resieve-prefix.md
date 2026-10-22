# LLM-01 resieve prefixループ順の有限比較

固定head `f0f9c788d8afc04fe7ab3d6f21c9094e89ae9f2f`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、combined Worker 1。
RSA100先頭4family（8192多項式）、ABBA4回。期間2026-10-21T20:35:56.141Z〜2026-10-21T20:38:21.868Z。
最大480秒・各90秒＋予備30秒を事前固定。別build/計算との同時負荷はない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
| prefix-1-baseline | 29.402 | 466.983 |
| prefix-2-prefix | 28.913 | 468.132 |
| prefix-3-prefix | 28.911 | 471.548 |
| prefix-4-baseline | 29.377 | 468.922 |

時間中央値変化-1.63%、PSS変化0.40%。
小幅短縮だが5%の初回gateには届かず未採用。差がゼロとは断定しない。
prefixループ順だけをprime外側へ交換し、追加scratch・係数・tail・builtin剰余は変更していない。
一candidateのoverflow後も他candidateの処理を継続する446旧新関数ケース、
Native40/64の全packet・列・counter・proper/canonical因子、実Chrome共通22契約を確認。
時計専用2件は対象外（harness記録は24エントリ）。各2clean build一致、時計importなし。
全4試行のpacket・4family列・各prefix counterはStage38成功原本と一致し、通信0、全退役。

requestは初期化・収集・packet検証・集約を含む。asset準備・親guard・build/CIを含まない。
1Worker2回ずつの中央値から5Workerや全RSA100完了時間を外挿しない。
WASM最大1024MiB、手動1536MiB、slots8、輸送64MiB、credit2、
available>=4096MiB・Chrome PSS<1536MiB、取消/deadlineを維持した。
PSSとWASM requested/linearは別指標。追加RSA100長時間試行は0回。

[事前契約](../contracts/resieve-prefix.md)、[固定plan](../../bench/staged-resieve-prefix-plan.json)、
[可逆原本](staged-prefix-stage42/evidence-index.json)は合計190,226 bytes、上限4MiB。
初期oracleはoverflow後の別candidate処理を直接覆うよう強化し、性能WASM不変で再検査した。
初回receiptもローカル保全。現在は通常入口未反映。改善余地ゼロやmerge条件成立とは扱わない。
次は大きな現行処理score35.81%に対する既存2回展開→4回展開を独立に1候補だけ確認する。
