# 数値hot pathの有限CPU診断

Stage25 compactと、custom name section以外のWASM sectionがbyte hash一致する
診断artifactを作ります。上流・patch・compilerを固定し、2回clean buildを一致させます。
strip-allだけを外し、演算・code/data/export/memory等のsemantic sectionの一致を機械検査します。

Chrome CDP Profilerを1 coordinatorで1ms間隔、15秒でstopを要求し、RSA100計算は最大30秒とします。
診断のsample比率はCPU使用率や全工程の所要時間予測ではありません。
JIT/inlining・sample欠落・prepare等を含む限界を記録し、採用比較の時間と混ぜません。
stop応答は10秒以内、実測のprofile採取時間は25秒以内とし、超過は失敗扱いにします。
stop要求時刻と応答時刻を記録し、worker破棄前にprofileを回収できなければ失敗原本を保持します。
raw profileはこのPCのrepo外で16MiB以内に保存し、repoへは上位64項目等の有限summaryだけを載せます。

WASM256MiB、input/時間/work/cancelの既存境界、available4096MiB、
live160MiB/linear208MiB・Chrome PSS1536MiBのsoft stop、offline・CSP・退役を維持します。
巨大な割当による空きRAM探査、OS/WSL/端末設定の変更、他端末接続はしません。
