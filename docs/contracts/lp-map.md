# LP map幅縮小の有限比較

基準はPR19 head3826a590cf7e3097c1e1dea4b96a0049bd438995。forestのPrimeMapはu64 LP→u32 vertexを保持し、get/insertだけで使用される。反復順でvertexやcycleを決めない。RSA100の現設定singleLimit471250000はu32内だが、外部の有効u64 LPは維持する。

候補はu32 key mapとu64 key mapの分離。u32::try_fromで範囲検査し、範囲外は元幅のmapへ送る。u64→u32の切捨て、Number経由、LP制限の引下げ、family/vertex/cycle順序の変更をしない。u32用hashは元のu64 SplitMixに拡張して同じキーのhash値を維持する。0/1、u32::MAX前後、同じ下位32bit、u64::MAX、重複と置換、空map、clear相当のdrop、新規sessionを試験する。容量とbytesの合算はchecked演算で過少表示しない。

profile schema2の19fieldsは維持し、mapEntryLowerBoundだけを小map容量×8＋大map容量×16の実型サイズへ修正する。これはallocator metadata/control bytesを含む全メモリではない。補助exportで小/大mapの実len/capacityを観測する。元wire、可逆powers、全counter、canonical列、proper divisor/因子積と確実性、terminal抽出と復元に必要な列、fatal優先、deadline/cancel/全退役は維持する。

同じ上流/patch chain、Rust1.90.0/SIMD128/O3/fatLTO/unshared cap128/256を2cleanで一致させる。旧source/artifact/原本は変更しない。先に旧artifactで新境界probeを失敗させ、候補で境界と40/64桁の全packet/列/counter/因子、post-extract/fresh sessionを確認する。

性能比較は親から静穏枠の連絡後に開始する。RSA100固定64family、4Worker/8枠・ownercredit2、baseline/candidate/candidate/baseline、各180秒、WASM448MiB以内、transport64MiB、PSS1536MiBで停止、開始前WSLとWindows空きRAM各4096MiB以上。計算上限720秒、契約確認30秒を含め750秒。live要求中央値5%以上減、時間1.05倍以下、PSS1.10倍以下、全packet/列/counter一致を採用条件とする。局所payload比だけで採用せず、不成立・失敗も保存する。

長時間確認は別plan/headとして開始前に固定する。まずco256・5Worker・最大1800秒（WASM合計512MiB、co live160/linear208MiB、Chrome PSS1536MiBで保護停止）で成長・行列到達・取消を調べる。必要性が実測で示された場合に限り、別artifactのco1024＋helper64×4（WASM合計1280MiB、明示予算1536MiB）、最大3600秒を1回まで候補にできる。後段は開始前WSL/Windows空きRAM各8192MiB以上、co live640/linear832MiB・Chrome PSS3072MiBで停止し、行列移行の一時保持を静的確認してからplanを確定する。巨大割当で空きRAM限界を探さない。これらは実験専用で自動設定・サイト入口へ適用しない。

長時間試行を追加候補へ無限に拡大しない。今回の残候補はLP mapと有限長枠に絞り、費用に対する全体要求量の減少・正しさ・実際の停止理由で判断する。RSA100のusable/targetは完了予測に使わない。収集完了・大行列・GCD・最終検算を区別し、未完了を成功にしない。
