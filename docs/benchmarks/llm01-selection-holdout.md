# LLM-01: 保守的selectorの固定holdout

[採否・公開前判断](../architecture/engine-selection-closeout.md)に沿った実装確認です。最適閾値・一般成功確率・任意桁性能の証明ではありません。policy/seedは結果を見て変更していません。

測定code 9b44327b1caa2152e71876d2f7ba36ddc751bf51、日時 2026-10-19T05:40:03.089Z。
[raw](llm01-selection-holdout.json) SHA256 a8de46e2e6b5627cd8f9ab224be080ec5ab933d14a7fb3a19deb19bff3c892f9。

## 6問・18計算

事前のADR0006後に生成した新6入力で、過去の全corpusと非重複です。各方式1回、seed23、計算1秒/50M checkpoint、毎回fresh Worker。小さい因子11個は計測外の独立exhaustive uint64 trialで証明し、M127だけruntime probableを維持します。

各cellはstatus / 初期化を含むrequest wall msです。初回asset取得は含みません。

| 問題 | bit | selector方式 | native-only | ECM | selector |
| --- | ---: | --- | ---: | ---: | ---: |
| holdout-small-32 | 32 | brent | complete / 13.30 | complete / 103.50 | complete / 15.20 |
| holdout-native-63 | 63 | brent | complete / 56.80 | complete / 71.80 | complete / 53.60 |
| holdout-native-64 | 64 | brent | complete / 24.60 | complete / 78.30 | complete / 24.10 |
| holdout-balanced-80 | 80 | gmp-ecm | complete / 860.90 | complete / 91.00 | complete / 90.40 |
| holdout-balanced-112 | 112 | gmp-ecm | incomplete (time-budget) / 1012.80 | complete / 448.40 | complete / 452.50 |
| holdout-unbalanced-m127 | 147 | gmp-ecm | probable / 16.00 | probable / 67.30 | probable / 70.10 |

selectorは5 complete＋1 probable、nativeは4 complete＋1 probable＋1 time-budget、ECMは5 complete＋1 probableでした。112bitの新問はECMが完了し、nativeは未完了です。大入力×小因子ではnativeが速く、入力bit数だけのpolicyが最速とは限りません。64bit入力も2^64未満なのでnative側です。平方や小因子/MRは既存共通工程で処理し、全結果を元入力と検算しています。

## 初期化と計算・RAM

| mode | 初期化中央値ms | 完了時ready後中央値ms | 完了時request中央値ms |
| --- | ---: | ---: | ---: |
| selector | 30.00 | 30.50 | 61.85 |
| brent | 11.55 | 12.50 | 24.60 |
| gmp-ecm | 50.75 | 29.05 | 84.65 |

selectorの全体中央値は異なるbackendの混合で、backend単体の初期化費ではありません。6問の単発・順序を巡回した局所結果で、統計的優位・一般speedupを推定しません。

初回local取得からnative readyは145.15ms、初期source asset合計769763 bytes（圧縮やHTTP headerを含むwire量ではない）です。native-only Worker assetは13570 bytes / SHA256 f94f17de4db43d92b819db00fdb159cd7fdc91226c54dad2f3fe6de38eb89b4a。controllerの通常sourceやECM sourceも初期取得する評価page全体の費用とは区別します。

native-onlyはWASM線形0、ECMはhard64MiB/stack1MiB。同時所有max1で、nativeのJS/browser RAMが0ではありません。専用Chrome process treeの全taskを標本化し、142標本でRSS peak 1306.36MiB / PSS peak 474.91MiBでした。最初の比較直前標本はRSS 1154.02MiB / PSS 390.69MiBです。shared RSS重複、GC待ち、25ms目標の標本間ピーク未捕捉を含み、厳密RAM上限でも各方式への帰属値でもありません。2 WorkerのRAMは再測定していません。

名目の初期化deadline5秒＋計算枠＋配送猶予100msは、初回取得/parse/proof検証/OS遅延まで含む実時間上限ではありません。既定selectorは計算1M checkpointで、今回50Mの確認結果を既定予算の保証にはしません。

## 境界と終了

135 tests/checkに加え、WebAssembly無効の独立native Workerでready/exact divisor/非対応algorithm拒否を確認しました。通信監視はready後HTTP/CDP/CSP/例外0、cache無効・server停止offlineで両経路の計算、取消、再初期化を確認。検出器の正例も通過しています。Worker targetのoffline emulation非対応はserver停止で補完しました。

PR3〜5の長い測定は履歴として再利用し、新方式port・追加seed探索・閾値調整は行いません。site/UI/CSP/公開license/配布/Ready/merge/deployは変更していません。公開受付範囲、全request待ち時間/RAM、probable表示、ECM配布条文/再リンク材料、site long-compute profileは本人判断を残します。
