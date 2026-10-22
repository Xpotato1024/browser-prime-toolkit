# Stage11: RSA profileの実TDD
既存191件を保全し、初回新規24件を段階的なred→greenで追加しました。初回合計215件成功です。最初にstub/境界を失敗させ、実装後に同じ試験を通しました。

|段階|redの観測|green|
|---|---|---|
|plan|5件失敗|5件成功|
|result/host|4件/8件失敗|合計17件成功|
|初期化5秒上限・probable progress proof|2件失敗|19件成功|
|Worker protocol|3件失敗|22件成功|
|終了処理のdeadline超過|成功判定が期限後に残る1件失敗|23件成功|
|module bundle|private helperの重複宣言でmodule syntax error|24件成功|

[red/green原ログ](../benchmarks/archive/validation-logs/)のstaged-rsa-*を保存しました。初期の実Chrome試験でもmodule Workerが初期packet前に失敗しました。parser/resultの同名private helperがflat bundleで衝突していました。旧sourceを変更せず生成bundle内のparser bindingを改名し、生成時の検査をmodule形式へ合わせました。Node unit importだけでは見つからなかった不具合です。

実Chromeの8群は、32・2^128・2^2047の積/素数確度、53公式入力の正確なplan、GMP/SIQS未対応と0 allocation、probable分類、実RSA-2048の取消、加速時計によるdeadline、protocol fault後の退役/次要求回復、不正ready、0/1です。加速時計は性能ではありません。fault注入は実native trapではありません。初回asset後のpage/Worker通信0、単一owner、終了後live0、CSP/CDP/HTTP正対照を別に確認します。

[固定receipt](../benchmarks/llm01-staged-rsa-contract.json)は測定headと読み込んだ全source hashを保持します。check:rsa-profileは同じsourceとの一致を検査します。performance試行を行う場合は別rawを上書きせず保存し、この契約試験の合成入力と混同しません。

v2追加: 旧option/verifierへ通すと2億設定と50000001 metadataを拒否する実red3件を保存し、RSA専用層の分離後green3件、全RSA27件/全体218件へ拡張する。旧50M拒否と每checkpoint時計確認も同時に試験する。旧engineを使うfake Worker fixtureは高予算を拒否して完了待ちになるため、fixtureもRSA driverへ合わせた。旧実装は変更しない。原ログはstaged-rsa-{red,green}-budget-v2.log.txt。
