# 縮約行列構築前のfilter配列解放

[事前契約](../../docs/contracts/matrix-memory.md)に従う独立候補。旧Native/patch/測定headは保持する。

固定rusqsieve0.5.0 commit `4b150834b57636f6ebc350a81321a15c1cd901d2`、原本SHA `86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c`、Rust1.90.0/SIMD128/O3/fatLTO/unshared1024MiBはStage38と同じ。[上流通知とlicense](../rusqsieve/README.md)、[source offer](../../SOURCE_OFFER.md)を維持する。upstreamはApache-2.0 OR MPL-2.0、local patch/observerはAGPL-3.0-onlyで、上流全体のrelicenseではない。

変更するcompiled fileはf2/mod.rsだけ。owned reduced_cols完成後に5つの不要filter配列をdropし、既存の有限phase枠へmarker26を1件追加する。元matrix/columnsと復元用eliminations/alive_cols、fallback分岐は保持する。旧long patchを改変せず呼び出す。

[2clean receipt](build-matrix-1024.json)は439882bytes、SHA256 `ecbcf8878302be7c743b487572dd24927b9bb10ba466775aed7d727f56142b52`。小さい初期memory・1024MiB hardmax、Native quota640/linear事前832MiBを保つ。巨大割当による試験はしない。

```sh
PRIME_RUS_SOURCE_DIR=/absolute/verified/source node scripts/build-matrix-memory.mjs 1024 --check
node scripts/check-matrix-memory.mjs
node --test test/matrix-memory-native.test.js
```

初回buildの出力directory未作成による失敗はローカルlogへ残し、builderのdirectory作成を修正して2cleanを再実行した。赤→緑は実Native64桁のproper divisorと、marker22→26の実live減で確認した。比較gateと採用判断は未測定であり、artifact生成だけを採用理由にしない。
