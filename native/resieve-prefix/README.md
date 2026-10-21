# 独立resieve prefix候補

上流・license・compilerはbuild-prefix-1024.jsonで固定する。
long-1024へprefixループ順だけを適用し、追加scratchや係数変更を混ぜない。
[事前契約](../../docs/contracts/resieve-prefix.md)と[実測](../../docs/benchmarks/llm01-resieve-prefix.md)を参照。
oracle.rsは旧実関数との446ケース。性能artifactにはexportを含めず、別probeのみで実行する。
5%gate未達で通常入口へ未採用。原本・初期receiptも保存し削除しない。
