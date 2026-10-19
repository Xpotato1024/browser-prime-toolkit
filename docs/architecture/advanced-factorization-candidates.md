# 高性能化候補と採否
調査日: 2026-10-19。採用候補と性能保証を区別します。
PR3の限定MPQSに続き、PR4で低位GMP Brent/ECMを比較しています。最終エンジンの選定ではありません。

## 入力による方式の違い
小因子には試し割り・Brent Rho・ECM、一般の balanced 半素数には QS/SIQS、
さらに大きい一般入力には GNFS を候補とします。p−1 の滑らかさや因子の近さを
利用する方式は特殊条件に依存するため、単一の有利な入力で速度を代表させません。
この区別の根拠は [HAC 第3章](https://cacr.uwaterloo.ca/hac/about/chap3.pdf)です。

| 候補 | 適用・制約 | 今回の扱い |
| --- | --- | --- |
| native BigInt + Brent/Floyd | 小さい因子を見つける比較基準。大きい balanced 入力では試行数が増える | 同じ corpus と壁時計予算で測定 |
| msieve tinyqs MPQS | 公開ドメイン。元実装は実用上85ビットまで、最大20多項式。SIQSではない | 固定ソースをWASM化し測定 |
| GMP低位API + Brent | 旧版の一時値生成・手製剰余合成を避ける算術改善候補。方式自体はRho | PR4の別評価bundleで実装。最終採用は比較後に判断 |
| ECM / GMP-ECM | 因子サイズに依存し、unbalanced入力の前処理として有望。曲線とstage boundsが必要 | PR4の固定libraryを非公開評価。混在する個別条文と未確定の公開配布方針を別記 |
| full msieve SIQS | balanced大入力の次候補。GMP、relation収集、matrix、取消境界が必要 | PR4で固定13ファイルから8objectを生成。未リンク・未実行、有界relation/matrix adapterが残る |
| Alpertron ECM/SIQS | C→JS/WASMのbrowser実例。GPL-3.0、任意式・保存・任意server補助等の分離が必要 | source/build/license/機能の縮小審査前に取り込まない |
| FLINT factor / QS / ECM | LGPL-3.0-or-later、GMP/MPFR依存。大きい移植・配布範囲 | 原本選定とサイズ・起動・取消評価が必要 |
| GNFS / CADO-NFS | root COPYINGはLGPL-2.1。多段処理・個別部品監査・browser移植は別規模 | このPRでは実装しない。短期採用を見送る理由を下記に記録 |
| 独立複数Worker | Rho seed / ECM曲線を分担可能。CPUとinstanceメモリが増える | 1/2/4本のRhoを測定。固定seed MPQS複製は採らない |

GMPやGPL系を公開配布する際のsource提供・再リンク等の具体的な条件は、選ぶ原本と
配布形態で確認します。現在のサイトv1の許可license/capabilityとは別です。
PR3はGMP、ECM、SIQS、GNFSのコードを取り込まず、公開licenseも変更していません。
PR4の非公開GMP/ECM評価とSIQSコンパイル成立性は[原本・境界](gmp-ecm-source-review.md)に記録します。
ライセンス判断を「WASMだから安全／危険」と置き換えません。

## 旧ZIP・既存公開版・今回の基準
受領ZIPのWordPress/Flask版は同じ worker と gmp-wasm v1.3.2 bundle を使います。
Flaskは配信wrapperで、計算はWorker内のGMP/WASMです。アーカイブは実行していません。
factor_worker.js SHA256: 956b4d8a13abbc75b056773ad917e5ea3f52318367827b80474e9212add3e6bc。
旧workerは高位IntegerとJSのBrent Rho、Math.random、isProbablyPrime(25)を使います。
剰余を floor除算・乗算・減算で合成し、batch128個のq積もまとめて縮約します。
一時Integerはcontext破棄まで保持され、無期限探索・取消・job ID等に問題があります。

旧bundleの低位bindingは mpz_mod、mpz_fdiv_r、mpz_tdiv_r、mpz_powm を公開しています。
高位Integerにmodがないことは、GMP本体または低位APIに剰余がないことを意味しません。
PR4は低位APIの固定scratch再利用、必要exportだけの再現可能なGMP bindingを評価します。
共通のnative BigInt Brentと同じ入力で比較し、手製剰余は継承しません。
[GMPの剰余仕様](https://gmplib.org/manual/Integer-Division)と
[gmp-wasm原本](https://github.com/Daninet/gmp-wasm)を参照してください。
旧ZIPの独自部のroot license/build pinが未確認なので、旧bundleそのものを走らせて
現行測定との速度比を作ることはしていません。今回の実測対照はPR2のnative方式です。

サイト本番確認SHA e486d825f6e7a9f41aa37938f0dc36f9e9f67200 の
apps/site/src/components/islands/prime-factorizer-model.ts はNumberの試し割りです。
旧ZIPと同じWASM実装ではありません。この簡易版だけを高性能化の比較基準にしません。

## GNFS の採否
[CADO-NFS公式README](https://raw.githubusercontent.com/cado-nfs/cado-nfs/master/README.md)
はGMP、C++20、PythonとUnixツールを必要とし、85桁超を主対象としています。
85桁とtinyqsの85ビットは別です。標準構成のserver/clientや中間ファイルを
通信・保存なしの単一browser環境へそのまま持ち込めません。
GNFSが数学的にbrowserで不可能という結論ではありません。大きいrelation集合、
matrixメモリ、長時間の中断・再開を含む独立したportが必要、という実装上の判断です。
本PRでは未測定で、nativeの公開速度をbrowser能力へ換算しません。

## 複数Worker と資源
測定用portfolioだけを実装し、製品への自動並列化は追加していません。
1/2/4本へ異なるRho seedを渡し、総操作上限を分配します。全体の壁時計予算は共通で、
成功・失敗・期限・例外の全経路で全laneをdisposeします。結果の因子をlane間で合成しません。
MPQSの固定seedを複製すると探索が重複します。QSを並列化するなら多項式／relationの
分担設計が必要です。ECMなら独立曲線を割り当てます。
各Workerは現状WASMも初期化するため16MiBの線形メモリを持ち、4本では64MiBです。
JS heap等のpeakは未測定です。初期化時間はwarm計算と別に記録します。
この測定はデスクトップ限定で、モバイルに4本を既定化する根拠にはしません。
将来の製品は既定1本、hardwareConcurrency未取得／低core時1本、
低メモリ端末では最大2本等の選択を、実機測定後に決めます。
独立WorkerはSAB不要です。[Emscripten pthreads](https://emscripten.org/docs/porting/pthreads.html)
のSAB方式はCOOP/COEPや別buildが必要なので、今回採用していません。

## 次の判断
本測定でMPQSの成功率・分布・失敗条件と並列化の損益を示します。
その後の有力候補は、低位GMPのscratch再利用Brent、真のSIQS、ECM前処理です。
新たなcopyleftコードの配布方針やサイトcapability変更は具体案を戻してから扱います。
製品UI、site adapter、merge、公開・deployはこの段階の成果に含みません。

一次資料:
- [msieve QS](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/Readme.qs)
- [GMP-ECM原本](https://gitlab.inria.fr/zimmerma/ecm)
- [GMP-ECMの開発者mirror](https://github.com/sethtroisi/gmp-ecm)
- [Alpertron browser実装](https://www.alpertron.com.ar/ECM.HTM)
- [Alpertron source](https://github.com/alpertron/calculators)
- [FLINT](https://github.com/flintlib/flint)

調査した条文: [GMP-ECM COPYING](https://github.com/sethtroisi/gmp-ecm/blob/master/COPYING)、[COPYING.LIB](https://github.com/sethtroisi/gmp-ecm/blob/master/COPYING.LIB)、[CADO COPYING](https://github.com/cado-nfs/cado-nfs/blob/master/COPYING)。未採用部品の最終配布条件を確定したものではありません。

資源計数の補足: pool測定中も比較用の待機Workerが1本残ります。poolの1/2/4本と別にWASM線形メモリ16MiBがあり、browser全体のpeak RAMは未測定です。

PR4の実測と現在の資源所有権は[比較記録](../benchmarks/llm01-gmp-ecm.md)を参照してください。上記の待機16MiBの補足はPR3当時のharnessについての履歴です。現在のpoolは単体Workerをdisposeしてから開始します。
