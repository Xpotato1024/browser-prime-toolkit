# ブラウザ完結GNFSの導入判断

2026-10-28。比較基準はローカル3b0151110eea5e9b96ec9add8e582eba841576c1。
これは静的な実装適合性の評価で、GNFSのWASMビルド・実行・速度測定ではありません。
現行ルーティング／GUI／資源policyは変更していません。

## 判断

GNFSは大きい一般合成残余に対する次の研究候補として残します。
今回の判断は「未採用・工程を切り出す実証が必要」です。
400bitでSIQSより速い、何桁から最適、現在のメモリで完走できる、とはまだ言えません。
入力受付1024bit、因子探索、全分解能力は別です。
ECMの現行256bit上限もGMP adapterの能力境界で、数学的なECMの上限ではありません。

短期は[共通ルーティング](../contracts/common-routing.md)を維持します。
受理済み因子を保持して合成残余ごとに再計画し、有限Native／Brent、利用可能ならECM、
次に既存SIQSへ進みます。ECM prefix250msは[局所実測](../benchmarks/llm01-routing-micro.md)による暫定値です。
332／400bitは実装能力の境界で、SIQS対GNFSの性能上の切替点ではありません。
400bit超の未解決合成残余は引き続きgnfs-unavailableです。未実装GNFSを選ぶ条件を追加しません。
均衡かどうか・最小因子の大きさは未分解時には通常分かりません。
既知因子のベンチマーク属性を実行時のoracleとして使いません。

## 現在ある実装と候補原本

- native／GMP ECM／msieve SIQS／rusqsieve SIMD SIQSの既存経路を保持。
  scripts/build-full-siqs.mjsはNFS_OBJS=を明示し、GNFSをリンクしません。
  vendorの選択済みmsieve原本もtinyqs／mpqs等で、GNFS一式を取り込んだものではありません。
