# 入力・操作・進捗の整理（未公開候補）

基点はv0.2.0／488ee538855110be3c718e2e03490bb1da53bf12。
今回はtoolkit GUIのローカル変更と検証。公開v0.2.0のtag／assetsやSite consumerは変更しない。

## 表示と責務

- 入力欄は入力だけを囲み、その下にcanonicalな桁数・bit上限を短く表示する。
  完走保証でないこと、入力形式、方式・負荷・資源制限は「使い方・計算の範囲」にまとめる。
  通常309桁／1024bit、高精度100桁／332bit、大メモリ121桁／400bitのpolicyは変更しない。
  大メモリの333bit以降が実験的であることは短い上限表示にも残す。
- 常設の「入力・結果を消去」を外し、「入力例・実行条件・分解する」を一つの操作列に置く。
  狭い画面や拡大時は折り返し、16px以上の文字・44px以上のタップ領域を維持する。
- 進捗欄は最初から表示する。待機時は「待機中」と静止した中立バー。
  準備・計算・検算・中止の未計測区間は不定表示、関係収集だけ実測割合を使う。
  収集目標到達は全体完了にしない。終了・異常時は動かない中立バーと結果／エラーを示す。
  バーの中立値0は計算全体の達成率ではなく、待機／終了の非計測表示である。
- 中止操作を進捗見出しの右へ置く。操作の入れ替えによるダブルクリック取消を避ける。
  工程・件数更新でfocusやscrollを動かさず、結果通知は既存の一つのqualified statusへ渡す。
- 入力を編集・空欄化した場合も、既存結果を「前回」と明示する。
  過去の所要時間も「前回の実経過」とし、コピーは元の入力と状態に結び付いたままにする。
  次の実行で新しい結果へ更新する。削除ボタンの代わりに計算sessionを勝手に再生成しない。
- 準備失敗は既存retryで入力を保持して回復する。
  資源解放を確認できない異常では、消去や新計算で隔離を迂回せず再実行を禁止する。

計算方式・検算・入力policy・予算・Worker実装・capability・CSP・外部依存は変更していない。
SiteのDemo.astro／ToolReleaseNotice／後続MDXの順序はSite側の責務で、このbranchでは触らない。
ライセンス文書と対応ソースは配布物に保持し、GUIへ別のライセンス表示を複製しない。

## 検証

- 要件のred: 初期進捗欄と三つの操作列の検査が旧実装で失敗することを記録。
- 関連site試験93件成功。入力境界、旧結果との結合、コピー、focus、取消・退役、準備retryを含む。
- actual distのChrome155受入23件成功。初期待機、3操作、IME、dialog、コピー、取消・unmount、
  280／320／393pxと200%文字拡大、短時間ms表示を検査する。
- 既存の限定routing16ケースで、方式単独controlとBrent→ECM→SIQS遷移を検査。
  正常系列14 Worker／URLすべて退役し、ready後通信0。400bitは期限停止で、完走実績ではない。
- 追加のローカル画面検証ではlight／dark、280／320／390／1280px、通常の編集・再実行・
  中止・unmount、注入した準備失敗とWorker生成異常を確認。
  正常系列は各themeの7 Worker／URLすべて退役、通信0。
  Worker生成異常の注入では安全な再実行禁止を確認し、回復成功や資源確認成功とは扱わない。

lightは公開Siteのcomputed tokenをfixtureへ保存して使う。公開Siteはdark media指定でも
light tokenだったため、darkは明示したhost semantic-token fixtureであり、実Siteのdark受入ではない。
スクリーンショットを実ピクセル確認した。スマホ幅のheadless検査を実機iOS／Androidの確認とはしない。
実Safari／Firefox／WebKit、物理keyboard・screen reader、Site実統合・公開後受入は未実施。
全体test/checkとremote CIは今回の検証結果へ含めない。

追試には既存の外部Playwright／Chromeを指定し、未使用の出力先を使う。

~~~sh
node --test test/site/*.test.js
node scripts/site-font-text.mjs --check
node scripts/build-site-release.mjs /tmp/prime-gui-dist
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_BIN=/path/to/chrome TEST_BROWSERS=chromium \
  node scripts/verify-site-cross-browser.mjs --dist /tmp/prime-gui-dist --out /tmp/prime-gui-browser.json
~~~

生の画面・追加harness・失敗を含む検証ログは非配布の検証フォルダ
prime-gui-streamline-evidence-20261030に保存する。producerへのpush／Draft PR、新版release、
Site固定更新・merge・deployは今回のローカル成果に含めない。
