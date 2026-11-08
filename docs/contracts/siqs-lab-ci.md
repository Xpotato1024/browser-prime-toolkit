# SIQS lab CI の期限試験

- 過去の測定driver・harness・資源と計算契約はbyte固定で保持する。新しいCI専用adapterは固定原本と一意anchorから生成し、計測用--caseを受け付けない。
- 実ブラウザーの無限ループWorkerの試験は、監視器の接続を伴う起動と、runnerが実際にpostした後の非協調処理の停止を分ける。準備は5秒の独立した有限期限を持ち、失敗は隠さずWorkerとBlobを解放する。
- 準備済みのready通知を非同期にrunnerへ渡す。計算の1000ms予算、postedを伴うhost-phase-deadline、incomplete、全Worker解放、1300ms未満という元の停止条件は維持する。再試行、成功扱いのskip、閾値緩和はしない。
- 未準備・遅いready、工程期限、全体期限、使用量計上、Worker・Blob・timerの解放は、要求した期限順を維持するfake clockで決定論的に検証する。
- browserの診断には準備時間、kind/error、elapsed、hostStops、解放エラー、計上量、所有数と各assertionの真偽を残す。失敗時も保存とCIログ出力を行い、失敗そのものは保持する。
- これはCIの検査手順変更である。サイトUI・数値engine・production予算・Workerソース・ライセンスは変更しない。

## 固定source取得の独立経路

- GMP原本は固定version・1,939,430 bytes・既存SHA-256を維持し、GNUが掲載するHTTPS mirrorを第3の有限経路に加える。接続10秒・転送60秒の上限は変えない。
- 再取得は列挙した経路へ一度ずつ、通信の一時障害だけに限る。hash/size不一致、TLS拒否、破損cacheは即失敗とし、検証前にcacheへ公開しない。上限3経路を超える計画は拒否する。
- cacheを使う際もsizeとSHAを必ず再検証する。共有cacheも信用根拠にせず、[原本共有契約](ci-source-archives.md)で管理する。計算用source・生成WASM・production runtimeは変えない。
