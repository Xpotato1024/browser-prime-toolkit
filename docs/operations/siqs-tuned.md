# Stage15のビルドと検証

[ADR0015](../adr/0015-siqs-optimization.md)、[固定plan](../../bench/staged-siqs-opt-plan.json)、[実測](../benchmarks/llm01-siqs-opt.md)を対応させます。旧Stage14経路と新Stage15経路は独立です。

外部のsource cacheをPRIME_FULL_SOURCE_DIRで指定し、npm run fetch:reviewed-full-siqsを実行します。元URLから最大2回の有限取得と固定GNU fallbackだけを許し、TLS拒否・サイズ／hash不一致では失敗します。取得済みcacheも検証し、repo内cacheを拒否します。

npm run build:siqs-tuned -- --checkで、固定digestのemsdkをnetwork none、CPU2、RAM2GiB等の既存制限内で2回clean buildし、artifact・map・receiptを照合します。npm run build:siqs-tuned-worker -- --checkとnpm run check:siqs-tunedで静的bundleと全raw報告も検査します。native検証はnode scripts/build-siqs-tuned.mjs --nativeです。ASan等は元Cの検査であり、WASM LTO挙動は実Chromeで別に検査します。

CHROME_BINを指定し、node scripts/verify-siqs-tuned.mjs --engine base --out /outside/base.jsonと--engine ltoで12契約を検査します。計測headをPRIME_MEASURED_HEADへ記録します。停止・cancel・noncooperative deadline・不正memory・巨大horizon・関係式改ざん・OOM／trap退役・fresh回復・cross-stream cycle／重複除去を含みます。

新protocol15は60000msまでです。60001msは確保前に拒否し、旧protocol14の15000ms経路は維持します。1／2 Worker各256MiB、同一seed1/11と合計workを使い、common graphを再検証します。初回assetの後はserver停止・CDP offlineで計算し、通信検知のpositive controlを終了後に実行します。

再測定はclean committed HEADでnode scripts/benchmark-siqs-tuned.mjs --stage all --out-dir /new/outside/pathを実行します。既存結果への上書きは拒否します。short24条件は15秒／合計20億work、long4条件は60秒／合計1兆workで、失敗rawも残します。候補選択を結果に合わせて変えず、長試行は事前固定の複合比較として扱います。

npm run report:siqs-tunedは測定headとsource hashes、plan・保存bytes・native proof・全raw/log・契約証跡を結合します。npm testとnpm run checkを最終headで実行し、独立reviewと同head CIを確認します。旧38試行を更新せず、Ready化・merge・公開・release・deploy・サイト接続は別の判断です。
