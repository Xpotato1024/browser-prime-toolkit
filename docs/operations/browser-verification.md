# ローカルbrowser検証とベンチマーク

Chrome実行ファイルをCHROME_BINで指定します。fresh一時profileのheadless Chromeだけを起動し終了します。
npm run verify:browserは機能用の短い試験、npm run benchmark:browserは100/1000ms、3seedで比較します。
--outでreceipt保存先を指定します。第三者のprofile、外部サイトや本番サイトは使用しません。
LinuxでChromeの共有libraryが必要な場合は、利用環境のLD_LIBRARY_PATHを指定してください。

harnessは静的local HTTP配信で、script-src self と wasm-unsafe-eval / worker-src blob: / connect-src noneです。
WASM compile許可はローカルharness限定で、サイトのCSPは変更しません。
mainとWorker両方をCDPで観測し、HTTP server記録と照合します。cacheは無効にします。
ready後の通常計算、offline一致、取消、Worker再生成後の再計算でHTTP/socket/例外/CSP違反ゼロを確認します。
Blob/Dataのlocal内部資源はHTTP通信と区別して件数を記録します。
ChromeのWorker targetにはofflineエミュレーション非対応があるため、その成功を主張しません。
Pageをoffline化し配信サーバーを停止した状態で実計算と再起動を確認し、WorkerのrequestもCDPで監視します。

最後に測定区間を閉じ、CSPでblocked fetchを観測し、通常navigationと別の試験用WorkerでHTTP通信を発生させます。
CDPとHTTP双方に正検出させ、観測器の無反応を「通信ゼロ」と誤認しないようにします。
試験用Workerの通信コードはproduction Worker sourceへ含めません。

receiptにはbrowser/OS/CPU/RAM、source fileとWorker assetのhash、corpusと生成法、
各因子サイズ、seed、予算、全成功/打切り、起動/取消時間を保存します。
電源状態、peak Worker heap、低性能端末、Firefox/WebKit/iOSはこの段階では未測定です。
限定MPQS/WASMと1/2/4 Rho Workerを同一corpusで比較します。製品dist/site受入れを、このharnessの成功で代替しません。
WASM jobのdelay0取消はqueued状態を含み得ます。実browserでC実行中の強制停止を実証したとは主張しません。
C内部の協調中断・解放はnative ASan/UBSanで200回の中断と次jobで確認します。

WorkerのCSP eventも固定source内のaudit通知でhostへ送り、計算を停止します。
測定後はproduction Worker sourceに試験用blocked fetchだけを追記した別Workerでauditを正検出します。
同じcontrollerの監査経路は単体テストでも確認します。CSPで阻止されたfetchがCDP Networkに出ない場合も検出対象です。
