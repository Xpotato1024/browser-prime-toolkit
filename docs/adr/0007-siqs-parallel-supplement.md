# ADR0007: SIQS・2 Worker・補助方式を有限条件で再評価
状態: 非公開評価。2026-10-19、実装・測定前に固定。
PR6の1秒結果だけで探索を区切る判断を訂正する。公開採用・既定selectorの変更ではない。

## 固定する実験
- 既存SIQS artifactを変更せず、smokeと既存/holdout一般半素数の少数問を10秒・30秒、50M checkpointで測る。
- 主計測は既存binding。別profile bindingでphase別wall近似・callback数・log・管理peak・停止reasonを保存する。
- profileは追加時計読みの観測負荷を持つ。主計測と混同せず、50Mが先なら時間枠を使い切ったとは呼ばない。
- 既存balanced-13-0、balanced-96bit-0、balanced-112bit-0、holdout-balanced-80/112を対象にseed1（holdout23）、各枠1回。
- smoke1000000000100000000002379を10秒1回。完了を事前保証にせず実測として別記録する。
- 上流msieve/Alpertronは公式commit/hash/license/APIを先に確認。既存denseと上流Lanczos未使用を明記する。
- full msieveは固定sourceのnative最小参考を有限host timeout内で試す。native結果をbrowser速度へ換算しない。
- Lanczosは独立の停止checkpoint・再試行上限・column所有権のadapterが必要。未実装なら未評価と記す。
- ECMは別評価artifact。同じjob共通32個の重複しないSuyama sigmaを1×32対2×16へ交互分配。
- 1/2本とも初期化込み総1000ms、総50M操作、線形合計128MiB以下。勝者・timeout・error・取消で全laneを破棄。
- 対象は既存balanced-13/96/112、holdout-balanced-112/unbalanced-m127、masterseed1/11、各1回。
- fresh Chromeを各trialに使い、cold asset取得を別記録し、request wall/初期化/実行sigma/Chrome全体RSS・PSSを測る。
- p−1は同じ固定GMP-ECM原本のstage1-only、B1=2000、base2/3の各1回。B2<B2minでstage2を無効にする。
- p−1正例・gcd=n例・非適合例は位数とlcm(1..B1)の合同式を計測外で検算。一般/holdoutにも同条件を適用する。
- p−1初期cascade/累乗とfast stage2はECM停止検証の対象外。小さな固定B1とhost terminateを併用する。
- p+1、SQUFOF、最適化/portは公式sourceで適用範囲を比較し、未測定方式を性能採用/除外しない。

## 安全性と証跡
既存測定のsource/hashを保存するため旧artifact/binding/buildは変更せず、新しいvariantを使う。
TDD、64MiB固定WASM、fatal退役、入力/因子の厳密検算、通信0/取消/再起動を維持する。
結果でseed/入力/総枠を調整しない。制約で実行不能なら対象と未測定理由を記録する。
最終HEADの独立review、npm test/check、必要CIを終えてDraft PRで親へ返す。
UI/site/CSP/公開license/配布/Ready/merge/deploy、別checkoutの再読は対象外。
