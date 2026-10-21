# resieveの有限追試（Stage41）

## 先行結果と狙い

基準はPR24のhead e65e1df79ceca41a206444087aac3a0e96fb0815。
現行の1Worker・RSA100先頭4family診断はresieve49.08%、score35.81%。
前段の倍率4は時間+7.42%、疎score省略は+1.52%で両方不採用だった。
元の2候補の契約・原本・artifactは変更せず保全する。

この結果に基づき、次の2候補だけを独立比較する。
1. resieve境界倍率2→1。倍率4の負の結果から逆方向の費用比を確認する。
2. bitmap wordごとの最初のcandidate indexとpopcountでrankを求め、
   prime-majorのbinary_searchを除く。倍率は2のままとし、複合変更にしない。

追加wordStartはu32×ceil(scores.len/64)。RSA100ではsentinel1024込み65,600B／Worker。
空きRAMを探索しない。既存bitmap・小さい初期memory・役割hardcap・総予算を維持する。
wordStartのindexは1起点で0を未使用とし、同じscratchを使う前に触ったwordを0へ戻す。
bit0/63、word境界63/64、同word複数candidate、空候補・高密度・48/49因子overflowを検査する。
root正規化、MAXによるA素数除外、重複抑制、因子index昇順、fallbackを変えない。
scores長はsentinelを含む現行値のまま。数学の近似・既知因子・無制限cacheを導入しない。

## 比較と停止条件

各候補を時計なしlong-1024基準へ単独適用、同じ上流commit/compiler/SIMDで2clean一致。
別oracle artifactで旧実関数との直接比較、Native40/64全工程、実Chrome契約を先に通す。
その後、RSA100先頭4familyをbaseline / candidate / candidate / baselineで各2回比較する。
各90秒＋退役予備30秒、8試行全体最大960秒。計測headとsource guardを固定する。
1Worker、Native hardmax1024MiB、手動1536MiB、8slots、輸送64MiB、credit2、
WSL available4096MiB以上、Chrome PSS1536MiB未満。別のビルド／計算を同時に走らせない。

時間中央値比<=0.95、PSS比<=1.10、全packet・列・counter一致で次の確認へ進む。
成立時は別prefixで有限再確認し、通常経路反映・長時間試験の設計を別に固定する。
不成立時も原本を保存。次の候補を無条件に追加せず、残る処理比率と期待利益／実装費用で停止を判断する。
A選択0.14%・候補走査1.26%の単独変更、既存SIMDの重複実装を優先しない。
今回の2候補以外の大型方式、compiler更新、WebGPU/GNFS移植は対象外。

PR24の最終CIを確認しつつ静的設計を進める。ローカルfull check完了までは追加build/性能試験を開始しない。
既存の37分成功と比較メモを保全し、収集prefixの時間から全工程完了時間を外挿しない。
merge/release条件は未成立。本番サイト切替・資格情報・権限・端末設定変更は行わない。
