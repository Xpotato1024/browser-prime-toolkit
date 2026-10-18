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
ブラウザ、Worker、素数判定・分解アルゴリズムは未実装のため、実行検証も行っていません。
