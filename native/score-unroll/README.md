# 独立score 4回展開候補

上流・license・compilerはbuild-unroll4-1024.jsonで固定する。
既存2回展開へ4回本体を前置する単独候補で、上流SIMDや数学を独自発明と扱わない。
[事前契約](../../docs/contracts/score-unroll.md)と[実測](../../docs/benchmarks/llm01-score-unroll.md)を参照。
oracle.rsは旧helperを明示参照する旧scoreと574ケースを比較する。
dense128ケースではscoreと繰越rootも一致させる。性能artifactにoracle exportを含めない。
5%gate未達で通常入口へ未採用。追加配列・メモリ上限変更・サイト公開はない。
