# LLM-01 filter配列早期解放の有限比較

測定head `1181a66c9e41e92ac33cd38e53643281a08487ad`、Node24.19.0上のNative WASM単体。実Chromeの速度比較ではない。期間2026-10-21T17:56:23.458Z〜2026-10-21T17:57:38.597Z（準備・source guard込み75.139秒）、直列8試行。各child30秒、外枠360秒、Native最大1024MiB・JS heap128MiB、開始WSL available4096MiB以上を固定した。

| 試行 | families | request秒 | 全工程peak requested MiB | linear MiB |
| --- | ---: | ---: | ---: | ---: |
| digits40-1 | 9 | 0.175 | 2.838 | 5.375 |
| digits40-2 | 9 | 0.167 | 2.838 | 5.375 |
| digits40-3 | 9 | 0.171 | 2.838 | 5.375 |
| digits40-4 | 9 | 0.172 | 2.838 | 5.375 |
| digits64-1 | 359 | 8.846 | 11.784 | 14.125 |
| digits64-2 | 359 | 9.064 | 11.784 | 14.125 |
| digits64-3 | 359 | 8.687 | 11.784 | 14.125 |
| digits64-4 | 359 | 8.875 | 11.784 | 14.125 |

requestはNative生成・収集・抽出を含み、module instantiateと親のsource guardを含まない。各2回の中央値比は以下。メモリは同一最終prefixの全工程peak requestedで、Chrome RSSではない。

| 入力 | peak変化 | request変化 | 事前gate |
| --- | ---: | ---: | --- |
| digits40 | 0.00% | -2.90% | 成立 |
| digits64 | 0.00% | 0.17% | 不成立 |

全packet・全counter・最終column bytes/SHA・canonical proper-factor pair・事前profileが同一で、allocation失敗0・全session解放。64桁のmarker22→26でliveは9,014,782→6,033,512 bytes（2.843MiB減）。早期解放自体は動くが、収集中の既存peak12,356,156 bytesが全工程最大のため、全工程peakは変わらない。40桁も全工程peakは同じだった。

64桁の事前条件「全工程peak中央値10%以上削減」を満たさず、不採用。選定Worker・通常入口・Stage38成功artifactへ反映しない。契約どおり追加RSA100長時間試行は0回。RSA100での省メモリ効果がないと証明したわけではなく、その効果は未測定である。全工程時間の有意差も主張しない。

[事前契約](../contracts/matrix-memory.md)、[固定plan](../../bench/staged-matrix-memory-plan.json)、[run原本](staged-matrix-memory-stage39/run.json)、[可逆証跡索引](staged-matrix-memory-stage39/evidence-index.json)。失敗した初回buildと赤→緑の開発logもLLM-01内へ保持した。
