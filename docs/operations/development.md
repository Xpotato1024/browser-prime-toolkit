# 開発手順

Node 24.19.0 / npm 11.19.0 を使用します。npm ci、npm test、npm run check を実行してください。
依存はありません。package-lock.json は環境を再現するため管理します。
AGENTS.md と関係する契約を読み、文書・テスト・実装の責務を分けて変更します。

1. 挙動と境界の契約を先に記述します。
2. 実体のある失敗テストを走らせ、red の終了値と件数を記録します。
3. 最小実装で green にします。
4. 責務を整理して再実行し、green を保ちます。
5. 数値境界の独立レビュー、最終headのCIを確認してDraft PRで返します。

npm run check は構文、UTF-8/BOM/改行、ローカルMarkdownリンクを検証します。
CIはtestとcheckのみです。push / PRからdeploy、release、公開を行うworkflowはありません。
実装PRのmerge、Ready化、公開、既存サイト組込、資格情報・権限変更は別途承認が必要です。
