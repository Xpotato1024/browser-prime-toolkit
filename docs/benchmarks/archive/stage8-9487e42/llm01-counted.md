# SIQSの時計・callback分離と有界Lanczos比較

コードhead: 9487e42e80acdf4a84ab455c00974c61babc2387。非公開の固定最小実験。旧測定と旧artifactは保持する。

固定5問ではclock/Budget経路とcallback集約で大きく改善した。Lanczos差替えに一貫した優位は見られず、この範囲では集約denseを次の私的候補とする。
1秒枠の成功は旧版0/5、他3variantは各5/5。10秒枠は全variant各5/5。製品UI・公開用schedulerへの採用判断は別段階。

## 条件と比較の意味

seed1・holdout23、総50M logical checkpoints、計算枠1000/10000ms。各セルは1観測で反復統計ではない。
各trialはfresh Chrome/Worker、順序回転。計測前の共通asset graphには4variantのbundleを含む。cold取得は別記録し、requestはasset取得後のWorker作成・compile/初期化・計算・検証を含む。
外側期限は計算枠+5100ms、内側host期限は計算枠+100ms。64checkpoint samplingに厳密wall保証はない。
A=旧版、B=同じ旧WASMのclock/Budget経路変更、C=C側の計数・callback集約+旧dense、D=Cと同じふるい/relation+上流Lanczos。
A→Bは純粋clock単体のマイクロベンチではなくglue/Budget経路を含む。A/B/Cの成功した10秒枠はwhole-job operationsが5問すべて一致した。
C/Dのbase/poly/sieve/relationのphase workも一致。Dには追加のmatrix poll/検算があり、50Mは同じ算術命令数を意味しない。

|入力（10秒枠、初期化込みms）|A 旧|B clock|C 集約dense|D 集約Lanczos|
|---|---:|---:|---:|---:|
|balanced-13-0|1645.8|263.7|174.3|194.3|
|balanced-96bit-0|1750.8|276.4|170.0|176.3|
|balanced-112bit-0|2595.3|368.4|190.5|210.8|
|holdout-balanced-80|2005.5|330.5|231.1|219.3|
|holdout-balanced-112|2181.5|312.2|182.2|194.5|

|variant / 枠ms|成功/5|request ms範囲|初期化ms範囲|計算ms範囲|
|---|---:|---:|---:|---:|
|legacy/1000|0/5|1042.2–1049.5|37.9–42.9|1004.0–1006.9|
|legacy/10000|5/5|1645.8–2595.3|35.4–43.3|1602.5–2559.8|
|clock-gated/1000|5/5|264.4–356.7|39.8–42.6|222.2–316.9|
|clock-gated/10000|5/5|263.7–368.4|38.4–43.8|224.4–325.8|
|dense/1000|5/5|178.3–202.2|37.9–43.5|139.0–162.2|
|dense/10000|5/5|170.0–231.1|39.2–56.6|128.6–174.5|
|lanczos/1000|5/5|181.2–228.2|39.0–45.4|138.3–187.0|
|lanczos/10000|5/5|176.3–219.3|38.1–45.4|138.2–177.7|

## callbackと資源

|入力（10秒枠）|B logical/import|B clock|C import|C clock|D import|D attempt/iteration|
|---|---:|---:|---:|---:|---:|---:|
|balanced-13-0|7288335|113884|113883|113884|128087|1/5|
|balanced-96bit-0|8006091|125100|125099|125100|140853|1/6|
|balanced-112bit-0|11878622|185610|185609|185610|198688|1/7|
|holdout-balanced-80|8800294|137508|137507|137508|148992|1/4|
|holdout-balanced-112|9911452|154872|154871|154872|170249|1/7|

