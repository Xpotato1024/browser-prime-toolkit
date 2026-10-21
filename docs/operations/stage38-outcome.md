# Stage38 実測と残候補

RSA-100の明示大メモリ実験は、測定head `d1e0b865d14b702bd633fd739e05b2d3c772a1c1` でproper divisorを返した。[生成報告と原本索引](../benchmarks/llm01-wide-window.md)に固定する。request2220.175秒、accepted1280、usable117853、target116512、結果probable/remaining=1。両因子165bitの素数性は固定7基底の確率判定で、素数証明ではない。既知因子は計算へ渡していない。

## 条件と検証

- manual1536MiB、co1024＋helper64×4、WASM合計hardmax1280MiB。通常600秒・自動設定・サイト入口は変更しない。
- Native1024は固定source/compilerで2clean一致。小さい初期memory、40/64桁の全packet/列/counter/因子一致を確認した。
- 旧256MiB telemetry上限の残存を独立レビューで検出。co257MiB受理、co1024/helper64超過拒否、co833MiB soft-stop、不正観測拒否の赤→緑とwide専用validatorで解消した。実Chrome22契約成功。
- 測定前d1e0b86の573 tests／npm check、CI36件、2名の独立レビューが成功。測定後の原本・因子・source/guard・全572prefix照合も2名が独立確認し、指摘0件だった。
- 初回Windows確認コマンドは未exportの変数参照で失敗したが、campaign未作成・計算未開始を確認して確認コマンドだけを修正した。二重計算はない。
- campaignは2026-10-21T16:38:57.194Z〜17:16:31.877Z。RSA100開始16:39:15.077Z、最大3600秒の1回。driver／Windows monitorともexit0。設定延長や追加試行はしていない。

全Worker/source退役、ownership0、通信0、page/Workerの検出器陽性対照、source/HEAD guardが成立した。Native quota拒否・allocator失敗は0。co peak requested482.72MiB、linear614.44MiB、Chrome tree標本RSS/PSS1706.79/1009.45MiB。WASM上限・requested・linear・RSS/PSS・ホストavailableを分ける。

RAMは4071標本のsummaryを保存し、receiptの時系列は256点へ間引いている。PSSの全標本peakは間引き列から再計算した値ではない。Windows producerの全immutable原本はローカル保持。OSによるタブ強制終了の防止や、標本間の瞬間最大値を保証しない。

## 実測が示した残候補

主なwrapper呼出時間はco sieve2143.236秒、submit23.907秒、observe0.531秒、extract42.592秒。並列呼出の経過時間でありCPU利用率ではない。graph観測や集約をさらに削ることによる大幅な高速化の根拠はない。

一方、ピーク要求量はgraph marker22→23の縮約行列構築とfilter配列解放の重複中に現れ、Native quota solver stage5→6では増えていない。不要になったfilter配列をSparseBinaryMatrix構築前へ解放する具体的な残候補がある。復元に必要なeliminations/alive_colsと元matrix/columnsは保持する必要がある。実装・採用は別の固定plan/head、数学的一致・peak・非悪化gateの有限比較で判断する。

この候補が未検証の間は「改善余地が概ね尽きた」というマージ条件を成立扱いしない。新しい篩kernelや際限のないパラメータ探索を、この候補の確認と混ぜない。

## 引渡し境界

原本JSON/logはローカルに保持し、repo証跡は各2MiB以下の可逆gzip/base64＋SHA。新しい生成報告は歴史head/plan/driver/source、因子積・確実性、共通572packet/counter・列128、有限枠と全退役を検査する。最終報告headのtest/check・独立レビュー・CIはPR22本文へ追記する。

実機スマホ/Safari/Firefox、サイトReact island/manifest v1受入と本番切替は未実施。大きい保持状態での明示取消は本試行に追加せず、時間上限/取消/fatal/fresh recoveryの実Worker契約と正常終了の退役を別の事実として記録する。
