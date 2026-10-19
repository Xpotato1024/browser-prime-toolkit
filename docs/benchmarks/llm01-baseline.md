# LLM-01 native基準エンジンの初回比較実測

これは固定corpusの小規模な比較です。対応桁数や一般の半素数の完了時間を保証しません。
全成功・打切り・因子・余因子・source hashは[raw receipt](llm01-baseline.json)に保存しています。

## 条件
- 測定日時: 2026-10-19T00:10:11.139Z
- Browser: Chrome/155.0.8059.39 / V8 15.5.35.20
- Host: LLM-01 / WSL2 6.18.33.2-microsoft-standard-WSL2 / Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz
- 利用論理CPU 6、WSL RAM 10429255680 bytes。Worker 1個、WASMなし。
- 初期ready 105.27 ms（fresh profile、CDP attachの費用を含む1回値）。
- Worker同梱JS asset: 11829 bytes、SHA256 410acb9b4198b55f1a6a73b51314f629c7631bb073c3436342464e7671320f3e
- corpusはbench/corpus.mjsの固定offsetから生成。各因子は計算区間外の独立した全試し割りで確認。
- 6ケース × 2方式 × 2時間予算 × 3seed = 72試行。seed=1/2/3、操作上限50000000。
- 因子の各桁数/bit数、入力、全試行のwall/worker時間・operation・statusはrawに記録。

## 結果
各欄は「完了数/3・完了試行wall中央値ms・全試行wall最大ms」です。打切りを除いた中央値だけで評価しません。
各規模1組の半素数と3seedであり、統計的な速度保証ではありません。

| case | 入力桁数 | 因子桁数 | 予算ms | Brent: 完了/中央値/最大 | Floyd: 完了/中央値/最大 |
| --- | ---: | --- | ---: | --- | --- |
| balanced-6 | 11 | 6×6 | 100 | 3/3・1.3・4.8 | 3/3・1.5・1.9 |
| balanced-6 | 11 | 6×6 | 1000 | 3/3・0.8・0.9 | 3/3・1.6・1.7 |
| balanced-8 | 15 | 8×8 | 100 | 3/3・8.6・8.7 | 3/3・32.9・34.3 |
| balanced-8 | 15 | 8×8 | 1000 | 3/3・2.8・8.2 | 3/3・32.7・34.3 |
| balanced-10 | 19 | 10×10 | 100 | 3/3・33.5・35.6 | 0/3・—・100.3 |
| balanced-10 | 19 | 10×10 | 1000 | 3/3・32.9・35 | 3/3・306.4・355.7 |
| balanced-12 | 23 | 12×12 | 100 | 0/3・—・100.9 | 0/3・—・100.3 |
| balanced-12 | 23 | 12×12 | 1000 | 3/3・190.1・199 | 0/3・—・1000.3 |
| unbalanced-4-12 | 15 | 4×12 | 100 | 3/3・0.5・0.5 | 3/3・0.5・0.5 |
| unbalanced-4-12 | 15 | 4×12 | 1000 | 3/3・0.5・0.5 | 3/3・0.5・0.6 |
| square-7 | 13 | 7×7 | 100 | 3/3・0.4・0.4 | 3/3・0.3・0.4 |
| square-7 | 13 | 7×7 | 1000 | 3/3・0.3・0.3 | 3/3・0.3・0.4 |

この測定ではBrentをnative比較基準の既定として維持します。最終engineやWASM優劣は未確定です。

## 停止・通信・検出器
- 準備後のHTTP/network requestはmain/Workerとも0件、HTTP server記録0件。local Blobを通信と分離。
- Page offline化・asset server停止・cache無効で同一因子を得て、cancel後に新Workerで再計算。
- cancel通知 1.2 ms、main timer heartbeat 8回。未受信因子は保持を保証しない。
- Worker targetのofflineエミュレーション成功は主張しない。Page offlineと停止server、両targetのCDPを組み合わせた検証。
- mainのblocked fetch、WorkerのCSP audit、通常navigation、別Workerの実HTTP通信で検出器の正検出も確認。
- Worker CSP eventはhostへaudit通知して当該世代を停止。CDPの実通信検出と区別する。

## 未達と限界
- WASM/GMP/FLINT/msieve、ECM/SIQS/NFSは未導入・未比較。native基準が最速との主張はしない。
- 低性能端末、Firefox/WebKit/iOS、peak Worker heap、電源状態は未測定。
- 固定順Brent→Floyd、各規模1pair、3seedの小標本。熱/負荷/順序の影響や一般のp/q分布を評価していない。
- native予算はcheckpointとhost terminateで扱う。OS schedulingや単一BigInt演算に厳密な実時間/heap上限はない。
- このharnessは製品React UI、site adapter、最終dist受入れ、公開配布の代わりではない。
- 再実行方法は[検証手順](../operations/browser-verification.md)、採用判断は[ADR](../adr/0002-budgeted-worker-baseline.md)。
