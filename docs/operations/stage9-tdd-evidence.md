# Stage9 TDDと検証
設計・一般群・未使用holdout生成手順を1c9c2b6で先に固定しました。比較コードはe7f764398c3181eb713b5ae0858f8621c43220d7、一般群からの選択はbc44bd7で固定してからholdoutを測定しています。

- stage pool: API未実装のRED後、root操作数・時刻・同じchild Budget identityを保つ3件がGREEN。
- factor dispatcher: API未実装のRED後、prefix枠の再付与なし、ECM同一identity、proper divisor、probable／資源不足／global停止とfatal非fallbackの3件がGREEN。
- host/proof deadline: 破棄判定falseと、proof後に期限を超えてcompleteになる2件を実REDで確認し、GREEN。
- 初期化5秒上限: 対応timerがないRED後、global10秒内でも5秒で停止するGREEN。
- release例外: releaseがthrowするとterminateを飛ばしdead=falseになるRED後、両処理を独立tryにしてGREEN。
- host結果契約: validator API未実装のRED後、host/workerの明示union、0/1、操作枠0、取消・host timeoutがGREEN。
- ready競合: init timer未dispatch時に6秒でreadyが来るとrunを送るRED後、受信時もinit deadlineを確認してGREEN。
- 選択wrapperは一般群選択の固定後に追加した回帰テストで、TDD先行とは数えません。

[保全目録](../benchmarks/comparison-preservation.json)の21ログには既存Stage7/8のnative/TDDと上記の実RED/GREENを保存しています。red-controller.logはtest import pathの設定誤りだったため、TDD根拠から除外しています。

前段は全174 tests/check GREEN、独立中間レビューでP1/P2/P3=0。選択wrapper後は175 testsです。4profileの実Chromeでloading/running取消・quiet runtime・fatal退役と次request回復を検査しました。90一般群＋120holdoutの全試行で新Chrome/new Worker、初回asset後通信ゼロとpositive detectorを確認しています。最終headではnpm test/check、CI、独立レビューを改めて確認します。
