# 関係式収集の独立候補

上流rusqsieve0.5.0 commit4b150834b57636f6ebc350a81321a15c1cd901d2、
Apache-2.0 OR MPL-2.0。ローカルpatch/oracle/adapterはAGPL-3.0-only。
既存NOTICE・source offerを維持する。

[事前契約](../../docs/contracts/collection-candidates.md)、
[全実測](../../docs/benchmarks/llm01-collection-hotpath.md)、
各build JSONがsource/compiler/image/flagsと2clean一致を固定する。
performance artifactは時計importなし、WASM最大1024MiB・初期2MiB以下。
resieve4/sparseは独立した候補で、今回どちらも不採用である。

再ビルドは検証済み上流cacheをPRIME_RUS_SOURCE_DIRへ設定し、
node scripts/build-collection-hotpath.mjs resieve4 または sparse。
Dockerはnetworkなし、CPU2・memory2GiB・権限なしの既存compiler helperを使う。
外部oracle保存先を --probe で指定すると旧実関数との診断exportを持つ別artifactを作る。
probe artifactをperformance Workerへ渡さず、node scripts/check-hotpath-oracle.mjs
で435ケースずつ確認する。公開baseline・旧artifact・証跡を上書きしない。
