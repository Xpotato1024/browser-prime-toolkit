# 狭幅のサンプルと結果表示（2026-10-24）

## 観測と診断

利用者提供の iOS Brave 画像2枚を取得して画素確認した。画像・認証付き添付URLは非公開の作業領域だけに保存し、このリポジトリや配布物へ含めない。画像では native select の説明付き選択肢が本文幅を超え、結果では実経過30msと設定上限1秒等が同じ段落に並び、因子判定も文章内に連結されていた。画像だけでは DOM 幅・zoom・OS popup の寸法は測定できない。

正式 v0.1.2 の Site 固定成果物をローカル配信して再現を調べた。デスクトップ WebKit 26.5 の mobile/touch context で、実在する最後のサンプル `1000036000099` を選択し blur すると、393px viewport に対し document scrollWidth=516px、tool clientWidth=346px / scrollWidth=492px になった。これは DOM の横あふれであり、OS popup の寸法測定ではない。100桁と長い日本語の追加ストレス選択肢でも再現した。Firefox 151.0 では同じ通常選択で tool のあふれはなかった。

## 変更

- 長い説明付きサンプルを native details と通常の button のリストに変更。ページ内で折り返し、入力だけを変更する。自動実行や入力への強制フォーカスはしない。短い技術設定の native select は維持する。
- root / field の最小幅を抑える。OS popup に CSS が効くという前提は置かず、global overflow clipping とズーム制限は追加しない。
- 実経過を独立した実測欄へ、時間上限・経路・Worker/WASM 上限を別の disclosure へ分離。測定区間と、上限が実測使用量ではないことを明示する。
- 因子判定を native ul/li の1因子1項目にし、重複度・probable・余因子・停止理由をコピー本文にも保持する。結果 textarea を内容に合わせ、コピー操作との間隔を確保する。
- 数学的検証・入力上限・予算・依存・Worker 実装・runtime policy は変更しない。heavy view への groups/residual 追加は、既に検証した値の表示形式だけを変更する。

## 検証

presentation / mount の変更前の失敗を確認し、実装後の対象21テストが成功した。測定値30msと設定1秒の分離、重複度・100桁probable・20項目・余因子・停止理由、0の扱い、コピー拒否時の選択と focus を含む。

指定 Node 24.22.1 / npm 11.19.0 の全 `npm test -- --test-concurrency=1` は634/634成功、約298秒。追加の長時間負荷試験は行っていない。

Windows Node 24.14.0 / Playwright Core 1.61.0 で desktop Firefox 151.0 と WebKit 26.5 を順番に実行し、各13ケース成功。280/320/393pxと文字サイズ100/200%、100桁と長い日本語、10因子の実結果と accessibility tree、keyboard、コピー成功/拒否/未対応、有限WASM、cancel/rerun/dispose を確認した。各10 Worker / 10 Blob URL を作成し、すべて解放。ready 後の HTTP 要求、計測対象 network/storage API、page error は0。

検証した暫定 runtime artifact は72ファイル、5,018,424 bytes、artifact SHA-256 `e07ae5cf5245c7f895b10e8014397951825aa0421bf83c85dee2f8aaf641ccd1`。これは非公開の開発候補で版表示は0.1.2のまま。正式 v0.1.3 の公開物ではない。再実行は `scripts/verify-site-cross-browser.mjs --dist <fresh-output> --out <private-report.json>`（別途固定した Playwright Core を `PLAYWRIGHT_MODULE` に指定）。

実 Site の HTML/CSS と候補 mount を組み合わせた私的ハーネスでも、320/393/480pxと文字100/200%、開閉・focus/blurで両engine各24観測すべて tool の横あふれなし。ただしこのハーネスは React hydration を除外している。320px/文字200%では既存ヘッダーの mobile-navigation が document を約364〜367pxへ広げる問題が残る。tool 自身の幅は240/240pxで収まっている。この既存 host 問題を利用者画像の原因と断定しない。

## 未検証・公開保留

最初の候補は2 clean buildで全ファイル一致したが、Siteのcanonical artifact checkerが `li + li` を既存のCSS許可文法に反するとして拒否した。余白指定を `li` と `li:first-child` に置き換え、validatorの許可範囲は拡大しない。上記artifact hashはこの最初の候補の履歴であり、修正後の配布hashには使用しない。

実 iOS/Android、iOS Brave の native popup / soft keyboard / autozoom、BFCache、実読み上げソフト、OS clipboard paste と native 拒否ダイアログは未検証。accessibility tree の確認を実 screen reader の受入とは呼ばない。WebKit の物理的ネット切断も未検証で、restrictive CSP と通信観測を用いた。

新修正の独立レビュー、正式版の最終 CI・2 clean build・source/provenance・ライセンス・公開hash・Site結合の受入は別の完了条件。Cloudflare 側の自動配信設定もまだ読み取れていない。push / merge / tag / Release / 配信は保留する。

v0.1.2 タグ CI の初回 Native validation 失敗と同一source再実行成功、原因未確定という履歴は維持する。この表示変更で解決したとは扱わない。
