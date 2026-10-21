# 明示的な大メモリ長枠の有限検証（未実装）

基準はPR21 dc8dbbb、Stage37測定head f27dd7c。co256は956.817秒・accepted572/usable22525でlive160MiB保護停止し、allocator失敗0、host availableはWSL8663.86/Windows15682.73MiB以上だった。メモリ容量が収集継続を制約するという実測に対し、co1024の有限枠で収集→大行列→GCDへ進めるかを確認する。速度向上や完了時間を予測しない。

通常selector/600秒/自動設定/サイトmanifest入口は変更しない。独立wide-window実験namespaceに明示manual予算1536MiB、co1024+helper64×4=1280MiBのWASM hardmax、最大5owner/8slots/64MiB輸送/ownercredit2を固定する。requested/linear/Chrome RSS・PSS/availableは別指標。

Nativeは既存fixed source/compile recipeから1024MiB hardmaxだけを指定して2clean buildする。抽出中live quota640/linear事前閾値832MiB、checked preflightとalloc/zeroed/realloc guard、abort後scalarのみ・全退役は維持。新たな依存や巨大割当による限界探査はしない。

開始前のWindows/WSL available各8192MiB以上を必須とする。実行中available4096MiB未満、Chrome tree PSS3072MiB以上、監視欠落/不正/30秒超で停止。OSによるtab強制終了を防げるとは主張しない。observer stop独立1000ms/所有Chrome群退役を維持。

最大3600秒1回のRSA100だけを性能・成立性試行とする。driver待ち最大3720秒、sample8000×500ms、Windows391×10秒/3900秒deadman。family4096、event16416（family処理とinit/retirement分を有限に予約）、graph512、progress4096、raw16MiB、repo可逆gzip/Base64各2MiB。いずれも無制限へ広げない。測定head/plan/sourceを固定し、初回asset後通信0・sourceguard・全退役を検証する。

事前条件: 40/64桁の全packet/列/counter/因子一致、artifact hardmax/初期小メモリ/2clean/source、tiny preflight/allocator拒否、実Worker trapとfresh recovery、明示取消/非協調deadlineの契約試験。co1024で小さい取消を実Chromeで確認する。大きい保持での実退役は本試行のtimeout/resource stop/完了でも計測する。

本試行はStage37と共通する先頭572 familyのpacket/counter、prefix128の列SHAへ照合する。終了family数が異なる最終メモリ比を速度・省メモリ比較にしない。大行列へ達した場合は段階別rows/cols/nnzとrequested/peak/linear、GCD・最終因子検証を記録する。未達なら実停止理由を残し、usable/targetを全工程進捗や単純時間予測としない。

この1回の結果をもとに候補一覧・採否・残る制約を整理する。未達を理由に無制限の追加長時間試行へ拡大しない。条件付きmerge/release判定は主要候補の検証・正しさ・資源制限・同head最終CI/独立reviewを満たした後。サイト旧分解機撤去と本番切替は別の受入工程。
