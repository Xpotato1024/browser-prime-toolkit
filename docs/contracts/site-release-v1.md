# 素因数分解機 0.1.0 の配布・サイト受入契約

2026-10-22 の本人承認により、toolkit の GitHub Release v0.1.0 と site の PR111 → PR110 → 組み込みPR → 実物受入 → 本番配信を対象にする。npm公開、資格情報作成・権限拡大、保留記事、無関係なPRは含めない。

配布物は @xpotato-tool/prime-factorizer、React island API v1、React/ReactDOM19.2.8 peer のみ。root package は private を維持し、配布 package には scripts/runtime依存を含めない。生成は既存選定済みソースから依存graphだけを .mjs 化し、任意コード・研究raw・棄却engineを新規採用しない。entry/CSS/全実行file/ライセンス・対応ソース説明をbytes/SHAで固定する。別clean checkout2件の生成hash一致と独立review・最終headCIがリリース条件。

通常は既存p64 staged selector、軽い入力はBigInt/Brent経路。高難度は optimized、明示大メモリは selected-wide（係数1選定）を使う。prefix順序等の棄却候補へ切替えない。UIは100桁かつ332bit・4096文字まで、0/1を別扱いし、因子積/確度/残余を既存verifierで確認する。結果文字列には全桁・未証明・未完了を表示する。

自動は保守的な最大2Worker、端末情報なしは128MiB/1Worker。通常軽量は最大1Worker/128MiB/60秒。高難度手動は有限の役割別上限・全体768MiB以下/最大6Worker/600秒、wideは明示手動1536MiB予算・co1024/helper64・最大5Worker・3600秒。WASM領域はRSS/JS/ブラウザ全体のRAMと異なる。queue/packet/credit・memory soft-stopは既存選定契約を維持し、空きRAM探索や無制限実行をしない。

readyは配布moduleと埋込Worker/WASMがローカルで利用可能な状態。入力別Worker初期化は計算の時間枠に含む。ready後はBlobから固定workerを作り、fetch/remote import/telemetry/storageを使わない。取消/timeout/reset/unmount/pagehideでWorkerを退役しBlob所有権を解放する。解放未確認は次計算をblockする。2instanceのID/stateは独立。同一Documentでは共有leaseでactive jobを1件に制限し、退役確認まで次jobを開始しない。退役不明はDocument寿命のquarantineとし、React remount/BFCache復帰で解除しない。

siteの既存v1は維持し、分解機の固定source/pinに限定した別profileを追加する。AGPL-3.0-only本体・Apache選択rusqsieve・既存staged runtimeの権利/対応ソースを保持し、静的版/出典/条件表示からアクセス可能にする。worker-src blob: とWASM compile用の限定CSPだけを当該routeへ追加し、connect-src none/通常navigationを維持する。Worker内のrequestも実ブラウザとHTTP traceで確認する。

受入は実配布distで整数/指数/境界/不正入力/因子積/残余、online/offline、ready後通信、取消/再開/reset/unmount/2instance/画面遷移/worker終了、desktop/mobile viewportの低桁入力、license/source表示を対象とする。実機mobile未測定はviewport試験と区別する。既存5Worker全工程改善率を新規主張しない。
