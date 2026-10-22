# Full SIQS の次段階profile
現stageの計算source・rawを変更しない、後続の調査候補です。[固定原本](../../native/siqs-full/staged-upstreams.json)と[実測](../benchmarks/llm01-staged-full.md)に基づきます。速度損失率や改善倍率は未測定です。

- sieve.c/sieve_core.cのpollは旧strict patchの1回だけです。new full一般passによる二重挿入ではありません。
- RSA100のCwork109872280576は、stride1024の周期largeTick107297149回に相当します（phase/tailは別）。C側poll、C→JS、budget.now/clock・pulse判定の内訳を測る根拠になります。checkpointはCPU命令数やsieve値数へ換算できません。
- runtimeはcache_size1=32768でgeneric32k coreを選択します。64kもbuildされますが今回の経路では選びません。
- 優先する区分はbucket生成、小prime/root更新、large bucket更新、64byte scan、候補のtrial division、残余base2判定、SQUFOF、poll/clockです。元のSIEVE_TIMINGは分類の出発点で、WASM向け時計と観測擾乱は別検証が必要です。
- C内の有界counterをまとめて返す診断を先に検討し、イベント毎のJS通知追加を避けます。A/derived-poly/blocks/hits、full/1LP/2LP、残余大小reject、base2reject、SQUFOF成否、graph vertices/components/cyclesを分けます。

## 原本から分かるLP条件
sieve.cはSLP上限を最大FBprime×large_mult（32bit飽和）とし、315..332bitのparameterではlarge_mult=150です。DLPはbits>=282で有効になり、残余上限はSLP^1.8です。DLPの各因子は31bit、SLPは32bitの制約を持ちます。RSA100ではDLP有効ですが、今回の72/80桁群は閾値未満です。異なる桁の実測を同じLP modeの比較とは扱いません。

usable relationはfull+edges+components−verticesです。RSA100のfull498+graph由来9=507であり、partial36638をusableへ加算しません。phase3の表示だけでは関数別CPU割合は分かりません。bucket準備とscan等はphase境界の位置が異なります。

common/smallfact/squfof.c内部loopは現在のinstrumented Cwork集合に含まれません。前半のMAX_CYCLES100000と逆形式while loopは別区間なので、残余分解の時間・無応答区間の診断対象です。独立host deadlineとWorker退役は維持します。

今回のRSA100はnnz=0でmatrix未到達です。Lanczosだけの変更、LP cutoffの調整、poll粒度の変更が有利だという実測根拠はまだありません。会計、finite bound、host terminate、未知trapのfatal分類を保ち、変更する場合は別versionで現rawと比較します。
