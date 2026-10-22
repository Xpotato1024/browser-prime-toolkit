# graph保持・並列・数値hot pathの評価手順

旧PR18のsource・raw・履歴を保持し、専用namespaceで候補を比較する。入力範囲、exact BigInt、因子積と確実性、cancel/deadline、Worker/source解放、初回asset取得後通信ゼロの契約は維持する。

## ソースと原本

固定上流はrusqsieve0.5.0、commit4b150834b57636f6ebc350a81321a15c1cd901d2、archive SHA86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c。Dockerは既存のdigest固定image、rustc1.90.0。各build scriptは原本全hashを検査し、隔離した2clean buildを一致させ、compiled source/flags/role hardcapをreceiptへ残す。新依存は導入しない。

| 段階 | 変更 | 対照 |
| --- | --- | --- |
| Stage25 | 固定幅Natural rootからcanonical bytesへの保持圧縮、graph計測 | 観測のみbaseline |
| Stage26 | 抽出をterminal化しforest/seenA/bufferを先に解放、行列段階の不要配列解放 | Stage25 root圧縮 |
| Stage27 | forest edgeのroot/powers/LPを1個のBoxへ保持 | Stage26 |
| Stage28 | 1 ownerで最終prefix・列SHAを揃える抽出比較、名前付き同一コードCPU診断 | Stage25/26 |
| Stage29 | 4/8 reservation枠を先に比較し、4/5/6 Workerを比較 | Stage27・数学条件同一 |
| Stage30 | reciprocal/u128経由のu32剰余をRust組込み剰余に置換 | Stage27・同じscheduler |
| Stage31/32 | 同じ5計算ownerの集約専用対照、600秒と取消 | combined/legacyと選定候補 |
| Stage33 | powersの可逆varint保持 | packed+builtinの同じ64family |
| Stage34 | resieve剰余省略とdense16KiBを独立比較 | varint+builtin、どちらも不採用 |
| Stage35 | 4familyだけのindex差分サイズ診断、選定Workerの依存整理 | 追加codec不採用、role sourceのbyte一致 |

各契約はdocs/contracts/graph-*.md、固定planはbench/staged-graph-*-plan.json。全trialの予算を先に固定する。manifestのHEAD・plan/driver hash、raw/log hash、実読込assetと補助source hashを結び、accepted prefixのpacket SHA・canonical column SHA・全native countersを検証する。計測中にビルド・別の計算試行は行わない。失敗は上書きせず、新しい試行IDと原因・差分を残す。

## 再現

```sh
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-profile.mjs compact
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-release.mjs release
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-arena.mjs packed
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-profiling.mjs names
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-builtin.mjs 64
PRIME_RUS_SOURCE_DIR=/outside/reviewed/source node scripts/build-graph-builtin.mjs 256
npm test
npm run check
```

ChromeとNodeを固定し、計算試行前にhost余力を確認する。`scripts/benchmark-graph-*.mjs /outside/new-output-directory`は既存manifestを上書きしない。CPU rawはrepo外だけへ保存し、repoにはbounded summaryとSHAを残す。名前付きWASMはcustom以外の全sectionsを元artifactと一致検証する。samplingは15秒でstopを要求し、実測25秒を超えれば失敗。samplingのself/inclusive比率はCPU利用率や全工程時間予測ではない。

## 安全停止と解釈

coordinatorのlive requested160MiBまたはlinear208MiB、Chrome PSS1536MiBで停止する。これは次の単一呼出の急増やOSのタブ終了を保証するものではない。requestedはallocator metadata/断片化/stack/staticを含まず、WASM linear上限はJS/輸送/Chrome RSS/PSSの上限ではない。巨大割当による空きRAM探査はしない。

旧Stage25計測runnerはfatalより先にsoft-stopを検査する問題を履歴として保持し、後続専用runnerでfatal優先を修正した。旧原本のallocationFailuresは全て0で、この修正で過去のOOMを成功へ読み替えない。高メモリfatalを模したprotocol回帰で分類を検証する。

accepted family/列/counterが違う試行のメモリや全工程時間は厳密な同条件採否に使わない。Stage26の4 owner予備試行はdrainで最終prefix360/362となったため、Stage28の1 owner最終prefix一致対照を追加した。予備試行も保持する。

RSA100の収量/targetを全工程進捗率や単純な完了時間予測へ換算しない。物理スマホ・Safari・Firefoxや、RSA100の大行列経路を小さい対照入力の成功で代替しない。サイト側のCSP・capability・license・long-compute受入と本番切替は別工程。

## 最終入口の固定検証

[最終契約](../contracts/optimized-final.md)と[固定plan](../../bench/staged-optimized-final-plan.json)に従い、scripts/benchmark-optimized-final.mjs /outside/new-directoryを実行する。既存directoryを再利用せず、source guardがHEAD bytes・両source map・tracked/staged cleanを各trial前後に検査する。測定中に文書/配布sourceを編集せず、build/test/downloadを重ねない。npm run check:graphが全raw/source/plan/driverの歴史結合と生成報告も検査する。
