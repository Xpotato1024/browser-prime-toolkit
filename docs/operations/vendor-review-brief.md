# ベンダー確認に渡せる最小情報

この文書は非秘密の提出用下書きです。Microsoftへの送信、ログイン、規約同意、検体添付、復元は行っていません。
ローカルのユーザー名・絶対path・SID・機器名・検出GUID・連絡先・資格情報・入力値は含めません。

## 本人へ渡す短い説明

この開発で固定したrusqsieve由来のRustソースとpatchから、WASMをJS定数へ梱包した生成物がDefenderに検出されました。
生成元と既存build記録は追跡できましたが、隔離された実体そのもののSHA256とGit生成物との一致は未確認です。
検出名の非公開判定理由は分からず、今回の限定監査でも原因を特定していません。誤検知・無害・根本解決とは断定できません。
必要なのは、下記metadataを基に、公式窓口が受理する不足情報と安全な確認手続きを確定することです。同じ復元操作の再承認を求めたり、拒否を解消したとみなしたりしません。

## 公開可能な既存事実

| 項目 | 値 |
| --- | --- |
| repository | https://github.com/Xpotato1024/browser-prime-toolkit |
| 対象source | 99133842d311d944d09f258bd29afd3d17ba9514 / v0.1.5 |
| 対象の相対path | src/optimized/wasm-optimized-128.js |
| 検出名 | Trojan:Script/ObfusScript.A!ml |
| 検出日時 | 2026-10-25 18:14:11.943 UTC、18:16:06.106 UTC |
| 当時の定義 / engine / platform | 1.461.199.0 / 1.1.26090.9 / 4.18.26090.9 |
| 記録上の状態 | quarantined / blocked、remediation success、報告上の実行なし |
| Git上の期待bytes / blob SHA1 | 577351 / 50733f1c2fce41ad13d1be5a410238775f0d6d0c |
| 生成recipe | scripts/build-optimized-lowcap.mjs |
| 既存build記録 | native/optimized/build-optimized-128.json |
| 上流 | rusqsieve 0.5.0 / 4b150834b57636f6ebc350a81321a15c1cd901d2 |
| 既存記録の内部WASM SHA256 | 89edd54d48954c7b0a86c2ba7875e5f36c122bc1ea798872cf2dea7e356ea6b3 |
| 既存再現情報 | clean build一致2回、今回照合したrecipe/source hash20件一致 |
| 隔離実体JSのSHA256 | 不明。Git blob IDや内部WASM digestで代用しない |

2つの検出は同じ相対pathの別checkoutに対応します。検体の内容が同一だったと確認できたという意味ではありません。
固定Rust/patchからの生成という由来は把握済みです。このmetadataと静的監査だけでは、実体との一致や安全性を証明しません。

## 確認してほしい事項

- この検出の調査に必要な情報は何か。検体が手元へ戻せない状態で、上記metadataから受理できる正式な照会方法はあるか。
- 検体SHA256や特定の実体が必須なら、その対象・取扱条件・提出先を明示してほしい。現在の制限内で取得可能とは推定しない。
- 判定根拠について開示可能な情報、解析結果の参照番号、再評価の結論と適用定義版を教えてほしい。
- source-to-artifactのprovenanceや通常のWASM同梱構成について、追加すべき監査情報があるか。保護無効化や広範な除外を前提にしない。

[公式の提出案内](https://learn.microsoft.com/en-us/defender-xdr/submission-guide)と[公式portal](https://www.microsoft.com/en-us/wdsi/filesubmission)を使う想定です。
portalには検体と認証が必要とされており、metadataのみで受付可能とは確認できていません。架空の検体hashやsubmission IDを作りません。
現時点の未解決手続きは、検体を伴わない照会の可否、必要アカウント・利用条件、検体必須の場合の許される取扱手順です。
追加ログイン・規約・権限・送信範囲は、実行時に対象を確認します。検体復元・抽出・再取得・再生成・実行は現在の拒否境界のままです。
