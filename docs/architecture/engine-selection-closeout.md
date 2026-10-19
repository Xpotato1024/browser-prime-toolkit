# Engine候補を絞る判断と公開前の境界
状態: PR6の非公開設計候補。根拠はPR3〜5の固定測定で、公開承認ではありません。

## 候補と採否
| 方式 | 提案 | 根拠・制約 |
| --- | --- | --- |
| native BigInt Brent | 小さい入力の既定候補 | PR4の10桁因数群は1秒8/8、中央値17.80ms。101 controlは0.45ms。pure native WorkerならWASM初期化不要 |
| GMP/ECM | 大きい入力の第一候補 | PR5のfresh比較で13桁8/8・96bit4/4、112bitは2/4。32曲線/B1=2000/B2=200000の有限探索 |
| 限定MPQS | 明示選択の補助候補 | PR3の11〜13桁群は速いが10桁群は20多項式上限で6/12。48〜85bit残余限定、balanced性は入力から判定不能 |
| GMP Brent | 自動選択から除外 | PR4でnativeより改善せず、WASM初期化と混在licenseの負担を追加する根拠がない |
| 有界SIQS | 今回の性能採用を見送る | PR5で一般半素数の1秒完了0。安全な最小実行は成立したが上流Lanczos全体の性能限界とは扱わない |
| GNFS/CADO | 短期採用を見送る | 多段relation/matrix・再開・資源・browser portを要し、今回の根拠がない。browser不可能という判断ではない |

[MPQS/並列](../benchmarks/llm01-wasm-mpqs.md)、[Brent/ECM](../benchmarks/llm01-gmp-ecm.md)、
[SIQS/fatal/RAM](../benchmarks/llm01-bounded-siqs.md)を履歴として参照します。
異なるrunの中央値を同時比較のspeedupへ変換しません。既知入力を再測定して結論を強めません。

## 小さなselectorの意味
[ADR0006](../adr/0006-conservative-engine-selection.md)を先に固定しました。
selectEnginePlanは正規化した入力全体が2^64未満（64bit以下）ならbrent、
2^64以上2^256未満（65〜256bit）ならgmp-ecmを返します。
共通工程で小因子・MR・平方を処理し、そのalgorithmを全余因子に使います。
0/1はneither、2^256以上はeligible=false/selector-rangeで、素数・分解不能とは推定しません。

これは運用上の保守的な提案で、最適閾値や因子balanceの推定ではありません。
大入力に小さい因子がある場合はnativeが速いこともあり、ECMが常に最速ではありません。
新しいauto algorithm・条件学習・入力cache・隠れfallbackは追加しません。
純粋selectorが既存optionsを返し、既存core/proof/result contractをそのまま使います。
実装は評価用です。公開する既定方式・最大受付bit数を本人が選ぶまで製品の自動選択にはしません。

## 時間・Worker・RAM
- 共通Budgetは一つで、前処理・全余因子を含みます。内部再試行で時間/操作枠をresetしません。
- selector既定の計算枠は1000ms/1M checkpoint。holdout比較は明示50Mで、既定の成功保証ではありません。
- 初期化deadline5000ms、計算枠、配送猶予100msを分離します。名目envelopeは計算枠+5100msです。
  初回HTTP asset取得、parse/受信後の有限proof検証、OS/GC/event-loop遅延まで含む厳密wall上限ではありません。
  holdoutはinitialization、ready後wall、requestWallを別記録し、cold取得も別記録します。
- controllerは取消/timeoutでterminateし、古い世代を無視します。ECM fatalはerrorで退役し、明示restartのみです。
- 既定候補は1 Worker。native-onlyはWASM線形0、ECMはhard64MiB/stack1MiBです。
  nativeのJS heap/browser RAMが0という意味ではなく、JS heapのhard上限は提供しません。
- 2 Workerは既存の明示的portfolio実験だけです。ECMの線形合計128MiB、総操作枠分配と全lane破棄が必要です。
  PR4では一部で計算時間が短くなりましたが、初期化・待機再生成・全体RAMを含む製品上の優位は未証明です。
  2本の実測peak RAM/mobileがないため、hardwareConcurrencyで自動的に2本へ増やしません。
- PR5の1本所有でもChrome process-tree標本PSS517.82MiB（ready後初期406.48MiB）でした。
  shared RSS重複、終了済みWorkerのGCを含みます。線形64MiBをアプリ全体RAM保証にはしません。

## Holdoutと推論の限界
方針固定後の6入力を既存corpusとの非重複で固定し、1秒・seed23・各1回だけ、
selector/native-only/ECMの18計算をfresh Workerで比較します。
小さい因子は計測外の独立exhaustive uint64 trialで証明します。
M127 controlはruntimeのmr-fixed7によるprobableであり、今回素数証明を追加しません。
単発6問は実装・予算・失敗表示の確認で、統計的な成功確率や最適閾値の検定ではありません。
結果を見てpolicy・seedを調整せず、旧342+72等の長い比較は再実行しません。