- CADO-NFSは全工程の候補。公式の現行homeはGitLabで、GitHubはmasterのmirrorです。
  文書参照を[692ecb7e62f0f3bdab88ee44cc60b8ded0ea1a1b](https://github.com/cado-nfs/cado-nfs/tree/692ecb7e62f0f3bdab88ee44cc60b8ded0ea1a1b)へ固定しました。
  これは資料参照のpinであり、コードの導入承認・ファイル単位ライセンス監査・再現buildの完了ではありません。
  [README](https://github.com/cado-nfs/cado-nfs/blob/692ecb7e62f0f3bdab88ee44cc60b8ded0ea1a1b/README.md)は
  C++20/GMP/Python/Unixツールを要求します。
  Pythonのserver/client制御をbrowserへ丸ごと載せず、計算kernelとJS coordinatorへ分ける案を優先します。
  「85桁超を主対象」という説明は、このSIQSとのmatched crossover測定ではありません。
- CADOの[公式配布説明](https://cado-nfs.gitlabpages.inria.fr/)はLGPL-2.1-or-later。
  実際の採用範囲の各header、依存GMP、compiler runtime、変更ソース、対応object／再リンク条件を確認してから配布を判断します。
  現行AGPLアプリの許諾を第三者コードへ上書きしません。
- [msieve公式](https://sourceforge.net/projects/msieve/)はC/SIQS/GNFSとPublic Domainを掲げます。
  既存の固定mirror c8727d91305bdbe0972d160ef0ce61dd02ce9193の
  [Readme.nfs](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/Readme.nfs)には古い版の制約が混在します。
  そこにあるline sieve／lattice sieveや約97桁の説明を、現行公式版の完全性や推奨切替点として扱いません。
  現行版の必要工程・個別条件を固定して再確認するまでは副候補です。

環境確認ではlogin PATHにemcc/clang等はありませんが、既存buildが使う
emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8
のローカルimage存在をmetadataのみで確認しました。pull/build/runはしていません。
toolchain不在が阻害という結論にはしません。GNFS用に監査・固定・取り込み済みの
工程ソースとbrowser ABIがまだないことが、実kernel試験の具体的な前提不足です。

## 工程ごとの移植案

下表は設計上の評価で、実測済みの資源量・速度ではありません。

| 工程 | WASM／Workerへの分割案 | 先に確認する制約 | 正直な進捗 |
| --- | --- | --- | --- |
| 多項式選択 | 固定seed／探索範囲ごとに独立Worker。採点・選択はcoordinator | GMP／portable算術、探索重複、候補保持数、期限内の良さと探索終了を区別 | 試行候補数と有限探索枠。得点を全分解率にしない |
| 関係収集 | 固定多項式と範囲IDで分担。有限packetとcredit、transferで返す | 2側の関係式とideal表現、重複排除、bucket量、取消を返せる最大片 | 検証済み関係数と現在の目標。目標増減や不足は表示 |
| フィルタ | 収集Worker退役後に専用Workerへ移行 | 重複表／singleton除去／mergeの同時保持、relation→matrix対応 | 入力量と処理済み件数。同じ分母のpass内だけ割合 |
| 線形代数 | 初回はsingle-thread Worker。将来の共有parallelは別build | 行列cache生成、Krylov列、作業vector、checkpointと行列の重複peak | 既知の反復枠の処理量。未確定の必要反復数は不定 |
| 平方根・GCD・最終検算 | 依存関係候補ごとに有限処理しproper divisorを返す | 数体側の平方根とrational側の対応、trivial gcd、失敗候補の保持 | 処理した依存候補数。最後の積／素数性／解放確認まで完了にしない |

SIQSとGNFSの関係式・ideal・平方根は同じdata schemaではありません。
既存SIQSのgraphやLanczosへそのままpacketを渡せるとは仮定しません。
portは既存のjob ID、stage、単調sequence、共有deadline、正確なprefix検算、
有限disposeの境界へ接続します。中間relationを因子候補として表示しません。
新しいGNFS内工程のlabelは、実装時に現在のprogress viewへ追加します。
異なる工程の比率を足した全体パーセントやETAは作りません。

## ピークメモリ・通信・保存

既存wideの1536MiBは総WASM割当上限です。JS heap、転送、ファイル、
browser RSSを含む端末全体の上限ではありません。既存policyを今回書き換えません。
GNFS候補では別途、WASMに加えて所有するJS配列・輸送・中間ファイル・
工程移行時の重複と安全余白を含む有限のjob envelopeを設計して、入らなければ開始を拒否します。
1536MiBをそのenvelopeの候補にする場合、WASMへ1536MiB全部を配り切れません。
小試験で測る前に具体的な最大桁数や行列容量へ変換しません。

[CADO BWC文書](https://github.com/cado-nfs/cado-nfs/blob/692ecb7e62f0f3bdab88ee44cc60b8ded0ea1a1b/linalg/bwc/README)は
cache構築が定常時の2〜4倍程度を必要とし得ると説明します。
文書自体に更新頻度の注意があるため、現行kernelの測定値でも全GNFSの一律係数でもありません。
元関係式・縮約mapping・行列・cache・vectorの同時生存を測り、
工程終了ごとに手放し、上限到達前に保護停止します。
WASMの割当拒否、所有buffer上限、Worker異常は区別し、
catchできないOS側のtab終了を防止できるとは主張しません。

[Emscripten filesystem](https://emscripten.org/docs/api_reference/Filesystem-API.html)の
MEMFSはメモリ内なので、CADO中間ファイルを無制限に写す案は採りません。
最初は保存なし・有限bufferで検証します。IndexedDB／IDBFSによる保存再開は
現在の非保存契約を変更する別機能です。IDBFSの明示sync／autoPersistとquota・消去を含めて設計し、
今の検討だけで有効化しません。

初回取得後は同梱固定資産だけで計算し、CADOのserver/client通信やremote job取得は除きます。
独立Worker案はSABを必要としません。
[Emscripten pthreads](https://emscripten.org/docs/porting/pthreads.html)を採るなら
SABとCOOP/COEPを要し、thread有無は別buildです。既存CSP／headers／権限を今回拡張しません。

## 次の小規模実証と採否条件

これは次工程の提案で、下記のGNFS計算はまだ実施していません。
候補ソース・依存・個別license・固定toolchain・移植差分をレビューし、
外部ソフト実行の対象を確定してから段階的に進めます。

1. CADOの工程kernelと依存graphを固定し、single-thread WASMの最小ABIを別の非公開評価入口でbuild。
   初回は1 Worker、WASM最大256MiB、JS／file／transfer最大128MiB、所有job envelope最大512MiBを試験候補とする。
   残り128MiBは移行・監視余白で、browser／OS全体の保証値ではない。
   kernelがこの候補枠に収まらなければ停止して記録し、勝手に拡張しない。
2. 上流の小さな正解付きfixtureを固定し、各工程の入出力照合・境界・取消・期限・退役を個別試験。
   1試行のjob上限30秒、hostの回収上限35秒、最大6試行を最初の候補とする。
   累計計算枠180秒を超えず、失敗／timeout／必要メモリも残す。
   小さすぎる入力をRho／QSで処理してGNFS成功としない。実際に多項式→収集→filter→行列→平方根を通った記録が必要。
3. 小fixtureで全工程の因子積・proper divisor・独立素数性確認と取消／再実行／資源解放を通す。
   保存再開は別の明示した試験範囲とし、未実装なら対応を名乗らない。
4. その後、同一の入力・CPU・Worker・メモリと総deadlineでSIQSと比較する計画を固定する。
   多項式選択、初期化、最終検算、解放を含む総時間と各工程時間を分ける。
   既知最小因子サイズと均衡性を分け、ECM前処理の効果も別にする。
   小試験の成功を400bit一般入力や速度優位へ外挿しない。

採用条件は全工程の正しさ、ピークが有限枠内、取消・回収、固定資産のみでの通信ゼロ、
既存UIの段階表示、対応ソース提供が成立することです。
性能上の自動切替はその後のmatched比較でのみ決めます。
今回の進展はこの実行順と前提の特定までで、GNFSを公開adapterへ追加したものではありません。
