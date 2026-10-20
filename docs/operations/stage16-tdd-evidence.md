# Stage16 検証記録

新profileの初回REDは未作成moduleのimport失敗でした。生成Worker未作成による中間失敗も保存し、profile-green.logの2件成功をGREENとしています。旧600秒上限、超過入力のWorker生成前拒否を確認しました。

計測head7a33c533403403e62216a3c551c3769cbca58af2でunit261件、静的check918項目、base/LTO各Chrome10契約が成功しています。mode0の実際のfilter／行列／平方根経路を40・64桁で通過しました。旧mode2輸入R検証へ読み替えません。

固定6試行後、別head3ab1a82225d3aa33354460ead8719da586249b8aの追加診断で、既存sieveBlocks4,000,000上限を同一native workで確認しました。原本C・WASM・上限・元6試行は変更していません。診断契約10件も成功しています。

[証拠manifest](../benchmarks/archive/validation-logs/staged-full-opt-stage16/manifest.json)はactual RED、中間失敗、GREEN、計測headのunit/check/Chrome結果をSHAで保全します。[生成報告](../benchmarks/llm01-full-opt.md)がraw・source・commit・因数積・通信0・全owner退役を照合します。

最終報告headのunit/checkと独立レビューは別途実行します。GitHub CIはprivate枠上限の確認待ちで停止し、未確認を成功扱いしません。公開・統合・releaseは未実施です。
