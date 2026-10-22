# 集約方式と持続計測の再現境界

PR17 の最終成功 head は `c1d91e7d0f9b53ea324de3df654b51c94c597288` です。追加検証は別ブランチで進め、既存の入口・自動最大2 Worker・手動設定・数値kernel・WASM・Worker・本番統合を変更しません。

[Stage23 契約](../contracts/sustained-evaluation.md) と [固定plan](../../bench/staged-sustained-plan.json) が、512MiB総予算・credit1・同じRSA100入力・同じgeometry・順序・終了基準を定めます。集約比較は combined/dedicated/dedicated/combined 各60秒、持続比較は2/4/4/2 Worker各300秒です。120秒後の取消を2件実施し、両組で10%以上・native memory余裕・安全な取消・host余裕・開始時刻がそろう場合だけ600秒比較へ進みます。収量を全工程の完了時間へ外挿しません。

Stage22のページ開始失敗は計算開始前です。同じlocalhost origin・同じCSP/権限を保ち、専用の /bench/sustained.html でPage.navigateを30秒上限として配信traceを保存しました。元の5秒失敗の下位原因を断定せず、旧失敗を方式の不採用根拠にしません。

長い試行では8MiBの累積raw監査が先に尽きるため、測定用にstreaming SHA256を追加しました。native packetを転送前にコピーし、digest入力を含む保持量8MiB・4件・4096family、progress/eventは4096件、RAM標本は4000件までです。超過は安全停止し、rawを無制限に残しません。既存runtimeを生成元として数値/Worker/credit/cancel部分を維持します。監査のCPU/JSコストを含む同条件比較であり、旧監査との速度差を数値手法の改善とは呼びません。

Stage23 core `2a88e59a5740d204dda40c474fa4959db454062d` は5契約確認・3固定family・4集約試行を取得しました。その後、集計で入力IDが試行IDを上書きする不具合を重複検査が拒否し、300秒試行前に停止しました。旧manifest/raw/log/sourceは保持しています。[継続契約](../contracts/sustained-continuation.md) に従い、旧manifestのSHAを固定し、core `ed207f4a9e5aac90b914a8a21ec6b515f292a92b` の新しい集計helperで旧全証跡を再検証した後、残予定だけを実行します。計算・harnessのsourceは旧coreと同一です。

継続は既存出力先を拒否し、自動再試行をしません。rawのcase IDと入力、planの試行IDを分離します。生成物は `node scripts/generate-sustained-continuation.mjs --check` で確認できます。全結果は `node scripts/report-sustained-closure.mjs --check` がraw/log・旧manifest SHA・source/immutable head・offline検出器・退役・family/prefix・RAM時系列・資源cap・採用gateを再検証します。タイムアウト収量の再計算をCIの成否条件にはしません。

WASM hardcap合計・要求量・linear memory・JS/輸送量・Chrome RSS/PSSは別の量です。deviceMemoryは空きRAMではありません。軽い入力は既存経路を保ち、今回の難しい入力だけの計測をスマホでの保証に置き換えません。OOMを扱えてもOSによるtab強制終了を防げるとは主張しません。物理スマホ・Safari・Firefoxは未検証です。
