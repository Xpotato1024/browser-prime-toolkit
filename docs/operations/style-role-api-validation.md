# 入力枠・区切り線APIのローカル検証

2026-11-10。未配布候補。数値kernel・Worker・上限・release versionは変更しない。

- TDD: 新規 `test/site/style-roles.test.js` は変更前2件失敗、実装後2件成功。
- `npm test`: 955件成功。使用したWSLのNode 24.14.0 / npm 11.9.0はpackageの固定24.22.x / 11.19.xとは異なるため、固定toolchainでのHosted CIを代替しない。
- `node scripts/verify-style-roles.mjs --out <repo外のreport.json>`: Windows Edge 156.0.4314.58で12条件成功。320/1440px、文字100/200%、単体・旧borderのみ・role別設定を検証。
- 実CSSでcomputed border、summary padding、44px以上の領域、横overflowなし、Enterで反復開閉、focus outline、forced-colorsのautoを確認。白背景との入力枠コントラストは単体5.15:1、例示したrole別6.28:1。
- 320px/200%と1440px/100%の実スクリーンショットを目視。濃い入力枠・淡い区切り線の区別、summaryの折返しとfocus枠、文字や操作の欠けがないことを確認。
- このfixtureは実source CSSと意味的な静的DOMの検証。計算engine、最終release/site統合、実機iOS、読み上げ支援技術を検証したとは扱わない。
- CIのprivate-ui jobへ同じ検証を追加し、共有Chrome起動・終了管理とentrypoint inventoryで検査する。

最終の固定toolchain Hosted CI、source release、Site採用は別段階。マージ・release・本番配信を行わない。
