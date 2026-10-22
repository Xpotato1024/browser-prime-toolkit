# Full SIQS最適化と次の比較

[固定6試行](../benchmarks/llm01-full-opt.md)で、LTO＋監視間隔変更は64桁の同じnative workを約30.6%短縮しました。RSA-100は候補が既存ふるいブロック400万の資源上限、baseが600秒の時間上限で止まりました。RAM不足やSIQS方式全体の限界とは判定しません。

既存msieve1.53の汎用C／WASMと現在のSIMD対応SIQSを区別します。最新rusqsieve0.5.0は独立のライセンス・pin・ABI6・bounded memory・取消・有限輸送・因数検算を成立させた後の比較候補です。旧0.4.0や他CPU／多数Workerの既存報告を今回の達成予測に換算しません。

512MiBはWASM線形メモリの総上限です。Chrome全体RAM、allocator使用量、JS側コピー、関係式graph、filterと行列の最大値は別途計測します。資源上限を上げるだけの変更をメモリ最適化と呼びません。小さい初期割当から上限まで伸びるbounded growthと固定割当も区別します。

既存のraw・source・失敗と負の結果は維持します。次の比較でも同条件の時間・メモリと相反する効果を記録し、公開判断は別途残します。
