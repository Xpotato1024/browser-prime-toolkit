# 関係式収集ホットパスの段階診断と有限改善（Stage40）

基準はPR23 head de9c9d7bf8987ad50de6843740d5271ce5096505、RSA100成功の数値原本はd1e0b865。Stage39のfilter早期解放候補は不採用の原本として保全する。本人の追加指示に従い、保持メモリ候補だけで改善余地が尽きたとは判断せず、現行の収集ホットパスを調べる。merge/release条件はまだ成立扱いしない。

## 分かっている範囲

成功原本のcoordinator wrapper累積はprepare0.340秒、sieve2143.236秒、copy/free0.055秒、framing2.608秒、submit23.907秒、observe0.531秒、extract42.592秒。sieveは多項式・根・score・候補処理・packet生成を含み、純粋なscore加算だけではない。helperの経過時間を重ねて足したCPU時間でもない。

固定upstream engine/root_wasm.rsにはSIMD128の根更新、engine/report_wasm.rsにはSIMD候補走査がある。新規の発明や未実装SIMDとして扱わない。過去Stage25の15秒profileは古い保持/剰余実装の診断で、現在の各段階比率へ読み替えない。採用済み組込みu32剰余の固定比較-9.27%、棄却したskip-0.29%/dense16KiB+4.85%も保全し、同じ候補を根拠なく再採用しない。

## 診断の設計

固定upstream/現行patch/compiler/flagsを維持した別namespaceの診断Nativeを作る。既存の選定入口・Stage38成功artifactは変更しない。多項式family準備、初期root/Bainv、Gray B更新、SIMD root更新、per-poly係数準備、score初期化/加算、候補走査、resieve、試し割り、残余分類、relation出力、packet化、collector mergeを分ける。

診断専用のlocal monotonic clock importを使い、固定長16phase/深さ16の配列へinclusive/exclusive時間と回数だけを保存する。clock呼出し上限2,000,000回、逆行・非有限・不正なscope順序を診断失敗にする。第一版は全対象の有限計時とし、10%overhead gateを超える場合は採取頻度を事前固定した別planへ見直す。任意remote code・通信・保存APIは追加しない。入力・演算・順序・閾値/LP設定・受理prefixを変えない。nested scopeは包含関係を明記し、trialdivisionに内包される残余分類等を二重加算しない。タイマー分解能、JIT/inlining、計測import自体の摂動を記録し、CPU使用率や全工程の割合を断定しない。clock異常や上限超過は診断失敗として原本を残す。

Nativeはco1024の現行codeを基準に初期memory約1MiB・最大1024MiB、既存quota640/linear事前832MiBを維持する。計測対象の保持量は小さい固定prefixで、巨大割当の限界探索はしない。fixed配列以外のevent無制限蓄積をしない。source/plan/head/driverを先に固定し、clean・exclusive出力、全session/Worker退役、通信0・取消/期限・fresh recoveryを保つ。

## 第一段階の有限予算

まずRSA100の同じ先頭4familyを1 Workerで比較する。baseline/instrumented/instrumented/baselineのABBA4試行、1試行90秒、外枠480秒（計算最大360秒＋source/退役reserve120秒）。各試行は直列、他build/test/数値負荷を同時に走らせない。開始WSL available4096MiB以上、Chrome PSS1536MiB・host available4096MiB保護停止を維持する。Native要求/linearとChrome RSS/PSSは別に記録する。

全packet bytes/SHA・列bytes/SHA・全prefix counter・設定・family同一性を照合する。instrumentedは2clean一致し、source差分が診断だけであることを確認する。40/64桁も同じ最終prefixまでのpacket/列/counter/因子を確認するが、Native単体の機能試験と実Chromeの診断を区別する。タイマーが結果に影響するかを見るABBAは採用速度比較へ転用しない。中央値overheadが10%超ならphase比率を現状の精密値として使わず、clock頻度や診断方式を見直してから別planを固定する。

第一段階が正常に終わった場合だけ、支配的な段階の低〜中コスト候補を最大2件まで設計する。候補ごとに仮説・算術境界・固定source・時間/メモリ・gateを先に決め、計測コードを外したNativeで同じfamily ABBAと40/64桁因子一致を比較する。暫定gateは同じprefix時間5%以上短縮、PSS1.10倍以下、packet/列/counter/因子一致、保護/取消維持。閾値・B/interval/LPを変える探索と算術同値の局所最適化は混ぜない。

候補はsource確認と実測に従って順位を付ける。例としてroot SIMDのループ配置/unroll、report走査のreject loop、polynomialごとの不変値の重複計算、score loop配置、trialdivision/残余分類の重複処理を調べるが、測定なしに全部を実装しない。新しい整数型、manual modulo、WebGPU/GNFS等の大型移植、無制限の長試行は対象外。RSA100長時間の追加完走試験はこの第一計画へ含めず、局所改善が成立した場合に別の有限planで判断する。

全raw・失敗・負の結果をローカル保持する。repo証跡は各2MiB以下の可逆圧縮＋SHA、CPU rawを取る場合はローカル16MiB以内・有限summaryをrepoへ置く。日本語比較メモとDraft PRを更新し、最終head test/check・独立review・CIを確認する。サイト本番切替・資格情報/権限・端末設定変更は行わない。