|variant（主10観測）|Chrome tree peak PSS標本MiB範囲|peak RSS標本MiB範囲|managed heap peak MiB範囲|cold asset ready ms範囲|
|---|---:|---:|---:|---:|
|legacy|420.7–435.0|1183.6–1258.0|20.2–21.7|125.3–164.0|
|clock-gated|421.1–431.9|1179.9–1195.6|21.5–21.7|115.4–154.6|
|dense|421.2–431.6|1184.6–1196.2|21.5–21.7|120.5–166.1|
|lanczos|422.8–433.1|1180.9–1195.1|21.5–21.7|112.4–156.6|

WASMは実際のmemory.grow拒否まで検証した固定64MiB、stack1MiB、managed heap32MiB。取消後はWorkerを破棄するためterminal native heap監査は得られない。
RAMは全Chrome子processの25ms標本で、RSSには共有pageの重複があり、瞬間peak/hard process RAM上限やmobile適性を示さない。

## 別枠のphase診断

下表はlast splitのcallback間隔wall概算。JS/import/Budget/出力検証と追加sampling/captureを含み、純粋C時間でも主計測でもない。

|入力|variant|sieve ms|relation ms|matrix ms|
|---|---|---:|---:|---:|
|balanced-13-0|legacy|551.8|954.7|36.4|
|balanced-13-0|clock-gated|78.5|131.1|9.7|
|balanced-13-0|dense|36.6|58.8|7.0|
|balanced-13-0|lanczos|37.9|60.3|18.1|
|balanced-96bit-0|legacy|704.9|945.2|34.8|
|balanced-96bit-0|clock-gated|89.9|121.3|8.9|
|balanced-96bit-0|dense|38.8|57.4|6.5|
|balanced-96bit-0|lanczos|38.7|57.3|17.6|
|balanced-112bit-0|legacy|1536.5|935.2|21.1|
|balanced-112bit-0|clock-gated|190.7|117.9|5.0|
|balanced-112bit-0|dense|69.2|52.4|3.5|
|balanced-112bit-0|lanczos|68.9|51.8|15.4|
|holdout-balanced-80|legacy|856.2|1003.7|38.1|
|holdout-balanced-80|clock-gated|115.3|154.7|18.2|
|holdout-balanced-80|dense|52.0|75.2|7.0|
|holdout-balanced-80|lanczos|51.5|74.3|18.3|
|holdout-balanced-112|legacy|1122.1|942.1|29.4|
|holdout-balanced-112|clock-gated|144.3|115.0|7.3|
|holdout-balanced-112|dense|56.2|53.5|5.4|
|holdout-balanced-112|lanczos|62.0|53.2|18.0|

Cのmatrix概算は3.5–7.0ms、Dは15.4–18.3msだった。matrix主因という仮説はこの結果から支持しない。
5問すべてでC/Dのmatrix-relevant factor-offset/cycle descriptorとparity hashが一致。全relation fieldやFB prime値の一致までは立証しない。

## 停止・回復と限界

4variantすべてでloading/running取消とfresh Worker再実行が成功した。追加3variantは固定unreachable WASMによる計算入口trapをprotocol errorとして退役し、fresh Workerで回復した。SIQS core内で自然発生したtrapの実測ではない。
0/1/63/64/65/127/128/129のexact operation cap、phase末尾時計、残tail、資源停止、job-global試行/反復枠はunit/nativeで検証する。
native ASan/UBSanはdense全2528・Lanczos全3818割当失敗、6phase、13probeと回復を完了。最終headのCIでも再実行する。
今回は固定5入力・2枠・各1回であり、128bit全域/困難入力/複数端末/長期負荷の一般保証ではない。上限1024cycle prefixは維持し、filterやGNFSは実装していない。
次は集約denseを候補に、入力範囲・scheduler・UI・公開license/source/relink/site契約を本人判断へ返す。今回の数値だけで公開設定を変更しない。

証跡: [主40回](llm01-counted-primary.json)、[別枠診断20回](llm01-counted-diagnostic.json)、[取消・回復4構成](llm01-counted-lifecycle.json)。
[原本・実装境界](../../../architecture/counted-lanczos-review.md)、[TDD記録](../../../operations/stage8-tdd-evidence.md)。native/browser単純倍率は作成しない。
