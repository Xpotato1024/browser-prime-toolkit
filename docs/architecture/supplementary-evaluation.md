# SIQS・並列・補助方式の再評価境界
[ADR0007](../adr/0007-siqs-parallel-supplement.md)を先に固定した非公開実験です。
PR6の暫定selectorを製品既定へ昇格させず、1秒の失敗から方式全体を除外しません。

## SIQS
旧WASMと旧bindingを主計測に保持し、10秒/30秒と50M checkpointのどちらで止まるかを分けます。
別profileは最後のsplitだけのcallback間wall近似で、JS import・Budget・出力検証費を含みます。
追加時計読みの負荷があり、純C時間や全job profileではありません。
旧artifactはrelation/A/blockカウンタをexportしません。取得できるlogとphase/callback/管理peakを保存し、
取得できない途中カウンタを推測値で補いません。
現実装は1024×1024までの独自dense GF(2)です。上流Lanczosは未使用です。
固定full msieveのnative参考はQSへ直接入り、Rho/ECMの前処理を混ぜず、30秒/512MiBで実行します。
generic C sieveとnative算術の参考で、browserとの同条件速度比ではありません。
[Lanczos原本](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/common/lanczos/lanczos.c)
には条件付き停止・再試行・column解放があり、browser adapterには明示checkpoint、再試行上限と所有権整理が必要です。

## 並列と補助方式
同じmasterseedから32個の一意σを生成し、laneへ交互分配します。同じBudgetの余因子間でもcursorを維持します。
試行前にindexを予約し、1本32対2本各16、合計50M操作、初期化込み1000msを共有します。
σの非重複は曲線の非同型性・統計的独立性の証明ではありません。
全laneを成功/取消/timeout/errorで破棄し、評価専用controllerは期限切れに再生成しません。
Chromeはtrialごとにfreshです。標本RSS/PSSはアプリ全体のhard RAM保証ではありません。
auditは返却時の観測です。破棄した敗者の最後のcurve数を完全に観測できるとは扱いません。

p−1はbase2/3、B1=2000、B2=1<B2min=2000のstage1だけです。
必要条件をbit数へ置き換えず、選択baseの位数とlcm(1..B1)、proper gcdを対照で検算します。
初期cascade/累乗には停止callbackがなく、ECM stage2の停止証跡を流用しません。
p+1は同じlibraryの別経路・Lucas列で、停止検証を新たに要する未測定候補です。
[SQUFOF原本](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/common/smallfact/squfof.c)
は62bitまでの候補で、今回の80/96/112bit群の代替にはそのまま使えません。小入力の性能採否は未測定です。
方針の根拠は[HAC 3.2](https://cacr.uwaterloo.ca/hac/about/chap3.pdf)と
[固定ECM API](https://github.com/sethtroisi/gmp-ecm/blob/8ea5e214fdf2f0ddf9415141b8dc039ed6f5874e/README.lib)です。

## Alpertronと残件
公式HEADを4854656a050f280397d7908efa42fca8114c8297に固定し、選択原本のGit blobとSHA256を照合しました。
siqs.cは135068bytes/SHA256 011c0f7519743dae016891e503960c17651a302bb5cb51c772086677a40ac2fdです。
GPL系原本の公開配布は未承認で、可変の公開サイトを速度基準にしません。
初回の独立readは自動承認レビューに拒否されましたが、追加許可根拠に基づく同一readの1回再試行で解消しました。
[8原本の独立静的確認](alpertron-source-review.md)が完了し、完全冪・無期限再試行・signed演算等のport条件を特定しました。
WASM build・RAM適合・性能比較は未実施です。
UI/site/CSP/公開license/配布/Ready/merge/deployは変更しません。
