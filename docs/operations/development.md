# 開発手順

Node 24.19.0 / npm 11.19.0 を使用します。npm ci、npm test、npm run check を実行してください。
npmの追加runtime依存はありません。review済みvendor sourceとcompiler runtimeは固定同梱します。package-lock.json は環境を再現するため管理します。
AGENTS.md と関係する契約を読み、文書・テスト・実装の責務を分けて変更します。

1. 挙動と境界の契約を先に記述します。
2. 実体のある失敗テストを走らせ、red の終了値と件数を記録します。
3. 最小実装で green にします。
4. 責務を整理して再実行し、green を保ちます。
5. 数値境界の独立レビュー、最終headのCIを確認してDraft PRで返します。

npm run build:wasm -- --checkは固定Docker imageで2回のbyte一致を確認します。npm run verify:nativeはCのsanitizer試験です。
npm run check はWASM source/artifact hash、構文、UTF-8/BOM/改行、ローカルMarkdownリンクを検証します。
CIは単体・実browserのtestとcheckのみです。push / PRからdeploy、release、公開を行うworkflowはありません。
実装PRのmerge、Ready化、公開、既存サイト組込、資格情報・権限変更は別途承認が必要です。

Docker daemonがdefault /tmpを参照できない環境ではWASM_BUILD_TMPを共有workspace内へ明示します。CIもgithub.workspace内のfresh一時領域を使い、各build終了時に自身の領域だけを削除します。固定image、network=none、source hash、2回一致の条件は維持します。
