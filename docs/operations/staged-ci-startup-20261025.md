# staged CIの起動待ち修正

PR31の通常マージ `08532f7b1397803c73a29ce848e77774a3857229` のmain CIで、[staged-selection-evaluation](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40183428166/job/121139098642) がChromeの起動待ち15秒で失敗した。全666テストとstaged契約・保存済み計測の検査は先に成功しており、計算結果のassertionによる失敗ではない。stderrのDBus診断を直接の原因と断定しない。

旧runnerは `memory.start()` を待ってからstderr listenerを付けるため、その間に起動通知を取り逃がせる。今回のログだけで通知欠落を確定することはできないが、この順序とstderrだけを準備完了の根拠にする構造を修正対象とする。

保存済み計測は `scripts/benchmark-staged.mjs` のSHA-256 `8fd69abba55c4826c434fec512650cf8e4578772ab3e6e97b774e72bd63a47dd` に結合しているため、この原本・raw・検査値を変更しない。既存の生成CI adapter方式にならい、同じ原本から `scripts/verify-staged-ci.mjs` を生成し、CIのlifecycle専用経路だけを置き換える。

既存 `observeChromeStartup` をメモリ監視より先に開始し、所有profileのDevToolsActivePortとlive loopback応答を照合する。元の起動上限15秒とその残時間での接続を維持し、失敗時の診断は接続先を伏せる。未接続の診断でCDPを送らず、すべての終了で起動監視を解放する。計算・Worker・WASM・予算・計測sourceは同じで、配布runtimeやCSP、Chrome引数を変更しない。

生成元の固定hash・差分のexact一致、監視開始順序・期限・cleanupを回帰検査する。旧失敗runは残し、修正後の新headとmain CIを別に確認する。修正の存在やローカル試験を、GitHub CI・Release・Site配信の成功とはしない。v0.1.2タグCIの別のNative validation初回失敗／同source再実行成功・初回原因未確定も維持する。
