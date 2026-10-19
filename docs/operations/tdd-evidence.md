# TDD 実行記録

実行環境: LLM-01 / WSL Ubuntu-24.04 / Node 24.19.0 / npm 11.19.0。
設計文書のcommit後にテストとスタブを追加し、以下を実際に実行しました。

| 単位 | red | green | refactor |
| --- | --- | --- | --- |
| 整数入力 | 4517a02: npm test、49件失敗、exit 1 | 67403c9: 49件成功、exit 0 | 指数読取・桁正規化の分離後も全件成功 |
| 因数累乗 | ece03ea: 対象テスト8件失敗、exit 1 | 84ac9c9: 合計57件成功、exit 0 | 範囲検査の分離・定数化後も57件成功 |

red は module 不在ではなく、export済みスタブの not implemented による挙動テストの失敗です。
入力テストには2250通りの整数科学的記法の相殺確認も含みます。
再実行: npm test -- --test-reporter=tap。
入力単独: node --test --test-reporter=tap test/core/integer-input.test.js。
因数単独: node --test --test-reporter=tap test/core/factor-powers.test.js。

ローカルの詳細logは受領ZIPと同じ非公開調査領域に保管し、リポジトリには取り込みません。
PR1時点ではブラウザ、Worker、素数判定・分解アルゴリズムは未実装で、実行検証も行っていませんでした。後続段階の実装と検証は以下に記録します。

## 計算・Workerの縦切り
- c7f3eb3で候補比較・契約を先にcommit。
- f4b8e95: engineの13挙動テストをスタブで全失敗、exit 1。
- 0fc5261: 13件成功。2..2500の独立trial oracle、Brent/Floyd、擬素数・予算・残余を含む。
- eab3161: forged mr64の新テストが失敗（14件中13成功）。7ad26c2で再検証し14件成功。
- 1697c79: controllerの9件をスタブで全失敗。8e73777でengineと合計23件成功。
- edb6269: browser timer receiverの回帰テストが失敗（10件中9成功）。d780bd0で10件成功。
- af317ce: job cleanupを共通化し、実Worker sourceの隔離実行も加えて合計82件成功。
- browserは実Chromeで検証し、[全72試行と限界](../benchmarks/llm01-baseline.md)に記録。

詳細logはリポジトリ外のLLM-01調査領域 prime-stage2/ に保管しています。
probableの長大値はWorker自己申告のscreeningとし、hostの積検算・有限mr64再検証とは区別しています。

- 95fc213: Worker CSP auditの新テストが失敗（11件中10成功）。a71d857で修正し合計83件成功。
- audit修正後、実Chromeでblocked Worker fetchの通知、取消/offline再起動、全72試行を再確認しました。
