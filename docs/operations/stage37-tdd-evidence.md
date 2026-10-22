# Stage37：LP map反映と有限長枠の検証

PR20 head18d7d843を固定基準に追加branchへ分離した。本人の追加承認後、選定128/256 roleをLP mapへ反映し、通常入口の600秒上限と軽い入力経路を維持した。旧ABBA baselineは歴史HEADのrole source SHAと旧Nativeへ固定する。

## TDDと途中検証

- 選定NativeのSHA・境界export・旧baseline一致の3件は旧入口でred、反映後green。
- 旧resource policyは1800秒と実験専用の明示設定を満たさずred。long policyは最大5 owner、WASM512MiB、1800秒、global4/8枠、未知/偽造設定拒否でgreen。
- 復元Nativeは原本8ファイルのSHA/bytesを照合した。alloc/zeroed/realloc/overflowのtiny拒否、実extract前ResourceLimitは5件green。
- LP mapとの40/64桁全packet/列/counter/profile/因子一致、guard scope解除とfresh session、64-byte abort後scalarのみ読取を確認した。
- 実Node Workerでpreflight・abortの分類と全退役、unknown trap、fresh recovery、5 owner取消・非協調deadlineを確認した。
- 途中P2のmemory欠落/nullは、正しいWorker初期化後に誤受理する2件をredとして再現。memory必須化後、欠落/null/zeroがprotocol-failureとなり全退役する。
- helper64へcoordinator専用抽出diagnosticsを適用していた初期生成条件を修正した。最初の該当試行はworker-creation失敗であり、quotaのred証拠とは数えない。
- 監視の低空きRAM、欠落/古いWindows値、5000行上限と停止callbackの3件green。
- cleanupの途中P1/P2は、監視停止例外でも専用Chromeを先に退役し、leader状態と独立したPGID確認、有限TERM/KILL、transportのfinallyへ修正した。旧順序のredと3件greenを保存した。
- 実Chromeでは22契約が成功。3秒のRSA100対照は期限停止・通信0・全退役で成功。これは性能比較ではない。
- WindowsのCIM monitorは構文検査と2行の小規模動作確認で、読取とatomic snapshot/timeline出力を確認した。初回のsnapshot更新はPowerShellのnull引数変換で失敗し、NullStringによる明示nullへ修正した。失敗directoryも保持する。設定・権限は変更していない。

中間ログと失敗原本はLLM-01 task/prime-stage36およびprime-stage37へ保持する。Nativeの2clean receipt/source pinを検査し、最終HEADのtest/check・独立レビュー・CIは別に確定する。

## 計測前の境界

[長枠契約](../contracts/long-window.md)と[固定plan](../../bench/staged-long-window-plan.json)に従う。co1024は現段階では未実装。長時間試行の結果からのみ後段の必要性を判断する。採否はprefix一致・資源と退役・実際の停止理由に基づき、収集比率を全工程進捗や完了予測へ変換しない。サイト統合、Ready、merge、releaseは行っていない。
