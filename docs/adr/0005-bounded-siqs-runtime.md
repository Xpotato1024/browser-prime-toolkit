# 0005: 有界 SIQS 実行の評価境界
日付: 2026-10-19。状態: 実装前の評価契約。

固定msieve commitのself-initializing polynomialによるsieve/poly/relation/sqrtを使います。
最小リンクのmatrix解法は1024行・1024列までのGF(2)消去adapterとし、
上流block Lanczosの完全port・性能とは区別します。GNFS短期見送りは維持します。
残余64〜128bit、relation16000、savefile4MiB、A多項式2048、
derived多項式32768、sieve block65536、管理heap32MiBを初期上限案とします。
実行前に上限を固定し、超過を成功や素数の推定に変換しません。

malloc/calloc/realloc/freeの全採用呼出しを検査し、所有割当をjob単位で追跡します。
正常・予算・容量・割当失敗の各終了で解放し、段階別checkpointを設けます。
固定stack配列は格納前に容量を確認します。arena上限だけで安全とは扱いません。
同一instance再利用は停止・失敗後の積/状態・漏れ検証を通過した場合だけにします。
WASM trapは汚染instanceを再利用せず、hostがWorkerを終了し、新規初期化で回復します。

ECMはstage2到達を実コードに計装し、到達後の取消を専用に検証します。
OOMとtrapは正常解放・instance破棄のどちらで安全を確保したかを分けて記録します。
上限は線形メモリ・管理heap・所有Worker数とbrowser全体の実測peak RAMを区別します。
初期化、計算、回復を別計測し、固定問題群の成功率と実時間を併記します。
不変runtimeの過去測定は再利用し、変更した経路だけを必要に応じて再測定します。

独立レビューと最終CIを要し、PR4依存の評価Draftとして提出します。
site/UI統合・公開license・配布・Ready・merge・deploy・資格情報変更は対象外です。
