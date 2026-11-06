# 0.2.4 ネイティブ進捗描画の修正版

修正PR42のソースheadは `8b60e9d1898dd64412616c1682a9c9aa550d5b23`。ホストの `border: 0 solid` がnative progressの配色へ干渉する問題を、既存ゲージ規則の `border: revert` で修正する。通常完了と未証明結果は紫で満杯、取消・時間切れ・新入力の状態とネイティブのアクセシビリティを維持する。計算・上限・文言・依存を変更しない。

package、lock、adapterの表示版を0.2.4へ揃える。最終headで全体テストとcheckを実行し、別々のclean checkoutから2回ビルドして全ファイルを比較する。実配布物のstandalone／共通リセットhostとサイトの最終ビルドで、Linux Chromium／Windows Edgeの実ピクセルを直接確認する。ブラウザーの強制色emulationは無着色native controlと比較し、OS実設定や実機mobileの検証とは区別する。

新しいタグ対象の完全な対応ソースZIPと全追跡Git blobを照合し、ライセンス・provenance・独立レビューを保持する。runtime ZIP、source ZIP、SHA256SUMS.txt、RELEASE-PROVENANCE.json、browser acceptance JSONの5資産を公開し、匿名取得とハッシュ照合を行う。main／tagのCIはexact commitとeventで確認する。旧タグ・公開資産は上書きしない。サイトは共通installerで新pinへ更新し、既存Draft PR154を維持する。サイトのReady化・マージ・本番デプロイは行わない。

Firefox・Safari・実機mobile・実OSのハイコントラスト設定・実スクリーンリーダーは未検証として報告する。npm公開は行わない。
