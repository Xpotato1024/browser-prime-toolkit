# 0.2.6 公開CSS設定の追加

PR47の入力枠・区切り線と開閉見出し余白APIを正式配布する。旧APIと既定表示を維持し、数値engine・Worker・入力上限は変更しない。Siteが固定採用している0.2.5は公開タグ未作成の候補版だったため、既存pinを上書きせず新しい0.2.6へ進める。

最終headの全体test/checkとHosted CIを確認し、固定Node 24.22.1の独立clean checkout 2組からbyte一致する配布物を作る。完全な対応source ZIP、runtime ZIP、SHA256SUMS、provenance、実browser受入記録を新規releaseへ公開し、匿名readbackを確認する。既存release資産を変更しない。

Siteは共通installerの独立reviewとexact pinで採用し、採用PRをmerge後に停止する。本番配信・資格情報・権限変更・npm公開は行わない。実機mobile、Safari、Firefox、支援技術は今回のdesktop検証に含めない。
