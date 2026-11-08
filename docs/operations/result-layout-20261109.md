# 結果表示・ヘルプ整理の検証

[表示契約](../contracts/result-layout.md)に従い、分解式の枠内へ44px以上のコピー記号を移動した。名前とtitleは「結果をコピー」で、成功・失敗はlive statusで伝える。因子判定・計算詳細と一般ヘルプを別のまとまりにし、サイト側の未完了・未証明の説明を移した。

数値計算、入力上限、Worker、時間・メモリ上限、確度、コピー本文は変更していない。版表示・package・lockは0.2.5に揃える。タグ・GitHub Release・npm公開はこの変更に含めない。

## TDD と実行結果

LLM-01 Desktop Commander、WSL Ubuntu-24.04 login bash、Node24.22.1/npm11.19.0で実行。

- red：追加した構造・名前・説明・成功通知テストのみ失敗。mount-focusは23成功・1失敗。分解式とコピー操作を囲う要素が存在しないことを確認。
- green：mount-focusは24/24成功。既存の失敗時選択、前回結果、取消、遅延コピーによるフォーカス奪取防止を維持。
- 全体のnpm testは870/870成功。npm run checkで生成物・UTF-8/BOM/LF・ソース整合を検査する。
- scripts/verify-result-layout.mjsを実生成distへ適用し、Chromium149.0.7827.55で7ケース成功。320/390/1280px、309桁結果、200% CSS zoom相当の再配置、タッチ、キーボードEnterとfocus-visible、コピー成功・拒否、因子の展開と本文選択、説明の独立開閉、新結果での通知消去を検査した。ページエラー0件。
- 390pxと200%相当の実PNGを直接確認し、式と記号の非重複・全桁折り返し・説明区分を確認した。ブラウザー本体のズーム操作、実機mobile、Firefox/Safari、実スクリーンリーダーの受入は未実施。
- 独立エージェントによるread-only source reviewでは具体的な回帰指摘なし。最終headと配布候補を別途照合する。

## 再現

外部の固定PlaywrightとChromeをPLAYWRIGHT_MODULE、CHROME_BINで指定する。build-site-release.mjsの出力を--dist、証跡の保存先を--outとしてverify-result-layout.mjsへ渡す。追加のapplication依存はない。

サイト採用は最終commitの2回clean build一致、manifest/provenance、独立reviewの固定を経て既存installerで行う。公開済み0.2.4を上書きしない。マージ・公開・デプロイは別の承認範囲である。
