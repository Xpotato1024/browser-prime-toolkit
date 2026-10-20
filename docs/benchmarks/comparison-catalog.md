# 比較した方式とデータの保全
2026-10-19の「各方式は教育的価値があるので保全する」という依頼に基づく目録です。採否で削除せず、古い観測の訂正は別の証跡として保存します。公開教材への加工・公開は行いません。

[固定目録](comparison-preservation.json)は計208ファイル（実装、原本pin、build条件、raw、入力、再現script。うち21件は元検証ログ）のbytes/SHA256を保存します。歴史的基準は82f1c3e4215bf990da142e82e8bc33fa55846b07です。新しいStage9のrawは別途report/checkへ結び付けます。

| 方式・比較 | 保存した証拠と再現入口 | 測定headの扱い |
| --- | --- | --- |
| native BigInt Brent/Floyd | [72試行](llm01-baseline.json)、bench/corpus.mjs、scripts/benchmark-browser.mjs | 測定時HEADは未記録。source一致commitは11ef13ec109383310d5d5fcd045f1c2f71743877 |
| 限定MPQS/WASM | [342単独・72pool](llm01-wasm-mpqs.json)、native/tinyqs、vendor/msieve、scripts/build-wasm.mjs | source一致commitは57d913c6e10edc80d1766d8c874348a98f602921。測定時HEADは未記録 |
| Brent 1/2/4 Worker | 同MPQS rawのpoolRecords、bench/portfolio.js。全体5千万操作、当時の待機WASMも保持 | 同上。現行1 Worker選択と混ぜない |
| 低位GMP Brent／ECM | [204単独・32pool](llm01-gmp-ecm.json)、native/gmp、scripts/build-gmp.mjs | 5be4db3baf59d4ce9ae8f9d56cc6c3a281ea158f |
| 有界SIQS／ECM stage2 | [136試行・5fatal](llm01-bounded-siqs.json)、native/siqs、scripts/build-siqs.mjs | 8e865d74252bfd17ba1d9b245184656161336f3b |
| SIQSの旧初期化条件 | [訂正前raw](archive/staged-preservation-stage5-pre-fresh/llm01-bounded-siqs.json) | 保存commit7ad5fb04addc519cdb1e736ae4aaa3650e92a78d、測定8baa7b9c81d404d18800199bc8bbae488a54552e。fresh条件のrawを上書きしない |
| SIQS長予算・phase | [補助raw](llm01-supplement-long.json)、scripts/benchmark-supplement.mjs | a021c0590dfb77a425f61773f7d57960221b94e7、通常11・別profile5、10/30秒 |
| ECM同一32σの1/2 Worker | [20 fresh試行](llm01-supplement-pool.json)、同script | a021c0590dfb77a425f61773f7d57960221b94e7、初期化込み1秒・全体5千万操作 |
| p−1 stage1 | [18試行](llm01-supplement-pm1.json)、scripts/certify-pm1-order.py | a021c0590dfb77a425f61773f7d57960221b94e7。B1=2000/B2=1、base2/3、gcd=n・非適合も残す |
| clock分離／counted dense／Lanczos | [40通常](llm01-counted-primary.json)・[20診断](llm01-counted-diagnostic.json)・[4lifecycle](llm01-counted-lifecycle.json)、native/siqs-v2、scripts/benchmark-counted.mjs | dc5a568988eb2e645f773c0caedfc4a5c302b33e |
| Stage8修正前 | [64構成archive](archive/stage8-9487e42/README.md) | 9487e42。最終コードの再測定と分ける |
| native full msieve QS/Lanczos | [原本159件・adapter・binary hash・3入力stdout](llm01-msieve-reference.json)、native/msieve-reference | rawにhost/measuredAt/measuredHead/依存manifest hashがない。adapterのsource一致commitはa021c0590dfb77a425f61773f7d57960221b94e7。欠落を後付けで測定情報にしない |
| 旧selector holdout | [18試行](llm01-selection-holdout.json)、bench/selection-holdout.json、scripts/benchmark-selection.mjs | 9b44327b1caa2152e71876d2f7ba36ddc751bf51。Stage9では使用済み一般群 |
| Alpertron | [静的評価](../architecture/alpertron-source-review.md)、[8原本のbytes/SHA/Git blob](../legacy/alpertron-source-manifest.json) | upstream4854656a050f280397d7908efa42fca8114c8297、GPL-3.0-or-later。既存task cacheの8原本で再照合。未build／未実行／未測定 |
| 新しい段階選択 | [ADR0009](../adr/0009-staged-selector.md)、bench/staged-*.json、scripts/experiment-staged.mjs | 一般群の方針固定をholdoutより先にcommit。旧rawは不変 |

各JSONに入力・seed・時間／操作枠・成功／不完全／失敗・残余・browser/host・source hashがある場合、その元の値を保持します。historical metadataの欠落は上表と目録で明記し、現在の環境で埋めたことにはしません。Alpertronは固定URLとhashの参照保全で、8原本を製品へvendorしたものではありません。旧ZIPもリポジトリ外のまま既存hashと静的評価を保持します。

再現は対応commitの新しい隔離checkoutで行います。既存rawへ直接書く旧scriptもあるため、現行checkoutや正規rawを再実行で上書きしません。新scriptの--outを使う場合も新保存先を指定し、revisionごとに保存します。初期asset取得後の通信ゼロ、初期化込み／計算だけの時間、並列全体予算の差を説明せず順位を横断比較しません。

検証ログは[目録](comparison-preservation.json)のvalidationLogsに元task相対pathと保存SHAを載せています。保存済みのnative/TDDログのみで、存在しない過去ログは再構成しません。Stage9のred-controllerはimport path誤りだったため、TDD根拠には含めません。

Alpertron実行、GNFS/FLINT移植性能、p+1単独、standalone SQUFOF、旧gmp-wasm 1.3.2の性能測定は未実施です。測定値のないものを比較結果にしません。

原本検証ログの末尾空白・EOF空行もbytes/SHAの一部として維持します。.gitattributesの例外はarchive/validation-logs/*.log.txtだけに限定し、通常コードの空白検査は維持します。

Stage14の[SIQS lab全38試行](llm01-siqs-lab.md)は、通知・任意observer、parameter一要因、共通graph付き1／2 Workerの短時間比較です。[固定計画](../../bench/siqs-lab-plan.json)と全raw／log／source hashを残し、未採用設定も削除しません。旧full-siqs・Brent長枠・他候補の実行系と証跡は継続保全します。
