# Stage8 TDD と検証の記録

- checkpoint charger: 未実装moduleを参照する3testがRED、実装後3件GREEN。
- native cap probe: native_checkpoint_probe未実装のlink errorがRED。実装後、dense全2528・Lanczos全3818割当失敗、8小操作枠、import停止、job共通2attempt/4096反復、6phase、13境界probeと回復がASan/UBSanでGREEN。
- counted binding: 未実装module参照のRED後、3variantの操作残枠・資源回復・正確なdivisor、dense/Lanczosの行列descriptor/parity hash一致4件がGREEN。
- phase末尾: 64件の後の短い1件importでclockが増えないassert（1 != 2）がRED。force clockの追加後4件GREEN。native phase末尾を次の64件に持ち越さない。
- 追加の退役回復とrunner deadline検査は実装後の回帰テストとして追加し、RED先行とは数えない。

ローカル実行ログはLLM-01のtask/prime-stage8に保持しています。最終headではnpm test / npm run check、固定sourceの2回clean build、CIのnative再検証を確認します。
計測はコードhead dc5a568988eb2e645f773c0caedfc4a5c302b33e を固定し、[比較報告](../benchmarks/llm01-counted.md)のreceiptへ結び付けます。

非同期audit中に2回目の不正requestがbusyを解除し、3回目が実行される回帰はcalls=2（期待1）でRED。busy時は所有jobのfinallyへ入らず返す修正後GREEN。
修正前9487e42の64構成は[archive](../benchmarks/archive/stage8-9487e42/README.md)へ保存し、最終コードdc5a568の同一64構成を再測定します。
