# 組込み剰余の比較

Stage30: CPU sampling（同じ非custom WASM sections、実測14.967秒）でsieve_one_polyがself83.2%、u128 multiply helperも合計約7%を占めた。source上のfastmodはu32 residueをu64/u128積で求めている。WASMの標準u32剰余に置き換える候補を比較する。整数型・除算/剰余アルゴリズムを自作しない。Rustの`a % p`（pはfactor-baseの非零prime）だけを使う。

数学パラメータ、family範囲、順序、LP限度、分類、GCD、因子検証は固定。coordinator/helper双方を同じ変更にし、hardcap256/64MiBを維持。旧artifactは保持。2clean build一致とsource/toolchain/hashを記録。

先に32bit境界・ランダム10000組をWASM実体で既存reciprocal法と比較し、full40/64のaccepted packets/canonical columns/counters/factors一致を確認。次にRSA100固定32family、4Workerでbaseline/candidate/candidate/baseline、各最大120秒、計算予算8分。中央値5%以上改善、全prefix証跡一致、PSS<=1.10倍、取消/期限/Worker解放成功が採用条件。負の結果も残す。速度結果をRSA100完了時間へ外挿しない。使用するglobal slotsはStage29の採否が確定後、その同一値を両方に固定する。
