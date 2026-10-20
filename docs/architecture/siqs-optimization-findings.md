# Stage15: RSA100改善の実測と限界

[固定28試行と全raw](../benchmarks/llm01-siqs-opt.md)の測定headはb25dfa54af9c0b585ee7e14cd6e3466e7cfca4beです。Stage14の38試行、旧C patch・原本pin・実行系は保全しています。

元のmsieveは-O3、GMPは-O2です。新候補はmsieveのcompile/linkに-fltoを追加しただけで、同じC patchと上流ソースを使用します。WASMは138700→192409 bytesとなり、転送・初期化の費用も残ります。2回のclean buildで同一artifactを再現しました。

24短試行は各seed8億work・seed1/11で、engine×監視条件×1/2 Workerを2反復しています。全条件でseedごとの保存バイト列が一致し、unique関係式を元Cの式で再検証しました。2 Workerのrequest平均はbase/base5.123秒、LTO/base4.148秒、LTO/stride16384が3.950秒です。LTO単独で約19.0%短縮、複合候補で約22.9%短縮です。baseline/request比は約1.235／1.297で、速度比と時間短縮率は区別します。

60秒枠の4試行はbase/base→LTO/stride→LTO/stride→base/baseの事前固定ABBAです。unique関係式はbase7052／7119、複合候補9546／9531でした。平均収量比は約1.346です。これはcompilerとcallback削減の複合比較で、短試行が個々の効果を分けています。単一ホスト・各2観測であり、一般的速度保証には使いません。

共通graphのcycleはbase1／1、複合2／2で、laneごとのcycle合計0／0、1／1より各1多いcross-stream cycleを観測しました。full+cycleはbase101、候補148で、目標97743には達していません。partialの多数を完成関係式数とみなさず、matrix／RSA100因数分解の完了時間へ外挿しません。verifiedは輸入関係式の証明成功です。

初期化込みhost deadlineは60000ms、合計work上限1兆、2 Workerの管理WASM上限512MiB、save16MiB／20万record、serialized64MiBです。終了結果のrequestは約59.16秒で、残りをfresh検証・配送へ予約しています。強制終了で未知のworkは割当全量を課金します。停止、trap、OOM後のownerは再利用しません。ブラウザPSSの約516〜519MiBは標本値で、全RAMの強制上限ではありません。

次の実測対象はsmall sieve／bucketのsource由来改善、増加したpartial graphのcycle収量、matrix到達時の時間とmemoryです。今回C数学を変更せず得たLTO候補を評価しましたが、YAFU・Alpertron・GNFSとの優劣や100桁完遂能力は未確定です。公開selector・UI・サイトへ接続する判断は含みません。

CIのfull-siqs／lab失敗はGMP原本配布先の接続timeoutでした。原本first、同一ファイルのGNU公式fallbackを固定し、サイズ1939430／既存SHA256を必須にした新helperで回復しました。CI39387176350のfull-siqsは元URL timeout→GNU成功を記録し、旧manifestを変えずbuild／native／browser検証まで通りました。

別のpush CI39387170942 supplementary-evaluationはChrome起動15秒超過で、計算開始前に失敗しました。CI専用copyは起動待ち30秒・quick固定・自身のsource pinだけ変更し、元測定driverとの全差分をcheckします。計算予算、終了処理、通信監査、検証は変更していません。再試行で隠す方式ではありません。
