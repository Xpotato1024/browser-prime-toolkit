# ADR0010: 全桁と確度を保持する非公開UI
状態: private Draft向け。2026-10-19の直接依頼に基づく実装。公開サイト・CSP・配布licenseは変更しない。

数値入力v1とgroupFactorPowersを再利用し、parseIntegerInputのcanonicalをselectValidatedStagedPlanで検査してから既存runSelectedStagedRequestへ渡す。表示入力と計算範囲は別であり、受理値は0 <= n < 2^128。Number/parseFloat/toExponential/Intl.NumberFormatへ整数値を変換しない。指数入力は厳密整数へ展開し、結果・コピーには全桁十進文字列を使う。

- src/ui/result-view.js: verifyStagedOutcome後に表示用plain dataを作る。重複は昇順のbase/exponentへ集約し、構造化supで指数を表示、コピーは2^5形式。指数1を省略する。
- complete/probable/incomplete/cancelled/neitherを区別する。未解決余因子は「未解決」と明示して式に含め、素因数と認定しない。probableには素数証明ではない旨を表示・コピーする。
- src/ui/session.js: 正規化した提出値を固定し、同時1request。中止中もowner解放まで次を開始しない。dispose/pagehideでabortし、遅い応答を無視する。fatalを別方式へfallbackで隠さない。
- src/ui/mount.js と app/: native semantic DOMの依存なしprivate画面。フォームlabel、説明、入力error、status/live、keyboard操作、結果のmath accessible name、読み取り専用選択欄を用意する。値はtext nodeで生成しinnerHTML/TeXを評価しない。長い数値はwbrで改行機会を作り、text/コピーの桁を変えない。
- 1requestは既存初期化込み1000ms/5千万checkpoint/1 Worker。固定WASM合計128MiBの費用と、性能・素数性の保証範囲を表示する。UI入力/DOM/clipboard処理は計算requestの外。
- コピーはユーザーclickでcanonical式と確度/未解決理由をplain textへ。clipboard不可/拒否なら同じ文字列を選択可能なtextareaへ出す。古いコピーの非同期完了で新しい表示を更新しない。
- 新しいruntime依存・保存・telemetry・remote script・CSS/CSP変更・React/site adapterは追加しない。既存比較用asset/測定raw/source pinは不変に保つ。standalone previewは127.0.0.1でのみ提供し、製品配信経路ではない。

TDDは純粋view（2^53前後/完全冪/重複/probable/partial/0/1）→session（範囲/取消/二重実行/遅延/fatal）→実browser DOM・clipboard・AX・keyboard・小画面とengine統合の順。実browserは取得後にasset serverを停止し、既存のCSP検査条件を変えず通信ゼロを検査する。最終headのtests/check/CIとread-only独立レビューまで行う。

後続の性能指標は「公開RSA factoring challengeのどこまでを初期化込み30秒で解けたか」。一次資料による入力・名称・十進桁数・bit数確認、既知因数を探索に使わない、固定端末/browser/Worker数、複数反復の成功率/中央値/rangeと未完了、積と素数確度の検査を別計画へ記録する。128bitを超える対象は現行engineへ流さず、必要な資源・算術・原本・受入試験の設計変更を先に報告する。UI完了前のRSA性能測定は行わない。
