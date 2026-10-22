# LLM-01 現行の関係式収集profileと有限改善比較

固定診断head `741c741279a2aacc7af560cdf19a09c454cc0167`、候補head `63c9f34e6e2921bb405b1bed708f56f2f1268070`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、申告6論理CPU・deviceMemory8。combined Worker 1、RSA-100先頭4family（8192多項式）を同じ順で処理した。5Worker・37分成功時の全工程CPU比率ではない。

診断は2026-10-21T19:16:40.206Z〜2026-10-21T19:19:08.695Z、baseline / instrumented / instrumented / baseline。
計測版の時間比1.019033（1.90%）は事前10%以内。
時計importのみの別artifactで数学を変えず、時計394,760回・深さ2、異常0、実測最小step約0.1ms。
短いphaseの割合は時計の量子化・観測費用の影響を受ける。exclusiveは重複しない経過時間で、CPU sampleではない。

| phase | exclusive秒（2回平均） | request比 | calls/試行 |
| --- | ---: | ---: | ---: |
| Context準備 | 0.282 | 0.94% | 1 |
| familyのA選択 | 0.042 | 0.14% | 4 |
| CRT/B初期係数 | 0.000 | 0.00% | 4 |
| 初期roots/Bainv | 0.376 | 1.25% | 4 |
| polyのC係数 | 0.022 | 0.07% | 8192 |
| score計画・初期化 | 0.211 | 0.70% | 8192 |
| score kernel（dense/疎/linear） | 10.797 | 35.81% | 8192 |
| 候補走査 | 0.378 | 1.26% | 8192 |
| resieve | 14.797 | 49.08% | 8192 |
| 候補値復元・試し割り | 0.702 | 2.33% | 8192 |
| 残余分類 | 1.176 | 3.90% | 125930 |
| 受理relation生成 | 0.009 | 0.03% | 5893 |
| Gray B更新 | 0.004 | 0.01% | 8188 |
| SIMD root更新 | 1.113 | 3.69% | 8188 |
| packet化 | 0.001 | 0.00% | 12 |
| collector merge | 0.047 | 0.16% | 4 |
| 未分類（JS/転送/待ち等を含む） | 0.189 | 0.63% | — |

resieveとscore加算を優先し、A選択・候補走査・根更新だけで全体の大幅短縮を期待しない。
既存SIMDは上流由来。resieveには候補の因子回収が含まれ、関係式収集を純粋なふるい加算と同一視しない。

候補は別々の時計なしartifact。upstream commit・compiler・SIMD・memory capを固定、engine.rsだけ変更し2clean一致。
resieve4はcandidate-major/prime-major境界2→4、sparseは範囲外rootへのsentinel書込み省略。
各候補ABBA4回、各90秒＋退役予備、合計最大960秒。実行期間2026-10-21T19:33:01.333Z〜2026-10-21T19:38:02.252Z。
各requestはNative初期化・収集・packet検証・集約を含み、ページasset準備・親guard・ビルド・CIは含まない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
| profile/1-baseline | 29.601 | 461.273 |
| profile/2-instrumented | 30.135 | 465.112 |
| profile/3-instrumented | 30.162 | 467.677 |
| profile/4-baseline | 29.570 | 461.018 |
| hotpath/resieve4-1-baseline | 29.486 | 468.889 |
| hotpath/resieve4-2-resieve4 | 31.688 | 467.920 |
| hotpath/resieve4-3-resieve4 | 31.799 | 468.920 |
| hotpath/resieve4-4-baseline | 29.616 | 465.465 |
| hotpath/sparse-1-baseline | 29.599 | 466.580 |
| hotpath/sparse-2-sparse | 30.058 | 466.581 |
| hotpath/sparse-3-sparse | 30.151 | 465.759 |
| hotpath/sparse-4-baseline | 29.708 | 463.815 |

| 独立候補 | 時間変化（中央値） | PSS変化（中央値） | 初回gate |
| --- | ---: | ---: | --- |
| resieve4 | 7.42% | 0.27% | 不成立・不採用 |
| sparse | 1.52% | 0.21% | 不成立・不採用 |

全12試行でpacket・4family列・各prefix counterがStage38成功原本と一致。
別probeは旧実関数と新実関数435ケースずつ（870）一致、probe exportは性能artifactから除外。
Native40/64全工程のpacket・列・counter・canonical因子も同一。実Chrome24契約は計測版と両候補で成功。
通信検出の正対照を維持し、asset取得後の計算中通信0、全Worker/source/port退役、RAM observer異常0だった。
PSSはWASM requested/linear hardcapと別指標。手動1536MiB・Native最大1024MiB・輸送64MiB・8slots・available4096MiBの有限制限を維持した。

計算前のclock import guard拒否と、基準計算終了後のdriver変数衝突はharness不具合として修正し原本保存。
初期oracleの型不一致と非整列synthetic rootによるtrapもローカルへ保持し、正規化root条件へ修正した。
不成功を方式不採用の速度根拠にしていない。旧filter早期解放の不採用、u32剰余-9.27%採用、
resieve skip-0.29%／dense16+4.85%不採用は別対照の結果であり、改善率を掛け合わせない。

この小規模比較からRSA-100の全工程時間を外挿しない。新しい長時間RSA試行はここでは0回。
改善枯渇・merge条件成立とは扱わず、成立候補の再現確認と、残るhotpath候補を費用対効果で判断する。

[事前契約](../contracts/collection-profile.md)、[候補契約](../contracts/collection-candidates.md)、
[固定plan](../../bench/staged-collection-hotpath-plan.json)、[可逆原本索引](staged-collection-stage40/evidence-index.json)。
証跡はgzip+base64可逆形式、合計506,825 bytes（上限4MiB）。stdoutと負の原本もLLM-01内に保持する。
