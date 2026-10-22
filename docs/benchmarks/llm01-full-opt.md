# Full SIQS: LTOと監視間隔の実測

固定順序の6試行は、40桁・64桁の完全な因数積検算に成功しました。RSA-100は両条件とも未完了です。64桁では同じnative work・phase別workで20.517秒から14.246秒へ短縮しました。1回ずつの探索測定であり、コンパイラ単独の効果や一般的な速度保証ではありません。

| 試行 | request wall秒 | 結果 | native work | 有効関係式 | 行列nnz |
| --- | ---: | --- | ---: | ---: | ---: |
| control-40-base | 0.229 | probable/— | 35054453 | 962 | 18880 |
| control-40-lto | 0.220 | probable/— | 35054453 | 962 | 18880 |
| control-64-base | 20.517 | probable/— | 3809470039 | 5972 | 167185 |
| control-64-lto | 14.246 | probable/— | 3809470039 | 5972 | 167185 |
| rsa100-600s-base | 599.753 | timeout/time-budget | 106083893248 | 487 | 0 |
| rsa100-600s-lto | 522.612 | incomplete/algorithm-resource | 126787236244 | 612 | 0 |

計測headは `7a33c533403403e62216a3c551c3769cbca58af2`。baseはstride1024、候補はLTO＋stride16384です。双方1 Worker、固定256MiB WASM、保存容量16MiB、有限1T work、初期化5秒、配送猶予250msを共用します。request wallは初期化・計算・配送・因数検算を含み、CPU時間ではありません。元のStage13の512MiB／保存128MiB条件とは直接の同条件比較ではありません。

RSA-100候補の停止はOOMではありません。独立診断head `3ab1a82225d3aa33354460ead8719da586249b8a` で、既存のsieveBlocks上限4,000,000、basePolynomials28、derivedPolynomials111,112を確認しました。停止箇所runtime.c:49、reason3、native work126,787,236,244も一致します。診断は524.143秒、元試行は522.613秒でした。診断を新しい速度比較の反復として扱いません。保存実データ3,228,260 bytesと保存容量16MiB、線形メモリ256MiBは異なる量です。allocator使用量・JSコピー・Chrome全体の瞬間最大RAMは未測定です。

RSA-100 baseは599.753秒で有効487（full478＋cycle9）、partial34,989。候補は有効612（full596＋cycle16）、partial43,176で停止しました。必要数97,743に届かず、両条件ともfilter／Lanczos／平方根段階へ進んでいません。partialを有効関係式へ加算せず、完了時刻を外挿しません。上限引上げを最適化として採用していません。

40／64桁は実際のmode0 full経路でphase4–6と非零nnzを通過し、独立oracleは全Worker退役後に照合しました。結果の素数判定はprobableのままです。Stage14/15のmode2輸入R行証明と同一の検証を行ったという主張はしません。

各測定は初回asset取得後、HTTPサーバ停止・CDP offline・cache無効の条件で通信0、検出器の正例も通過しました。線形メモリ上限はChrome全体RAMの上限ではありません。Chrome155、i7-9700K、WSL2の同一PC上の固定順序で、少数観測・共有ホストの制約があります。

全6 raw/logは[固定試行](staged-full-opt-stage16/run-all.json)、追加診断は[raw](staged-full-diagnostic-stage16/rsa100-counts.json)、契約10件ずつと実際のRED/GREENは[証拠目録](archive/validation-logs/staged-full-opt-stage16/manifest.json)に保存しました。[集計JSON](llm01-full-opt-summary.json)と生成scriptは各raw/logのSHA、計測commitと現在source、phase／通知数、因数積、通信・退役契約を照合します。

最終headのCIはprivate Actions枠の確認待ちで未実行です。公開・release・site統合を行っていません。
