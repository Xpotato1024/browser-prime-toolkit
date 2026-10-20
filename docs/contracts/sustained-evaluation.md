# 集約方式・持続計測の事前契約（Stage23）

PR17成功head c1d91e7d0f9b53ea324de3df654b51c94c597288を保存し、新ブランチだけを変更します。旧Stage22の原本は性能試行前の停止として保持します。今回の追加委任に基づく別の研究で、旧runの再開・上書きではありません。

原ログは正しいlocalhostのHTML/entry-module要求、page targetのみを記録し、Page.navigateの5秒期限で失敗しています。同経路の直前4 preflightは成功。権限拒否やブラウザ警告の証拠はなく、Chrome内部の遅延理由は断定できません。別driverでPage.navigateだけ有限30秒とし、HTTP開始/finish/status/bytesとCDP開始時刻を記録。他のCDP・runtime初期化・計算期限、取消、因子検証は緩和せず、別URLや権限変更で迂回しません。

## 有限の測定監査
旧60秒4 Workerは生パケット5,806,696 bytesを保持しました。旧監査は8MiBなので長枠を監査上限で止める恐れがあります。旧runner/auditは変更せず、測定専用派生hostで返却パケットをWebCrypto SHA256へ順次変換して生payloadを解放し、familyごとのbytes/polynomials/rawRelations/hash/受理prefixを保持します。数値kernel、WASM、Worker、family設定、credit、全体4スロット、32MiB輸送、役割capはPR17から不変です。

保留hash入力合計8MiB・同時digest4・family4096・進捗4096・host event4096件で有限。重複/上限/hash失敗は失敗扱い。転送前に必要領域をコピーしてdigest開始し、Worker退役後に全成功を有限10秒で確認、完了待ちを収集時間から分離します。固定4-familyを旧生packet監査と照合し、一致しなければtimedへ進みません。hashのCPU/JSコストを含む測定と明記し、因子証明の代用にしません。

## 予算と採否
bench/staged-sustained-plan.jsonを事前固定します。combined2/4・dedicated2/3/4の各16契約preflight後、combined2/4・dedicated4でfamilies0..3を各最大60秒処理し、旧のbytes/hash/native counters/prefixに照合します。

集約方式はcombined4,dedicated4,dedicated4,combined4各60秒。両反復のdedicated usableが対応combinedの110/100以上で全安全条件成功なら候補です。短いharness失敗から方式不採用とは判断しません。

持続はcombined2,4,4,2各300秒。その後2/4を各request開始120秒後に取消し、300秒全体期限内の全Worker/source退役と、取消前のfamily/graph増加を確認します。両反復の4 Worker収量が2の110/100以上、全安全条件成功を持続候補基準とします。

300秒とgrown cancelが全成功、両反復比110/100以上、coordinator linear peakが256MiBの3/4以下、実行前available RAM4GiB以上、20:30UTC前なら600秒の同じ2,4,4,2を1セットだけ追加可能。それ以外は追加しません。最大計算予算はfixed3分+集約4分+持続20分+取消4分+条件付き延長40分=71分。preflight/build/test/review/CIは別。自動retry/overwrite/試行選別は禁止。全rawと負の結果を残し、重いbuild/testと同時実行しません。22:00UTC以降は新規探索を開始しません。

full/SLP/DLP/cycle/usable、polys、返却→受理、待ち時間、役割別requested/linear memory、250ms Chrome RSS/PSS（最大4000samples）と時計基準を記録。RSS/PSSは観測で、WASM capやJS/hash/輸送を区別します。収量からRSA100完了・全工程時間を外挿しません。

## メモリ上限
現在の手動選択肢は128/256/384/512MiB、自動最大512MiB。4 Workerは256+64×3=448MiBのcompiled capです。予算だけ増やしてもartifactが同じなら実上限は増えません。deviceMemoryは空きRAMではありません。

coordinatorの実WASM OOM、またはlinear peakが256MiBの9/10以上という実測が出た場合だけ、512MiB coordinator+64MiB helpers（4 Worker704MiB）を明示手動768MiBへ収める別変更を検討。source/非memory section/2 clean builds/役割・総capと独立確認が必要。証拠がなければ512MiBを維持し理由を記録。自動増量・無制限・巨大割当による限界探索はしません。

最終headの独立レビュー、npm test/check、CI、日本語Draft PRまで確認。PR17、Ready/merge/release/deploy/本番統合/他端末/資格情報・権限は変更しません。
