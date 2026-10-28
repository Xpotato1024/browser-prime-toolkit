# ローカルルーティング候補とリモートCIの対象確認

2026-10-28の読取確認です。GitHub API、各run/jobs、全jobのCI_EXECUTION_IDENTITYログを照合しました。
新しいworkflowの起動・再実行・pushは行っていません。

## 確認済みの結果

- リモートmain／公開v0.1.5: 99133842d311d944d09f258bd29afd3d17ba9514。
- 調査開始時のローカルHEAD: 3b0151110eea5e9b96ec9add8e582eba841576c1。
  mainとの差は14コミット／91ファイル、5688追加／149削除。後述の調査文書はこの数に含めません。
- ローカルSHAのcommit APIは422（No commit found）、head_sha検索のrun数は0。
  下表の成功をローカル変更や新しいGNFSの成功としません。
- 下表は最新タグpushの9workflow／26jobで、全run／jobがcompleted/success、attempt1。
  全26jobの実checkoutShaは99133842…、Node24.22.1、tracked dirty:false。
  eventRefはrefs/tags/v0.1.5、raw eventHeadShaはannotated tag object
  17a1a98345370b88b16076a38d52ce2965ce6e7e。
  checkoutされたcommitとtag objectを混同しません。

| workflow | run | jobs | event／attempt／結論 |
| --- | --- | ---: | --- |
| CI | [40209288214](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288214) | 14 | push／1／success |
| Prefix and score followup contracts | [40209288254](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288254) | 2 | push／1／success |
| Resieve followup contracts | [40209288205](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288205) | 2 | push／1／success |
| Sustained verification | [40209288201](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288201) | 1 | push／1／success |
| Selected hotpath repeat contracts | [40209288200](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288200) | 1 | push／1／success |
| Finite wide-memory contracts | [40209288187](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288187) | 1 | push／1／success |
| Finite long-window contracts | [40209288148](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288148) | 1 | push／1／success |
| Collection phase diagnostic contracts | [40209288146](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288146) | 3 | push／1／success |
| Graph memory verification | [40209288143](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/40209288143) | 1 | push／1／success |

GitHubが返すjob一覧とログ完結・identityに今回の読取で未解消の不整合はありません。
既存CIの失敗を再現・修正する対象は、この確認では見つかっていません。

## ローカル変更をCIへ載せるために必要な操作

現在の作業branchはcodex/progress-ui-isolated-20261027です。
このbranchをoriginへ初回pushすると、入力309桁／1024bit候補、実験SIQS400入口、
共通ルーティング、工程進捗／停止理由、配布provenance、限定試験、測定記録が公開repoへ届きます。
最新1コミットだけを送る操作ではありません。mainへmergeしなくても履歴は公開されます。
今回はpushせず、branch名・公開差分をここに特定します。

既存の9workflowはpushとpull_requestで起動します。workflow_dispatch入口はありません。
全9件がactiveで、検査したworkflow内にdeploy／tag／GitHub Release／npm publish／Site配信の処理はありません。
graph-releaseという検証用script名は配信操作ではありません。
これは取得できたworkflowの範囲の確認で、権限外の外部hook／設定まで監査した主張ではありません。
workflowと権限は変更していません。

新しいunit試験は既存npm test（node --test）の対象になります。
CIを一度動かすだけなら新workflowは不要ですが、現在のCIは
scripts/verify-site-routing.mjsの16ケースを呼び出していません。
今回の実GUI経路をremoteで継続検査するなら、既存CIに限定jobを追加する案が必要です。
その最小範囲は、固定Node/npm、checkout identity、既存の明示22試験、
固定PlaywrightとChromeの準備、同scriptと証跡uploadです。
Playwrightは現package-lockの依存ではなく、ローカル検査は既存runtimeの1.61.0を使っています。
依存pin・取得元・Chrome版・CI起動条件をレビューしてから実装し、無指定のnpxや自動更新は加えません。
性能ABBAは共有runnerの合否gateにはせず、正しさ・取消・解放・通信の検査と分けます。
新jobだけで既存full test/checkの代わりにしません。

## 限定検証と残件

3b015111の同じ実装に対する限定171試験、実Chrome155のGUI16ケース、
Worker／URL14/14退役、ready後通信0は
[既存の測定記録](../benchmarks/llm01-routing-micro.md)を再利用します。
今回は計算コードを変えず、同じ検査を無用に再実行していません。
新規GNFSコードの導入・build・実計算は未実施です。
[GNFSの工程別評価](../architecture/gnfs-browser-feasibility.md)へ続きます。

以前の自動承認が拒否した全体npm test／npm run checkは、この依頼だけで解除扱いにせず再試行していません。
必要な最終remote CI、配布build、Site統合、実機mobileは未確認です。
今回追加した文書・receiptの整合性、UTF-8／LF、参照先、git diff --checkは別途確認します。
