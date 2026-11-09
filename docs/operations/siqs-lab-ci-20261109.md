# SIQS lab CI の起動・期限検査の分離

## 観測と限界

- 対象はUI修正 `9cf35474d7b4b477d16fa9e3094450d9418cf3e7` の[push失敗](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/42515206540/job/128836619336)と[同一treeのPR成功](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/42515210631/job/128836632204)。失敗名は `host deadline terminates a worker with no cooperative clock`。
- 両方ともNode 24.22.1、Ubuntu 24.04.5 image 20261101.360.1、runner 2.338.2。再ビルドしたWASM・Workerのハッシュも一致する。実行リージョンは異なり、browser段階全体は失敗側約8.77秒、成功側約12.94秒だった。
- 旧ログは複合assertionの個別値を残していない。過去のどの述語が偽だったかは不明であり、今回の競合再現を当該実行の確定原因とはしない。遅延の発生源や頻度も確定していない。
- 旧fixtureはWorkerを生成する前から1000ms予算を開始する。収集期限は `1000 - 50 - 1000/3 ≈ 616.67ms`。CDPは新Workerを停止状態で捕捉し、Network/Runtime監視を接続してから再開する。cold readinessがこの枠を消費すると、非協調処理をpostする前に正しく初期化期限で終了できるため、posted前提の検査と競合する。

## 修正と回帰

- [契約](../contracts/siqs-lab-ci.md)に従い、CI用の合成Workerだけを独立した5秒の有限準備で起動する。その後は同じrunnerへreadyを非同期に渡し、1000ms予算・1300ms未満・postedを伴う工程期限・incomplete・解放完了を全て要求する。
- 過去のdriver/harness/asset routeはSHA-256で固定したまま、新CI adapterを生成する。計測用 `--case` はCI入口では拒否し、既存benchmarkは元のdriverを使う。元の比較rawや契約を再解釈しない。
- TDD red: 700ms後のreadyを旧cold-start fixtureへ渡すと、616.67msで `initialization-deadline / posted:false / charged:0` となり、同じWorkerをpostして停止する期待が失敗した（1件失敗）。
- Green: 独立準備後はsetup=700ms、run=616.67ms、`host-phase-deadline / posted:true`。13件の決定論的回帰が通過する。未準備、5秒超過、誤profile、late-ready、工程期限、全体期限、使用量計上、Worker/Blob/timer解放、生成物一致とroute境界を含む。
- ホストcallbackが1400msまで遅延するケースはtimeoutのまま失敗する。閾値引き上げ、再試行、skipによる成功扱いはない。
- CIログとreceiptへ準備時間、実行結果、各述語、hostStops、使用量、解放状態、browser/host情報を記録する。失敗を成功へ置き換えない。

## 検証と配布境界

- Node 24.22.1 / npm 11.19.0: `npm test` は883/883件、`npm run check` も通過。追加13件は単独実行でも通過。
- Chromium 149.0.7827.55 の実browser契約11件が通過。初回の合成Worker準備は7.30ms、実行は616.80ms、計上量8,000,000,000、終了後live Workerは0。これはCI契約の動作確認であり、因数分解性能測定ではない。
- 独立read-onlyレビューで期限・lease/cleanup・生成物・配布境界にblocking指摘なし。過去失敗の個別述語が不明という限界も維持する。

- productionの `src/`、Worker、数値engine、release build recipeは変更しない。package変更は検証scriptのみで、配布用packageでは除かれる。実ビルドと固定9cfのartifactを比較し、97ファイル中95の配布payloadがbyte一致した。差はprovenanceとmanifestの2ファイルのみで、labファイルは含まれない。
- サイトは既存のexact `9cf3547` / 0.2.5 source pinと固定artifactを保持できる。既存pinのsourceTree、review、registryをこのCI変更に合わせて書き換えない。
- 新HEADから再ビルドする場合は入力packageとsource revisionのprovenance、およびそのハッシュを記録するmanifestが変わる。配布実行コードが同じでもartifact全体がbyte同一とは主張しない。新HEADへpinを移すなら通常の再ビルド・review/admission手続きが必要。
- merge、tag、GitHub Release、本番公開は行っていない。
