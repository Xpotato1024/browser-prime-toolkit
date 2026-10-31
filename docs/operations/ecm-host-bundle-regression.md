# ECM Workerのhost bundle回帰

報告入力: 11451419198101448524859159549219459514145142112（47桁・154bit）。
公開toolkit0.2.1/Site6bf8bae4ddabe23c2d20f52a83fa24e5e0628f65でChromeスマホ幅/PC幅ともworker-errorを再現した。
nativeが2^5・3^2・19を抽出後、ECM Workerがready前にerror結果を返す。
同じ0.2.1の非bundle配布物では通常1秒枠のまま完全分解できた。

## 原因と生成契約

runtimeのFunction.toStringで輸入関数とWorker本体を組み立てたため、host minify後の名前cn/snが
独立したBlob Workerの外側を参照する。公開Blobの保存原本と非bundle対照で確認した。
エラーがcatchされworker-errorへ変換されるため、ページ未処理例外としては出ない。

ECM Workerはproducerのビルド時に固定文字列へ生成する。host bundlerへ関数の再serializeを依頼しない。
生成入力は既存GMP splitter、既存GMP bytes、ECM Worker runtime。source、generatorとinput hashesを
配布provenanceのrecipeへ含め、checkおよびsite buildで生成物の陳腐化を拒否する。
GMP/WASM・パラメータ・time/work/memory上限・proper-divisor検証・Worker退役・停止理由は維持する。
公開版0.2.1の資産を上書きせず、この変更はローカル候補に留める。

## 検証計画

改名前提のserialize回帰は実Worker/WASMで現行2件失敗を確認した。
固定生成後に同じ試験、実minify後の報告入力、積と各因子の独立検証、取消/再実行/unmount/通信/解放を確認する。
本物のWASM初期化失敗はworker-errorのまま保持する。mock結果を実計算の成功とは扱わない。
Site PR130、push/PR/release/Site公開は対象外。実機iOS等の未検証範囲は区別する。

## 現在確認した結果

- 公開ページ: Chrome155の390px/1280pxでworker-errorを再現。Workerは2本とも退役し、ページ未処理例外なし。
- 原版の配布物を直接実行: 同じ1秒枠で完全分解。ECM文字列内の改名参照が原因であり、入力上限やtime予算の問題ではない。
- serialize改名fixture: 修正前2件失敗、固定生成後は実Worker/WASM3件と既存ECM protocol7件成功。
- esbuild0.28.2（既存のMIT検証tool、依存追加なし）でbundle/minify後の7ケース成功。
- 完全分解、取消、fresh run、unmount/fresh mount、全18Worker/URLの退役、ready後HTTP0を確認。
- Pythonの独立64bit素数判定と任意精度整数の積検算により、以下の因子と元入力の一致を確認。

11451419198101448524859159549219459514145142112
= 2^5 × 3^2 × 19 × 1051 × 240677 × 9082579814087837 × 910891597356395779

任意のhost optimizer一般や実Siteへの採用完了を主張しない。公開ページは未変更。
実機iOS/Safari/Firefox等は未検証。将来の新patch配布とconsumer採用後は、実Siteでも再度受入する。

## 再現コマンド

- node scripts/build-routing-ecm-worker.mjs --check
- node --test test/routing-ecm-serialization.test.js test/routing-ecm.test.js
- node scripts/build-site-release.mjs <fresh-external-dist>
- 既存のESBUILD_MODULE（0.28.2）、PLAYWRIGHT_MODULE、CHROME_BINを明示し、
  node scripts/verify-site-host-bundle.mjs --dist <dist> --out <fresh-external-json>

最後のscriptは検証toolを別途供給する。download/installや本番アクセス、Siteの編集・公開は行わない。
任意のbundle変換の全種類ではなく、実際に検証したminifier条件を記録する。

## 0.2.2の公開工程

上記は初回のローカル診断・修正の履歴。本人の公開承認後、[0.2.2配布](release-v0.2.2.md)として
新規固定版のCI・対応ソース・配布物を検証する。旧0.2.1の上書きは行わない。Site採用は別工程。
