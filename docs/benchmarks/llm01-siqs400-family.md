# 400bit単一familyの有界観測

2026-10-28、LLM-01、Chrome155.0.8059.39、Node24.22.1。
固定head1e7011bbe77b0534c9760adfde40b2c6b3ff4dd9の独立SIQS400入口。
計測1回で、全分解benchmarkでも方式間の速度比較でもありません。

最初の10秒試行と同じ上流400bit境界fixture、family0/count1、
coordinator1 Worker、max1024MiB、packet上限8MiB、同じNativeを使いました。
観測枠だけを最大60秒にし、matrix／GCD extractionは行いません。

| 観測 | 実測 |
| --- | --- |
| 準備・family・submit・release込み | 10462.200ms |
| Workerの一括Native sieve呼出し | 9707.5ms |
| submit | 51.6ms |
| 多項式／raw関係式 | 4096／36 |
| packet | 8001bytes |
| raw内訳 | full0、SLP9、DLP27 |
| collector | cycles0、usable0、target206516 |
| family返却時linear memory | 22151168bytes（約21.125MiB） |
| 観測要求peak | 20278112bytes（約19.34MiB） |

メモリ値は返却時telemetryで、Chrome RSSや全工程peakではありません。
一括sieve時間は多項式準備・根更新・score・候補走査・試し割り等を含みます。
純粋な篩加算だけの時間、各phaseの現状比率とは扱いません。
usable0でも36件のpartialをgraphへ取り込んでいますが、将来cycleになる数や
完成までの時間は推定しません。4096多項式を全工程の進捗率に換算しません。

同じ入力でjob発行25ms後に取消した対照も成功し、
Worker／Blob URLは各2/2退役、準備後通信0件でした。
前の10秒試行のpacket未返却という原本は保持しています。

固定上流engine/siqs.rs（選定Native compiledSourcesとhash一致）は、
13個のA因子から最大2^12=4096多項式を1familyで処理します。
WASM qs_worker_sieveはfamily全体を同期実行してからpacket化するため、
その途中にWorkerメッセージで実多項式数を報告できません。
計算中は不定表示、返却後に実数を表示することが現在可能な粒度です。
細粒度化にはNativeのresumable polynomial window等と
family重複排除／prefix／collectorの新しい契約・再ビルド・検証が必要です。
hostのheartbeatを実進捗と見せる修正は行いません。

Native SHA256: 21cec2f0e9631c769ad256e42d37e9b7865de1d92e4b0ba129ec1d3c5eb77a6d
packet SHA256: d0225df820fb5e1e980c39a006fc915baac58a244f44146c46fabaf94eecb399

原本はLLM-01のtask/prime-siqs400-family-20261028に
plan.json、observe.mjs、events.ndjson、observation.json、family-0.packet.gzとして保存。
単一familyのpacket検査・受理・退役は確認しましたが、
400bitの関係式充足・行列・GCD・最終素数性検算・GUI採用は未確認です。

SIQSの400bit能力を接続する根拠は一段進みました。
ただし、この1familyだけでSIQS継続がGNFS移植より有利とは判断できません。
まず[共通ルーティング](../contracts/common-routing.md)で
残余・予算・利用可能なengineを正しく扱い、その後で
有限のECM前処理と、均衡残余に対するGNFSの別候補を検討します。
現ECM bridgeは256bit上限、GNFSは未実装のままです。
