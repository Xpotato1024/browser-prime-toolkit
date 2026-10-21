# resieve prefix のループ順だけを変える有限比較（Stage42）

Stage40の現行1Worker・先頭4family計測ではresieve49.08%、score35.81%。
Stage41の係数1は時間-1.93%で初回5% gate未達、word rankは+1.14%で不採用。
これらの原本・artifact・契約を保全し、次の独立候補だけを比較する。

candidate-major prefixのループをprime外側・candidate内側へ入れ替え、
同じprime/root/pinvの再読込とMAX除外の反復を減らす。係数2、tailのroot走査、
builtin u32剰余、上流SIMD、候補列・bitmap・48因子上限は変えない。
各candidateのfactor indexは昇順のまま。overflowは全candidateへ累積ORし、
一候補のoverflow後も他候補の因子を処理する。短絡・早期returnを導入しない。
追加配列・総メモリ上限変更・数学の近似・既知因子を導入しない。
stridedなcounts/factorsアクセスで遅くなる可能性も測る。

実装前にこの契約をcommit。別namespaceの2clean artifactと別oracleを作り、
旧実関数との446ケース（境界・MAX・重複・48/49/48・一候補overflow時の他候補継続）、
Native40/64の全packet/列/counter/正常な因子、Chrome共通22契約を確認する。
最終候補headを固定し独立読取レビュー後に性能計測する。
既存の計測sourceを上書きせず、過去headの原本検証を維持する。

RSA100先頭4familyをbaseline/candidate/candidate/baselineの4試行、
1Worker、各90秒＋退役予備30秒、全体最大480秒。条件は上流0.5.0固定、
Node24.19.0/実Chrome155、Native hardmax1024MiB/手動1536MiB、8slots、
輸送64MiB、credit2、WSL available4096MiB以上、Chrome PSS1536MiB未満。
初期memory<=2MiB、取消・deadline・退役・通信ゼロを維持。別build/計測と並行しない。
時間中央値比<=0.95、PSS比<=1.10、全packet/列/counter一致を初回gateとする。
通過時は別prefixの有限確認を設計してから採用。未達時も原本と負の結果を保全する。
4familyからRSA100全工程の所要時間を外挿しない。これで改善余地ゼロとは扱わない。
大規模方式やcompiler更新へ無条件に広げず、残る費用と期待利益で次の判断を行う。

PR24 db37e0dのローカル581tests/checkは完了。最終CIは確認中。
merge/release条件は未成立、サイト本番切替・権限・資格情報・端末設定は変更しない。
