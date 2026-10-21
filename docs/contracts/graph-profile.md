# Graph保持量と抽出移行の有限評価

基準は PR18 head `297f9d29c2102dfcd420f0b9fee5230ed4a0d4df`。
公開入口と既存resources/coordinator/sustainedの固定source・receiptは変更しない。
新しいgraph-profile実験は独自engineの改善を目的とし、他engineへの置換はしない。

## 仮説と候補

1. 観測のみのbaselineでforest、columns、vertex配列、HashMap、seen-Aの保持容量を測る。
   requested live/peakとlinear memoryを記録し、容量推定との差を残す。
   HashMapはcapacity×entryサイズの下限推定で、allocator metadata等を含まない。
2. forest内の1024bit固定rootを可逆なLE byte列で保存すれば、partialを失わず削減できる。
   cycle結合時だけ既存Naturalへ復元し、演算器・指数・sign・LP・packetは変えない。
3. 収集を不可逆に終了してからforest/seen-A/bufferを解放すれば、LAとの重複を減らせる。
   失敗後の収集再開は禁止。列・context・元行列でのdependency検証とproper divisor検証を維持。
4. 別系列としてmatrix中間保持、全体credit枠、5/6 ownersを検討する。
   小さい対照と保持量計測で識別できる順に実施し、未実施を採用済みにしない。

## 固定条件と採否

最初の計測sourceは新しいcommitに固定する。upstream全file hash、patch、compiler image、
2回clean build一致、artifact上限256MiBをreceiptで固定する。helperは既存64MiB artifact。
root保存変更だけの比較では同一input・family範囲・B・interval・LP上限・target・A選択を維持。
packet SHA256、collector counters、canonical column bytes SHA256を一致させる。
small inputの収集→行列→GCD、境界roundtrip、取消・fresh recoveryを通してから持続比較する。

最初の予算は小さい入力各30秒以内、RSA100固定4 family各90秒以内。
次に4 owners、同一family上限128、各300秒以内、baseline/compact/compact/baselineの順。
全体の最初の計算予算は最大30分。300秒を超える拡張は結果を見て別の事前計画に残す。
比較は最低2反復。保持requested bytesを同じ受理prefixで10%以上減らし、
同一familyの収集時間中央値が10%超悪化しない場合を初期採用条件とする。
単独の短時間失敗は方式不採用の根拠にしない。負の結果も原本として残す。

## 停止と測定の限界

開始時WSL available 4096MiB以上、Chrome tree PSS 1536MiB未満を条件とする。
coordinator requested live 160MiBまたはlinear 208MiB以上の観測時は次job発行を停止し退役する。
これは次allocationの厳密な上限保証ではない。Vec/HashMap拡張の一時重複、submitのコピー、
JS/packet、stack/metadata、Chrome RSSは別に評価する。OOMを目的とする割当はしない。
実験の時間上限とcancelはmain threadからWorker退役で強制し、OS強制終了防止は保証しない。
WASM総上限512MiB、transport32MiB/4 outstandingを初回系列では維持する。
5/6 ownerや予算増は別の有限計画・sourceへ分離し、auto設定を変更しない。

計測snapshotは最大256、native phaseは固定16枠、各試行の保存は1MiB以下を目標とし、
source/hashはmanifestで共有する。旧raw・履歴は削除しない。新規原本を後から上書きしない。
worker assigned wall比はCPU使用率ではなく、収集比率は全工程進捗や所要時間予測ではない。
実機スマホ・Safari・Firefoxの検証をChromeやエミュレーションで代替済みとしない。
