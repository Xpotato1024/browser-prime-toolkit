# 有限resieve追試

上流rusqsieve0.5.0 commit4b150834b57636f6ebc350a81321a15c1cd901d2（Apache-2.0 OR MPL-2.0）。
ローカルpatch/oracle/adapterはAGPL-3.0-only。既存NOTICE/source offerを維持する。

[契約](../../docs/contracts/resieve-followup.md)、[全実測](../../docs/benchmarks/llm01-resieve-followup.md)、
各build receiptが2clean・同一image/compiler/flags/sourceを固定する。
resieve1とrankは独立した時計なし1024MiB artifact。どちらも今回の5%gateでは未採用。

再ビルド：検証済cacheをPRIME_RUS_SOURCE_DIRへ設定し、
node scripts/build-resieve-followup.mjs resieve1 または rank。
--probe にtask/prime-stage41内の新しい絶対保存先を指定すると、旧新関数比較の別artifactを作る。
node scripts/check-resieve-oracle.mjs で443ケースずつ（886）を確認する。
probe exportは性能artifactから除き、旧source/receiptを変更しない。
