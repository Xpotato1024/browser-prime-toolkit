# ADR0012: 分単位と100桁未満の有界評価
状態: 非公開Draft。本人の追加依頼「RSA100で何分かかるか計測し、100以下についてどれくらいまで現実的か確認」に基づく。PR11の30秒profile、旧UI、比較rawとsource pinは固定して保持する。

RSA-100（100十進桁/330bit）の原数を既知因数なしでまず1回、初期化込み上限600000msで試す。未完了なら「10分で未完了」と報告し、成功時間を推定しない。延長は停止状況と資源を見て別途判断し、無制限探索しない。

新long-rsa名前空間のprivate評価専用profileへ、3000/30000/180000/600000msの有限予算と1 request/1 Worker、最大2048bit/617桁、初期化最大5秒、WASM0、factor2048/packet262144bytesを置く。operation上限は有限100億でNumberの正確範囲内。600秒で旧50M/200Mへ先に達することを避けるが、上限へ先に達した結果は性能timeoutと区別する。shared Budgetは毎checkpoint時計確認、host deadline・取消terminate・proof/退役込みを維持する。JS全体heapのhard capは保証せずChrome tree RAMを標本記録する。

既存Brent算術を再利用し、option/driver/proof/hostの制御層だけを別module/bundleへ分離する。旧sourceからの許可差分を機械照合する。方式はnative BigInt Brentのみで、大SIQS/GMP/ECMの対応を偽装しない。計算ごとの生存状態・通信0・有限counter・所有権をTDDと実browserで確認する。

RSA-100未満に公式challengeはない。12/16/20/24/28/32桁から始め、各2入力・各seed1/11の2試行を実施する。各組は3秒から始め、未完了だけ30秒、さらに未完了だけ180秒へ進む。全組が180秒で未完了になる最初のtierで拡大を止め、直前tierとの間を2桁刻みで詳しくする。32桁で成功が残れば34桁へ進め、必要なら36桁までとする。36桁を初回の生成・計測上限にし、その先を推測で埋めない。

入力生成はPythonの独立処理で行い、p/qは64bit未満のdeterministic MR証明可能な素数、互いに異なり、bit長差1以内・比率2以内の均衡半素数とする。積の十進桁を固定し、同じ素数の再利用を避ける。生成因数/証明/生成seedはoracleだけへ保存し、browserへ渡すcatalog/JSにはid/input/digits/bitsだけを載せる。engine/Workerはoracleをimport/fetchせず、asset取得後server停止/offline、source検査とネットワーク監査で分離を確かめる。RSA公式値は加工せず別source identityを保持する。

生成時の素数証明、engineのproven/probable/partial、積/余因子検算を独立に区別する。終了後CLIだけがoracleと照合し、既知因数を探索へ注入しない。方式・端末・Chrome・Worker・初期化込み時間・全試行/停止理由・成功率・中央値/範囲・source/raw hashを保存する。初回計測前にcatalog/oracle/generatorのhashを固定し、成績による入力差替えを禁止する。成功率は固定input×seed組を分母に予算別集計し、retry行を独立標本として混ぜない。成功時間の中央値/範囲にtimeoutを含めない。異なる桁の一つの易しい入力だけで実用域を宣言しない。小標本の実測範囲として報告し、公式RSAの能力と混同しない。

新profileのTDD・最終head検証・read-only独立レビュー・同head CIを揃え、別のprivate Draftへ返す。公開、Ready、merge、deploy、site統合、資格情報/権限変更は含まない。

境界詳細化は180秒の拡大停止点だけでなく、3秒/30秒/180秒の各4組全成功から一部未完了へ変わる区間へ適用し、事前生成済み入力の2桁刻みを補う。入力のhashや組数は変更しない。

状態追記: Stage12はBrentの追加長時間評価を途中停止し、[ADR0013](0013-large-sparse-siqs.md)へ優先を変更しました。以下の計画を完了済みとは扱いません。
