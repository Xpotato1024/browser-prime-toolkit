# ADR0013: 大整数向けの独立sparse SIQS
状態: private Draftの実装段階。本人の「大整数でもSIQSなどを使えるようさらなる改良」を最優先とし、Brentの追加長時間試験を停止した。先行原記録と旧profile/source/artifactを変更しない。

初期対象は奇数64〜332bit・100十進桁までとする。RSA-100は100桁/330bitで含む。2048bit SIQS対応を主張せず、RSA-110等の範囲外はunsupportedとする。msieve固定commit c8727d91305bdbe0972d160ef0ce61dd02ce9193の原本とpublic-domain noticeを保持し、元のmp_tを利用する。MAX_MP_WORDS30=960bitに対し、332bit入力とmultiplier後の中間積を監査し、上限だけを広げない。

新native/siqs-largeと専用Worker/ABIを設ける。上流poly/sieve/relation filter/sqrtと既存の上流Lanczosを利用する。旧1024行のdense snapshotを廃し、relation cycleから疎なodd row listを作る。返却dependency64本は元relationから行ごとのuint64 XORで独立再検算し、X²≡Y²と非自明な約数も検査する。行数100000・列数150000を有限上限とし、列を黙って切り詰めない。

factor base最大100000、prime list200100を原本のsegmented sieveで生成する。relation/save・多項式・sieve blockも明示上限へ分離し、全加算/積のoverflowを格納前に検査する。線形探索だった割当追跡を有限hash ledger/free listへ変え、pointer所有権・二重free・OOM・realloc・cleanupを試験する。savefileはmemory bufferだけで、filesystem/storage/networkへ出さない。

WASMはinitial=max512MiB、growth/pthreads無効、stack4MiB、managed heap384MiB、save128MiBを含む。全Chrome RAMは別に標本観測し、JS全体hard capとは区別する。1 request/1 Worker、3/30/180/600秒のhost deadline、初期化5秒、cleanup/proof込みとする。Cは有限100億のuint64 checkpointを持ち、1024ステップごと・phase境界で時計を確認する。hostは独立にterminateでき、自動再起動しない。短いunflushed tailも請求する。

先にnative ASan/UBSanで100桁ABI境界、64bit counter、巨大rowのsparse parity/dependency、各phase停止、割当失敗/overflowと回復をTDDで確立する。固定Emscripten imageのoffline clean build2回を一致させ、原本/patch/recipe/artifact/imports/memory hashを保存する。unknown trapはfatalとしてWorkerを退役し、資源上限・時間切れ・素数未証明を分離する。

RSA-100と事前固定した均衡半素数を同一端末/Chrome/seed/予算/1 Workerで再評価する。既知因数を投入せず、生成oracleは計算後だけに照合する。旧native Brent、旧128bit SIQS、ECMと段階選択の対応範囲/上限を隠さず、ECMを100桁均衡半素数の主要解法とは決めない。probableはprovenへ変換せず、積と素数確度を別記する。

Alpertronの固定原本も候補として保持するが、GPL-3.0-or-later・依存一式・finite Lanczos/UBSan・純計算入口の監査が必要で、静的確認だけで採用/速度除外しない。今回の第一実装は既存pinと再現buildを使えるmsieve sparse経路とする。公開/CSP/配布/license採否/Ready/merge/deployは含めない。
