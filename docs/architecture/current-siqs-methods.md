# 現行手法と今回の時間・資源条件

今回の比較は、古い汎用msieve1.53の遅さをSIQS全体の限界と扱わず、固定したrusqsieve0.5.0のSIMD／double-large-prime／現行の行列経路を別に評価します。公式releaseとmainは4b150834b57636f6ebc350a81321a15c1cd901d2で一致しました。旧0.4.0は過去実績の参照だけに保存しています。

上流の[後続mainのRSA-100記録](https://raw.githubusercontent.com/metastable-void/rusqsieve/main/BENCHMARKING.md)はXeon6975P-C上のnative・192 Workers・約1.95GiBで54.01秒です。これは固定0.5.0 sourceの記録ではありません。固定commitの過去gateはXeon8259CL・96 Workers・320.10秒・1.48GiBで、host/版を混同しません。少数Worker／512MiB／実Chromeと条件が異なるため、今回の完了予測へ換算しません。上流文書の0.5.0検証toolchainはRust1.97.1ですが、今回の再ビルドは互換性と原本を固定したRust1.90.0です。配布binaryの再現ではなく、明示したcompilerでの2clean一致です。

GPUの[2026年preprint](https://arxiv.org/html/2610.07126v1)はH100で29.2秒、RTX5070Tiで51.0秒のRSA-100を著者が報告しています。別hardware、CUDA、別parameter・メモリ条件で、本タスクは未追試です。WebGPUやbrowserへ移せば同じ速度になるとは推定しません。GPUのSM別調整には別deviceで遅くなる例もあり、layout・粒度・転送の考え方と、その数値を分けます。

今回実装した資源節約はimmutableなcontext共有、有限なtransfer輸送、native buffer即時free、行列前のlocal context解放、Blob URL早期解放、bounded growthです。上限引上げを最適化として採用していません。共有と解放の効果はcopy↔drop／copy↔retainで分けます。初期heapの削減が全工程peakや時間を改善しない結果も保存します。

さらなるfactor-base／interval／LP設定探索、compiler更新、filter／行列別の割当計測、GNFSのbrowser移植は別の仮説です。現在の14固定比較へ途中追加したり、他環境GPUや未レビューbinaryを実行したりしていません。600秒未完了はその条件の結果であり、数学的・技術的な不可能性の証明ではありません。完了見込み時刻は線形外挿しません。
