# Full SIQS の非公開評価
既存UIと30秒native RSA profileを変えない独立経路です。[原本・上限](../architecture/full-siqs-source-review.md)を先に確認してください。Brentの追加長時間試行は停止し、[旧分単位計画](minute-evaluation.md)は途中記録として保存します。

```sh
export PRIME_FULL_SOURCE_DIR=/tmp/full-siqs-sources
npm run fetch:full-siqs
npm run build:full-siqs -- --check
npm run verify:full-siqs-native
npm test
npm run check
CHROME_BIN=google-chrome npm run verify:full-siqs -- --out /tmp/full-contracts.json
```

初回の生成時のみbuildの --checkを外し、生成物差分をreviewします。通常の--checkは生成物を書き換えません。全runtime assetを読んだ後、HTTP serverを停止しChromeをofflineにして計算します。CSP/CDP/HTTPの通信0、Worker最大1、全Worker退役を確認し、検出器は終了後の正対照で検査します。

`npm run verify:full-siqs -- --case RSA-100 --seed 1 --budget-ms 30000 --out /tmp/rsa100-full.json`で公式Nを評価します。budgetは3000/30000/180000/600000msのみです。加速時計の契約試験は性能測定へ混ぜません。raw上書きは禁止、source hashとmeasured headを保存します。Chrome treeのRSS/PSSは標本で、瞬間peakやプロセス全体hard capを意味しません。

`python3 scripts/generate-full-practical.py --check`と`node scripts/check-full-practical.mjs`は40..100桁2桁刻み・各2入力、124個の相異なる素因数、Pocklington certificateを独立検算します。生成は測定前に固定し、runtimeはNだけです。oracle/certificateはHTTP allowlistに入れず、Worker退役後のNodeだけで照合します。生成素数は再帰証明用の大きなp−1因子を持つため一様な半素数標本ではありません。

各桁2入力×seed1/11の固定4組を分母とし、3秒、未完了だけ30秒、さらに180秒へ進めます。短枠成功は長枠到達にも含め、再試行を別標本に数えません。600秒は個別の有限診断です。timeoutを成功時間に入れず、未測定・途中・resource/fatalを別に報告します。小標本の到達率を一般的な最大桁数やRSA全体の能力へ外挿しません。
