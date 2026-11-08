# CI browser起動の共通契約

- 9workflowとverify aliasから到達するbrowser入口を列挙し、旧stderr専用待機を自動検査で拒否する。歴史的benchmark aliasは計測再現用として維持し、CI入口へ無条件に置き換えない。
- 過去のdriver・実測raw・receiptはbyte固定で保持する。registryのoriginal SHAと一意な変換anchorからCI専用adapterを生成する。既存の安全な共通入口は同じ契約で検査する。
- owned Chromeのspawn直後、非同期memory samplerを待つ前に観測を開始する。stderr通知だけに依存せず、当該profileのport情報と実際のloopback endpointでreadyを確認する。
- 元の15秒/30秒起動上限を維持し、port待ちとCDP接続で同じ残り時間を使う。計算・worker退役・資源・CSP・offline・数値検査の上限やassertionは緩和しない。
- 未接続・切断後のCDP送信は直ちに失敗し、pending応答とtimerを解放する。診断のために切断後のCDPへ再接続待ちを追加しない。
- browser、transport、sampler、HTTP server、profileのcleanupを入れ子で保証する。元の失敗を保持し、cleanup失敗も記録する。cleanupの不備を正常終了へ変換しない。
- 新receiptはci-contract-only/performanceMeasurement:falseを明示し、originalと実行adapter、registry、generator、transform、helperのhashを記録する。旧driver hashだけで新経路の実行を証明したことにしない。
- adapterはregistryに列挙した契約用argsだけを受け付ける。CIが既に使う限定case/familyは保持し、長時間の性能campaignを新adapterへ紛れ込ませない。--caseを一律に禁止して既存検査を削らない。
- checkは生成物一致・凍結source・到達入口を検査する。既存push/PR両イベント、実checkout identity、独立ビルドと全ての数値gateを維持する。
- stderr通知を取り除いた実Chrome、起動前後のrace、接続不能、切断、pending、cleanupの回帰を含める。DBus出力や通知喪失を過去の個別失敗の確定原因とはしない。
- production srcとサイト配布graphは変更しない。固定9cf/0.2.5のサイトpinはCI修正のために置換しない。
