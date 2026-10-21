# 小幅改善2候補だけの独立反復確認（Stage44）

## 対象と再利用

PR25最終ad8885768236f4b718171bb8aa971d242b1f477eを固定基準とする。
旧screenの5%は探索側が設定した初回基準で、ユーザーが小改善を不要と指定したものではない。
確認するのは境界係数1（resieve1）とprefixループ順（prefix）の2つだけ。
旧探索データは候補選択の背景として残すが、今回の推定値・判定へ混ぜない。
合成候補・新方式・RSA100完走試行・別端末への接続は対象外。

artifactは既存2cleanのlong-1024 / resieve1-1024 / prefix-1024をhash固定で再利用。
Native40/64・実Chrome共通22契約・旧新oracle443/446・zero-import・hardcap・因子確認の
合格証跡を再利用し、計算コードや既存harnessは編集しない。
係数1は既存resieve-followup、prefixは既存resieve-prefixのverifierを使用する。
それぞれのbaselineも同じharness・同じlong-1024 artifactで比較し、
harness間の絶対時間やPSSをそのまま候補差として扱わない。

## 固定試行と有限上限

同じLLM-01、実Chrome155、Node24.19.0、RSA100先頭4family（8192多項式）、
1 combined Worker、profile/B/interval/LP/threshold/A順序を固定する。
以下の8ブロック・各4試行、最大32試行。A=baseline、B=当該候補。
1. resieve1 ABBA
2. prefix BAAB
3. resieve1 BAAB
4. prefix ABBA
5. prefix ABBA
6. resieve1 BAAB
7. prefix BAAB
8. resieve1 ABBA

各候補でABBA/BAABが各2回、全体の前後位置も均衡させる。
途中結果による順序・反復数・候補・入力の変更、任意の外れ値除外、早期成功停止はしない。
エラー・資源停止では元の結果を保持してcampaignを停止し、自動で補充/再試行しない。
32試行を超える追加計算はこの計画では行わない。

各試行の計算budget60秒、child timeout82秒、退役予備込み90秒。
全campaign上限2,880,000ms（48分）。通常の完了見込みは約20分だが、ETA保証ではない。
上限には初期化・guard・退役を含む。asset準備や親処理をrequest時間へ事後加算/減算しない。
Native hardmax1024MiB、初期<=2MiB、手動1536MiB、slots8、輸送64MiB、credit2、
WSL available>=4096MiB、Chrome tree PSS<1536MiB。空きRAM限界探査をしない。
新規Chromeごとcache無効・初回asset後通信ゼロ、全Worker/source/portの退役を確認する。
計測中は別build/性能試験を並行しない。source head/guard、環境・順序・全試行を記録する。

## 事前判定

各ブロックのrequest時間はA2点の算術平均に対するB2点の算術平均の比。
候補ごと4ブロックのlog比を集計し、幾何平均比・標本SD・全ブロック比を報告する。
生の8点ずつの範囲・標本CV、baseline端点/順序のdriftも併記する。
ABBAは線形driftを緩和できても、非線形drift・背景負荷・自己相関を完全には除けない。

次を全て満たす候補だけ、安定した小幅改善として実装費用の評価へ進める。
- 全packet・列・counter・configurationが既存成功原本と一致し、資源/通信/退役が全て合格。
- 時間比の幾何平均<=0.995（今回の工学的な最小効果幅0.5%。ユーザー要件ではない）。
- 4ブロックlog比の参考上側t限界 exp(mean+3.182446305*SD/sqrt(4)) < 1.0。
  各候補の上側97.5%相当、2候補の多重比較を考慮した保守的な目安。
  独立・正規近似を要し、4ブロックで真の信頼水準や因果効果を保証するとは主張しない。
- ABBA群とBAAB群の幾何平均がそれぞれ<1.0、かつ4ブロック中3以上で時間比<1.0。
- ブロックごとのPSS平均比の幾何平均<=1.02。個別hard stopとWASM上限も維持。

正規性や独立性を検定で証明したことにせず、参考t限界だけで有意差を断定しない。
失敗時は「効果ゼロ」へ読み替えず、不確定/未採用の具体的な根拠を記載する。
両方通過時は、係数1が最良比から0.005以内なら単一定数変更の係数1を優先。
prefixがそれ以上優れる場合はprefixを優先。2候補を合成して未測定の効果を主張しない。

## 実装と完了条件

判定に通った場合は、最小の選定反映と必要なcap/入口の再検証範囲を固定してから編集する。
歴史的なartifact・成功原本・既存receiptを上書きせず、追加namespaceで選定の根拠を残す。
通常入口の既存安全契約・軽い入力の正しさ・取消/期限/メモリ上限を維持する。
測定していないinput/Worker数/端末での速度やRSA100全工程時間を保証しない。
通らなければ計算コードは未採用のまま、全原本と理由を保存する。

新しい日本語Draft PR（PR25を前提）へ結果・工学的な採否を反映。
最終headのnpm test/check・必要CI・独立読取レビューを確認する。
merge/release/本番切替は行わない。改善枯渇を断定しない。
