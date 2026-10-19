# Stage13 の検証記録
Full SIQSは[ADR0013](../adr/0013-large-sparse-siqs.md)に従うprivate評価です。旧profileと比較rawは保持します。

- 入力ABIの128byte境界をnativeでREDにし、canonical/100桁かつ332bitへ固定。
- 1024行の旧guardを引き継ぐREDから、10万FBとcycleの加算前guardへ変更。
- 100億counterでは長枠が先に尽きるため、full profileだけ有限1兆のuint64へ変更。2^32越えをnativeで確認。
- Blob Workerの相対WASM URL初期化失敗から、embedded bytes用locateFileへ修正。
- 実WASM OOM/abortのREDからprivate監査exportを追加。poisoned instanceを再利用できずfresh Workerで回復することを実Chromeで確認。
- account時計が未知trapをtime-budgetへ隠すREDを再現し、fatal優先の分類を直接unit試験。
- matrix reduce後のno-dependency経路でASan double-freeを再現し、減少済み列数を呼出側へ即時反映。
- packed dense-block pointer tableの8byte leakをLSanで再現し、子配列に続けてtableを解放。
- post/packed fixtureは上流の前提に合うものを使い、全64bitを元relationの行XORで独立検算。検算をmaskやtruncateで弱めない。

最終headの件数・CI・独立レビュー・性能値はhandoffと測定報告を正とします。途中のREDは既知の不具合再現であり、成功結果として扱いません。
