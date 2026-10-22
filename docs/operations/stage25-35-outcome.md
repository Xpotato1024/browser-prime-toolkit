# Stage25〜35の改善結果と引渡し境界

PR18 head 297f9d29c2102dfcd420f0b9fee5230ed4a0d4dfを基準に、独自実装の保持量・抽出移行・待ち・並列・数値hot pathを分けて比較した。[生成された全比較](../benchmarks/llm01-graph-optimization.md)と各manifestが数値の原本であり、本書は採否と未完了の区切りを示す。

## 採用した変更

- Natural rootのcanonical bytes、forest edgeの1 Box化、powersの可逆varint保持で収集中の不要な固定幅・容量を減らした。wire packet、順序、family同一性、counter、列、因子検算は維持する。
- 抽出をterminal化してforest/seenA/bufferを先に解放し、CSR/CSC作成後に不要なmatrix配列を解放する。dependency復元に必要な元列・eliminationsは保持する。
- 全体reservationを4→8枠へ拡張し、owner credit2、最大64MiBのpacket予約を維持した。手動5 Workerは同じ8枠の4 Workerより固定prefixで9.25%短縮した。自動は最大2の保守設定を維持する。
- u32剰余をRust組込み演算へ変更した。BigInt oracleと従来法の境界・seed固定10000組、40/64桁の全工程を比較し、固定prefix時間9.27%短縮を確認した。
- 選定ESM入口src/optimized/index.jsから選定済み3 role sourceだけを読み込む。生成前後のWorker文字列一致、body SHA、WASM hardcapを検査し、旧実験factoryの配布依存を除いた。

個別削減率を掛け合わせて全工程短縮率とはしない。最終600秒試行はaccepted362/usable11771、最後に受信したcoordinator live104.38MiB/linear121.31MiB、Chrome sampled peak PSS631.62MiBで期限停止した。旧未圧縮と共通accepted128でlive57.33%減・到達時間29.94%短縮だったが、別headの統合観測であり共同ABBAの因果推定ではない。120秒取消は全Worker/source退役まで約1.1msだった。

## 不採用と停止判断

| 候補 | 判定根拠 |
| --- | --- |
| 6 Worker | 同じ8枠の4 Worker比で時間5.61%減だがPSS11.59%増。事前PSS1.10倍gateを超え、5 Workerより遅かった |
| 集約専用1＋計算5 | 同じ5計算ownerのcombined比で時間0.81%増・PSS4.64%増。回復したharnessのABBAで不採用 |
| resieve剰余の条件付き省略 | 固定prefix時間0.29%減。事前5% gate不成立 |
| dense block 32→16KiB | 固定prefix時間4.85%増。事前gate不成立 |
| 元順序を保つindex差分codec | 4familyのpayload削減0.30〜1.31%、初期live推定0.125%。事前20%payload/10%live gate不成立、実装しない |
| 無条件のメモリ上限増加 | 最終600秒のcoordinator受信値は保護閾値160/208MiB未満。今回は256MiB role hardcapを維持する |

今回の有限候補は、事前gateに沿って採用か負の結果まで閉じた。既知の低コスト候補を際限なく追加する代わりに、最終入口の持続・取消・配布依存・正しさを確認してレビューへ渡す。「改善余地ゼロ」やRSA100実用完了とは判断しない。

次の未測定仮説として、LP→vertex mapのu64 keyを、LPがu32内のときだけu32へ分ける余地がある。任意の有効u64 LPを保つfallback、順序/cycle/hash挙動、実メモリ計測が必要で、採用も性能見積りの確定もしていない。長時間のB×interval/結合LP設定、より大きな有限coordinator予算も未検証である。この残件を伏せて条件付きmerge許可の成立を主張しない。

## 開発中の正しさと失敗の保存

- releaseの先行試験は旧artifactに対して失敗し、実装後は40/64桁の列・counter・因子一致、terminal/repeat拒否、fresh recovery、実NoFactor fallbackが成功した。
- packedとvarintは旧保持実装に対して省メモリassertが失敗し、実装後は全packet・列・counter・最終因子一致と要求量削減が成功した。varintの405境界と不正表現拒否を含む。
- hotpathは未実装probeに対して2件失敗し、実装後は境界score/candidate oracleと40/64桁の全工程6件が成功した。速度gate不成立でも正しさと負の測定を保存した。
- 128MiB選定roleの実Nativeとfatal優先分類、source guardの実Git fixture、既存出力dirの拒否を検証した。最終8試行は測定中のHEAD・tracked bytes・各source map一致を確認した。
- サイズ診断の全packet SHAとauditのinner-family SHAは別領域である。報告生成時の誤った直接比較を修正し、各SHAの形式、source/native pin、envelope分20bytesの長さ関係を検査する。両hashの内容同一性を主張せず、原本は変更していない。

開発red/green・build失敗ログとCPU rawはLLM-01のrepo外prime-stage25に保持し、[有限の索引](../benchmarks/staged-graph-stage25/development-log-index.json)にSHAとサイズを記録した。試行raw/logは既存証跡を削除せずrepo内の各campaignへ保存する。全suite/check・独立レビュー・CIの最終HEADと結果はPR本文に記録し、測定HEADとは区別する。

## 未完了と次工程

RSA100の収集→大行列→GCDは未完了。40/64桁の完了を代替にせず、usable比率から完了時間を外挿しない。実NoDependency/ResourceLimit分岐の強制到達、実機スマホ・Safari・Firefoxは未検証。WASM requested/linearとChrome RSS/PSSは別であり、OSのtab強制終了を防げるとは約束しない。

既存の軽い入力・非公開UI経路は保持したが、新ESM入口のサイトadapter、React island、multi-instance admission、CSP、license/source access、通常サイト移動と実機mobileは後続の受入対象である。旧分解機の撤去や本番切替を本PRの検証済み扱いにしない。[依存PRとリリース条件](graph-release-readiness.md)を親が確認できる状態でDraftを渡す。
