# 有限長枠と抽出中の割当ガード

Stage37。LP map固定対照を採用した後、長時間枠を実験namespaceへ分離する。サイト入口・自動設定・PR19原本を変更しない。最初はco256＋helper64×4（WASM512MiB）、1800秒1回。収集が保護停止した場合に限り、必要性・ホスト余裕・ガード試験を確認してco1024＋helper64×4（WASM1280MiB、明示予算1536MiB）、3600秒1回を別planで候補にする。計測開始前に親の静穏枠連絡を待つ。長枠を無制限に追加しない。

## 抽出中のガード

terminal解放後もcolumns/contextを保持したまま、matrix作成前にscopeを有効にする。元CSR/CSC、filterのrow/column配列・eliminations、reduced行列、solver scratchは重なり得る。dense用256MiB判定をBlock Lanczos全体の上限と見なさない。

実験用の既存GlobalAlloc observer派生で、alloc/alloc_zeroed/reallocを各1回、checked算術で予算確認する。内部で割当・format・panicを行わず、overflowもNULL拒否。reallocは旧新領域が同時保持される場合を考慮しLIVE＋新sizeで判定し、拒否/System失敗では旧pointerとLIVEを保持する。deallocは常時許可。非共有単一thread WASMに限定する。

live requestedの絶対上限はrole capの62.5%、linearの事前拒否閾値は81.25%。linear＋新size＋1pageは保守的な事前見積りで、System allocatorの実growth上限とは主張しない。厳密上限はWASM hardmax。stack/static/JS/ブラウザ全体は対象外で、OS tab終了の防止は保証しない。scope開始前に既存LIVEをresetしない。

matrix parity entriesからCSR/CSCの予定payloadをchecked演算で見積もり、LIVEと併せて不足ならEngineError::ResourceLimitで抽出前に拒否する。重複entryでは保守的な過大見積りになり得る。Vec容量・構築コピー・fill-in・solver scratchはこの式だけで上限証明しないため、scope内の全heap割当にガードを適用する。段階別rows/cols/nnzとlive/peak/linearは固定24行のscalar配列で記録する。

quota拒否は通常のallocation failureとは別flagにも残す。Rust abort後は非割当scalar telemetryだけを読み、session/free/再利用をせず全Workerを退役させる。extract phaseとNative quota flagの整合がある場合だけnative-memory-budgetとしてincomplete/resource-limitへ分類する。通常のwasm-oom、unknown trap、fatal優先、cancel/deadlineを維持する。

## 前提試験と残る限界

3割当経路の小quota拒否、realloc旧領域保持、overflowの非割当拒否、実extract前ResourceLimit、trap後scalar読取・分類・全退役とfresh recovery、40/64桁の因子積/確実性と全packet/列/counter一致、2clean/role hardcapを先に確認する。合成小quotaは空きRAMの巨大割当探査ではない。

長枠は最大5 owner、ownercredit2、global8枠/transport64MiB、digest16MiB/8 pending、family4096、events12288、graph512 snapshots、progress4096を有限保持する。長枠rawはローカル原本を保持し、repoには上限付きlossless gzipとhash/要約を保存してよい。

co256枠は開始前WSL/Windows空きRAM各4096MiB以上、co live160/linear208MiB・Chrome PSS1536MiBで停止。co1024枠は各8192MiB以上、co live640/linear832MiB・Chrome PSS3072MiBで停止。同期呼出の単一増加や非heapを含む厳密上限とは扱わない。長枠の取得量から完了時間を外挿せず、収集完了・行列・GCD・最終検算と未完了の実停止理由を分けて報告する。

## Stage37実装範囲

最初の実装はco256＋helper64を最大5 owner、明示512MiB・最大1800秒に限定する。通常入口は600秒のまま。co1024は予約された後段候補で、現行long APIでは拒否する。Chrome treeのPSS監視は500ms間隔・5000行まで。WSL availableも読み、実際の長時間試行ではWindowsの読取専用RAM monitorを10秒間隔で更新し、30秒以上古い・欠落・不正なら保護停止する。開始前と各試行で4096MiB以上を確認し、計算中に下回った場合も取消する。これらは空きRAMの割当探査ではない。

[固定plan](../../bench/staged-long-window-plan.json)は22契約、RSA100のprefix16、1800秒1試行、120秒後取消1試行だけを許す。各harnessのNode watchdogは予算＋90秒、driverは予算＋120秒で、suite/配信/後処理を含む全体上限は2550秒。計算コアのdeadlineは初期化込みの各要求時間を維持する。raw16MiB・repo用lossless gzip/base64各2MiBを上限とし、全原本をローカルへ保持する。source/HEAD guardと固定prefix一致、全退役・通信0・実停止理由を採否基準とし、増加量からRSA100完了時間を外挿しない。
