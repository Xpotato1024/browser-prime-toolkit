# CI の検証済み原本共有

- pushのHEADとpull_requestのsynthetic mergeを区別し、両イベントを残す。source producerは総合CIの実行ごとに1jobとし、既存5consumerの全ビルド・native・browser・byte一致検査を保持する。
- producerはcandidate/full-SIQSの固定manifestを統合する。同名fileのidentity競合を拒否し、9個のraw archiveだけを扱う。展開物・ビルド生成物・実行結果を共有しない。
- 取得は既存の固定URL・size・SHA-256に従う。GNUの公式mirror一覧に掲載された独立HTTPS経路をGMPの第3候補へ加える。通信一時障害のみ進み、TLS/size/hash不一致は即失敗。10秒接続・60秒転送・最大3経路の有限上限を維持する。
- producerは固定file/size/SHAから求めるexact keyでraw archive cacheを復元する。prefix restore-keyは使わない。cache-hitであっても全fileを再検証し、欠落・破損・余分なfile・symlinkは失敗とする。cacheは信用根拠ではない。
- cache missでのみ取得し、全検証後に同じworkflow実行のartifactへ保存する。途中失敗のcache/artifactは公開しない。原本だけを保存し、長期の新資格情報・権限は追加しない。
- 各consumerはproducerに依存し、その実行のartifactを取得する。自身のcheckoutの固定manifestでsize/SHAを再検証し、cache-only importerを通してから従来の独立ビルドを行う。consumerから外部sourceサイトへのfallbackを許さない。
- source取得失敗はproducerに集約され、依存jobが成功扱いにならない。取得が通れば5consumerを並列で実行する。timeout増加、skipによる合格、数値・資源上限の緩和はしない。
- official GitHub actionsはsource・license・versionとfull commit SHAを確認してpinする。contents: readを維持し、既存event identityを全jobで記録する。
- 回帰は2通信timeout後の第3mirror、hash/size/TLS拒否、全経路枯渇、正常/欠落/破損cache、重複identity、exactkey、consumerのnetwork禁止、全build gateと両イベント維持を検査する。
- productionのsrcと配布graphには影響しない。固定9cfのサイトartifact/review/pinはそのまま保持する。
