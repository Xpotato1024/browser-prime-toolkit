# 収集終了後の不可逆な抽出移行

Stage25の可逆root保存を基準に、収集状態と行列中間配列の寿命だけを変える別系列です。
旧graph-profileのsource・artifact・原本は変更しません。新しいsourceをcommit固定してから計測します。

収集終了は不可逆で、抽出を1回試みた後はtarget未達やLA失敗でも再開しません。
WASMは再抽出をstatus10、終了後submitをu32::MAX（JSのi32戻り値では-1）で明示的に拒否します。
family順、重複A排除、列のroot/sign/full exponent/LP平方情報、元行列でのdependency検証、
独立BigIntによるproper divisor検証を維持します。累積graph統計は停止前に固定し、
実際の現在保持量は別のcapacity snapshotで表します。

収集停止時にforest、buffered、seen-A、path scratchを解放します。
matrix_colsはCSC/CSR構築後に解放します。filter配列はfallback solverの直前、
または縮約行列構築後に解放します。元matrix、縮約matrix、eliminations、alive_colsは
dependencyの復元・元matrixでの検証に必要な間保持します。shrink_to_fitは使いません。

固定phaseは収集停止前後、matrix_cols、CSC/CSR、filter adjacency、filter完了、
縮約構築前後、solver前後、GCDを記録します。requested live/peakとlinearは別に扱い、
linearは解放後も縮まないことを明記します。最大16枠で、無制限ログをnativeに保持しません。

最初の比較は既存の40桁・64桁の対照入力で各30秒以内、baseline/release/release/baseline。
同じcolumn SHA・全カウンター・proper divisorを要件とし、64桁のpeak requestedを10%以上削減、
完了時間中央値が10%超悪化しない場合を採用条件にします。
WASMはcoordinator256MiB/helper64MiB、4 owners合計448MiB、transport32MiB/4枠を維持します。
開始available4096MiB、coordinator live160MiB/linear208MiB、Chrome PSS1536MiBのsoft stop、
cancel・deadline・退役・fresh recoveryを維持します。RSA100のLA完了はこの対照で代替しません。