mr64は2^64未満の固定基底でprovenを再検証します。より大きい通過値はprobable、
未解決余因子はunknown/compositeの未完了で、推定素数へ変換しません。
固定MR基底にランダム試験の誤り確率上限を付けません。証明書が必須なら今回のengineでは要件未達です。

## 公開license・再リンク配布の具体的判断
現状UNLICENSEDのままで公開しません。選択肢は以下の2つです。
1. native＋限定MPQSを先行候補とし、独自codeの公開licenseとpublic-domain/Emscripten通知を確定する。
2. ECMを含めるなら、GMPの選択条文とECMの混在条文・header/inline・無個別表記のsourceまで含めて結合物の配布条件を確定する。

[固定原本/条文目録](gmp-ecm-source-review.md)、[GMP LGPLv3本文](../../vendor/gmp/COPYING.LESSERv3)の3/4節、
[ECM通知](../../vendor/gmp-ecm/COPYING.LIB)と[COPYING](../../vendor/gmp-ecm/COPYING)を具体的な確認対象にします。
ECMにはLGPL-3.0+/LGPL-2.1+に加えGPL-2.0+/GPL-3.0+表記のheaderがあります。
「WebAssemblyだから動的リンク」「LGPLのみだから配布可」という結論を出しません。

承認対象の配布案には、全採用原本・変更patchとhash、bridge/probe/JS binding、
固定compiler image/flags/tool原本、NOTICE/LICENSE、対応sourceと再リンク手順を含めます。
静的WASMでは、変更したlibraryとapplicationを再結合し、WASM bytesからworker assetを再生成できる材料を示します。
公開pin検証を緩和せず、利用者の変更buildで必要なmanifest/hashを再生成する手順を別途実証します。
sourceを一部だけ置けば十分とは扱わず、結合物のlicense選択と再リンク材料を本人が承認してからreleaseを設計します。
今回はsource archive/release/upload・license変更を行いません。

## サイトlong-compute契約の具体的判断
根拠は[保存済みサイト契約](../contracts/site-adapter.md)の確認日2026-10-18と記載commitです。
別タスクcheckoutの再確認は自動承認レビューに対象外として拒否され、今回再確認していません。
現行mainが今も同じとは断定せず、親が対象を承認して最新契約と照合してからsite PRを作ります。

| 判断対象 | 提案・公開前に必要な確認 |
| --- | --- |
| manifest/schema | v1一括緩和を避けlong-compute profileを別審査。Worker=1、ECM時WASM=64MiB、初期化/計算/配送枠を別fieldへ |
| input/output/message | 公開受付bit数（128bit先行か256bit評価範囲か）と、入力/因子/残余/progressの実bytes上限を最終distで検証。既存65536/262144上限を無言で拡張しない |
| CSP/asset graph | nativeもWorker許可が必要。ECMは固定local WASM/Blob source/hashとcompile許可をtool routeだけで審査。remoteや全体unsafe-evalを追加しない |
| 通信/navigation | 初回取得とready境界を定義。計算・取消・再起動は通信0、server停止offlineで同一結果。通常サイトnavigationを維持 |
| lifecycle | loading/ready/running/complete/probable/incomplete/cancelled/error/disposed、job/世代/元入力、unmount時terminate、再入・2instanceのadmissionを確認 |
| total budget | 本人が「submitからの総待ち時間」か「ready後の計算枠」かを選ぶ。新しい全request deadlineが必要ならcontroller側へ別設計し、現在の名目envelopeだけで約束しない |
| RAM/parallel | 1 Workerを既定候補。線形上限と全体RAM標本を別表示。複数tool instanceの合計所有数も別制御し、2 Workerとmobileは必要性を本人が判断した場合だけ追加検証 |
| 配布/license | native先行かECM採用か、application公開license、対応source/再リンク材料/NOTICEの配布先と方式を承認。toolからのfile/download capabilityは勝手に有効化しない |

本人に残す決定は、ECMを含む公開条件、公開受付範囲と許容待ち時間/RAM、
probableを許す表示か素数証明を必須とするか、2本実験を続ける必要性です。
これらが未決の間はprivate Draftで止めます。無制限な方式portや追加benchmark探索は続けません。
承認後も実装可能範囲は既存core・選定済みWorker・別審査のsite adapter/profileまでで、
任意桁の高速分解・prime certificate・厳密全体RAM/リアルタイム保証は含めません。

selectorはbrowser capabilityを判定する公開loaderではありません。
WASM未対応時のECM初期化はerrorとし、黙ってnativeへ切り替える契約は追加していません。
native-onlyのWASM不要は独立Worker試験で確認しますが、他browser/低性能端末の対応保証ではありません。
