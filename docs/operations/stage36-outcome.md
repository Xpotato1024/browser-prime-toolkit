# LP map固定対照と保留境界

PR19 head3826a590を基準に、u32範囲のLP keyとu64 fallbackを分けた候補を実装した。[固定64familyの全比較](../benchmarks/llm01-lp-map.md)は全packet/列/counter一致、usable1706、live要求8.66%減、時間ほぼ同等、PSS0.62%増で事前gate成立。40/64桁の全工程・因子検算、terminal後/fresh session、境界/同一下位32bit/置換/混在cycleのNative probe、128/256MiB各2clean一致を確認した。

測定headはc2409f30ec7561a3a5cb8019477a6f99f79ce1ea、成功campaignは2026-10-21T06:31:18.792Z〜06:40:22.724Z。Windows CIMをWSLから起動できなかった最初のattemptは計算開始前に終了し、原logをLLM-01のrepo外prime-stage36へ保持した。Windows側Desktop CommanderのCIM読取証跡を明示入力する修正後に再実行し、端末設定は変更していない。

数値gateの採用判断と選定入口への実反映を区別する。自動承認レビューが、LP mapを選定Workerへ反映するruntime/build変更を明示許可不足として拒否したため、src/optimizedの選定NativeはPR19のvarint版を維持している。候補はsrc/lp-mapの実験namespaceにある。

長時間枠の調査では、terminal解放後もcolumns/context・元CSR/CSC・filter配列・reduced行列・Lanczos scratchが重なることを確認した。host受信後のsoft-stopだけでは同期extract中の増加を止められない。実験Nativeの全GlobalAlloc経路へのquota guardを作成し、小quotaの3割当経路・overflow拒否・実抽出前ResourceLimitの5試験が成功したが、Worker/hostでの分類・退役を結ぶ4ファイルと生成操作は自動承認レビューに拒否された。1回の再検討も拒否され、再試行していない。

未完了のNative source・2clean artifact・試験・契約はLLM-01のrepo外prime-stage36/pending-long-nativeへ同bytesで保存し、index.jsonにSHA/サイズを記録した。4つの拒否対象ファイルは作成されていない。保留コードをこのPRの試験済みruntimeやサイト配布物に含めない。長時間試行、co1024の導入、RSA100収集→大行列→GCDの完了は未実施であり、性能改善が概ね尽きた条件やmerge/release条件成立とは扱わない。

再開に必要な具体的対象は、選定WorkerのLP map Native反映と、長枠専用policy/budget/worker-source/生成scriptによる有限deadline・quota分類・全Worker退役である。再開後は実Workerでの小quota拒否とfresh recovery、最終head試験/独立レビュー/CI、親が調整した静穏枠での有限長時間計測が残る。Tunnelのbuild/test中に性能計測を再開しない。

Windows CIM証跡は末尾改行なしで取得された。`windows-memory.original.base64` に原本バイト列を可逆保存し、閲覧用JSONへ末尾LFを付した。report検査は原本SHA・run値・閲覧用JSONの一致を確認し、UTF-8/LF検査は緩和していない。

## Stage37への継続

本人の追加承認を受け、旧拒否対象の選定反映と有限長枠を別branchで再開した。PR20 head18d7d843とStage36の原本は固定基準として保持する。現在の選定128/256 roleはLP map Nativeへ反映し、旧ABBAは歴史HEADのsource SHAと元Nativeで固定した。長枠の実装・試験・実測は[Stage37](stage37-tdd-evidence.md)へ分け、旧保留記録を履歴として残す。
