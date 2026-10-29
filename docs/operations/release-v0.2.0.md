# 0.2.0 の分岐・進捗GUIリリース

本人の2026-10-29承認により、fcfb6707の共通routing/入力拡張/GUI/停止理由と関連検証修正を正式版へ統合する。
機能追加を区別するminor版0.2.0とし、React island API v1/manifest schemaは維持。
GNFS/CADO/qlattice実験はrepo外に保存したまま含めず、Site採用・配信は別担当へ固定artifactで渡す。

通常の既定は309桁/1024bit受付。N<2^128の小入力経路、有限Brent前処理、ECM（256bitまで）、
残余に対するSIQSの共通routingを使う。高精度は332bit。
明示大メモリは121桁/400bit、333..400bitはSIQS実験経路・均衡半素数の全分解未検証。
大メモリは既定ではなく1536MiB/有限最大1時間を維持。受付と完全分解を分ける。
GNFS-unavailable/有効engine枯渇/時間/取消/メモリ推定softstop/Worker異常等を誤分類しない。
位相の進捗はその工程内だけを表し、未測定区間に全体完了率・ETAを付けない。

公開main99133842との差分は既存19コミットと版/対応source説明。新しいengine依存やGNFS native sourceはない。
全体test/checkを含むfcfbの9workflow/26jobは既存証跡であり、新release headへ流用しない。
新PR/push、通常merge後main、注釈付きtag各exact実体の全CIを確認する。
保護規則・review approvalを迂回しない。既存v0.1.0..0.1.5タグとassetsを上書きしない。

最終tag targetの独立した2clean checkoutからdistを生成し全ファイルhashを照合する。
配布distで入力/因子積/残余/確度/経過時間/進捗/取消/Blob・Worker退役/通信制約を限定実ブラウザ検証。
SOURCE_OFFER/LICENSE/NOTICE/追加license群、complete tracked source ZIP、manifest/provenanceを対応付ける。
tag CI成功後GitHub Releaseのみ公開し、匿名readbackで全assetsのSHA256を照合する。
npm公開、Siteコード編集/merge/deploy、資格情報/権限/CSP/監視変更は対象外。

成果はversion、target commit/tree、dist/source ZIP、checksums、manifest/capability/source/provenanceの
正確なURLとhash、CI、受入証跡をSite担当へ渡す。実機mobile/400bit完走/最速・最大級は主張しない。
