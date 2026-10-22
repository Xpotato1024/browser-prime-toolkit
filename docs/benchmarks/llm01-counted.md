# SIQSの時計・callback分離と有界Lanczos比較

コードhead: dc5a568988eb2e645f773c0caedfc4a5c302b33e。非公開の固定最小実験。旧測定と旧artifactは保持する。

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
|balanced-13-0|1647.5|273.0|178.5|194.9|
|balanced-96bit-0|1740.3|271.0|178.6|185.2|
|balanced-112bit-0|2594.1|348.6|195.1|205.9|
|holdout-balanced-80|1976.8|327.3|206.4|218.6|
|holdout-balanced-112|2132.2|316.2|184.5|265.6|

|variant / 枠ms|成功/5|request ms範囲|初期化ms範囲|計算ms範囲|
|---|---:|---:|---:|---:|
|legacy/1000|0/5|1041.8–1053.6|35.7–47.3|1004.6–1007.2|
|legacy/10000|5/5|1647.5–2594.1|34.7–44.0|1609.3–2550.1|
|clock-gated/1000|5/5|273.8–362.8|36.5–44.7|237.3–319.9|
|clock-gated/10000|5/5|271.0–348.6|38.1–45.5|227.5–310.5|
|dense/1000|5/5|180.2–213.9|39.8–49.3|131.9–164.6|
|dense/10000|5/5|178.5–206.4|36.4–43.3|135.3–167.6|
|lanczos/1000|5/5|188.1–224.2|38.9–47.0|144.8–183.6|
|lanczos/10000|5/5|185.2–265.6|39.4–59.4|140.7–206.2|

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
|legacy|420.6–431.8|1185.3–1261.2|20.2–21.7|126.5–153.9|
|clock-gated|422.0–431.9|1181.4–1194.3|21.5–21.7|129.8–165.7|
|dense|421.4–432.5|1183.9–1197.8|21.5–21.7|124.2–229.1|
|lanczos|423.1–436.1|1187.0–1199.5|21.5–21.7|129.9–156.4|

WASMは実際のmemory.grow拒否まで検証した固定64MiB、stack1MiB、managed heap32MiB。取消後はWorkerを破棄するためterminal native heap監査は得られない。
RAMは全Chrome子processの25ms標本で、RSSには共有pageの重複があり、瞬間peak/hard process RAM上限やmobile適性を示さない。

## 別枠のphase診断

下表はlast splitのcallback間隔wall概算。JS/import/Budget/出力検証と追加sampling/captureを含み、純粋C時間でも主計測でもない。

|入力|variant|sieve ms|relation ms|matrix ms|
|---|---|---:|---:|---:|
|balanced-13-0|legacy|560.4|959.8|37.3|
|balanced-13-0|clock-gated|75.3|130.2|9.7|
|balanced-13-0|dense|38.2|59.8|6.9|
|balanced-13-0|lanczos|36.8|59.0|18.9|
|balanced-96bit-0|legacy|724.2|969.2|34.9|
|balanced-96bit-0|clock-gated|91.2|126.3|9.0|
|balanced-96bit-0|dense|38.5|58.1|6.5|
|balanced-96bit-0|lanczos|39.5|55.9|18.2|
|balanced-112bit-0|legacy|1556.8|983.2|21.3|
|balanced-112bit-0|clock-gated|224.5|130.0|4.7|
|balanced-112bit-0|dense|69.1|53.4|3.5|
|balanced-112bit-0|lanczos|67.7|51.3|15.0|
|holdout-balanced-80|legacy|867.6|1018.4|38.7|
|holdout-balanced-80|clock-gated|121.9|142.6|12.6|
|holdout-balanced-80|dense|51.3|76.8|7.1|
|holdout-balanced-80|lanczos|52.4|78.7|18.4|
|holdout-balanced-112|legacy|1172.1|938.0|29.7|
|holdout-balanced-112|clock-gated|147.4|120.1|7.5|
|holdout-balanced-112|dense|55.5|53.0|5.3|
|holdout-balanced-112|lanczos|60.1|53.2|17.2|

Cのmatrix概算は3.5–7.1ms、Dは15.0–18.9msだった。matrix主因という仮説はこの結果から支持しない。
5問すべてでC/Dのmatrix-relevant factor-offset/cycle descriptorとparity hashが一致。全relation fieldやFB prime値の一致までは立証しない。

## 停止・回復と限界

4variantすべてでloading/running取消とfresh Worker再実行が成功した。追加3variantは固定unreachable WASMによる計算入口trapをprotocol errorとして退役し、fresh Workerで回復した。SIQS core内で自然発生したtrapの実測ではない。
0/1/63/64/65/127/128/129のexact operation cap、phase末尾時計、残tail、資源停止、job-global試行/反復枠はunit/nativeで検証する。
native ASan/UBSanはdense全2528・Lanczos全3818割当失敗、6phase、13probeと回復を完了。最終headのCIでも再実行する。
今回は固定5入力・2枠・各1回であり、128bit全域/困難入力/複数端末/長期負荷の一般保証ではない。上限1024cycle prefixは維持し、filterやGNFSは実装していない。
次は集約denseを候補に、入力範囲・scheduler・UI・公開license/source/relink/site契約を本人判断へ返す。今回の数値だけで公開設定を変更しない。

証跡: [主40回](llm01-counted-primary.json)、[別枠診断20回](llm01-counted-diagnostic.json)、[取消・回復4構成](llm01-counted-lifecycle.json)。
[原本・実装境界](../architecture/counted-lanczos-review.md)、[TDD記録](../operations/stage8-tdd-evidence.md)。native/browser単純倍率は作成しない。

予備9487e42の64構成は[archive](archive/stage8-9487e42/README.md)に保持した。最終測定はbusy guard修正後の上記code headを用いる。

dense WASM: 93241 bytes / SHA-256 0c3313e9ca1c1532cf74aaf065d2aa895e2308b425626381c2da8ae2c29a573e。
lanczos WASM: 101903 bytes / SHA-256 0351c6d1433bd130dd33ee1d1d18c36391d995819a41bff2b2592e84f4d7d051。
