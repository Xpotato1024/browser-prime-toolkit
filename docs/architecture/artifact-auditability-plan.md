# 配布物の監査可能性を高める構成案

対象はbrowser-prime-toolkitの生成元・生成工程・成果物の追跡です。配布時のsource-to-output receiptと検査をローカル実装しました。移動・隔離生成物の再生成・実配布build・公開は実施していません。
検出回避、同じ検体を別形式や環境で試すための計画ではありません。Siteのcanonicalなプラグイン契約や既存の公開pinを置き換えません。

## 現状から解決したい問題

- recipeとRust patch、nativeのbuild receipt、src内の生成JS、選定Worker mapping、release checksumは存在する一方、各hashが何を表すかを横断して読む必要があります。
- 既存receiptの内部WASM SHA256やGit blob SHA1だけでは、隔離されたJS実体との同一性を確認できません。
- 旧実験生成物と選定runtimeではhash・役割が異なります。旧実験を現在の公開runtimeと混同せず、履歴と対応ソースを保ったまま追跡できる目録が必要です。
- この不明瞭さは監査上の改善対象です。Trojan検出の原因と確定した問題ではありません。

## 推奨する最小変更

まずディレクトリの大移動ではなく、build receiptに型付きの入出力情報を追加する案を推奨します。

| 情報 | 記録する内容 |
| --- | --- |
| source | repository、固定commit、upstream archiveと各sourceのSHA256 |
| recipe | build script・patchのpathとSHA256、設定、役割別上限 |
| toolchain | compiler版、container digest、既存取得物のhash |
| outputs | 各JS/WASM/Worker/manifestのpath・種別・bytes・SHA256 |
| derivation | どの入力・recipeから各出力を作ったか、clean build比較結果 |
| purpose | selected-runtime / evaluation / historical の役割 |
| source offer | 対応ソース・第三者条件・license・再現手順への参照 |

Git object ID、内部WASM digest、生成JS digest、最終zip digestは別の型・欄にし、検体digestとして流用しません。
receiptが自分自身のhashを内包する循環にはせず、外側の配布manifestがreceiptと各配布資産をhash固定する構成にします。
既存のSite manifest/pin、配布元receipt、ライセンス対応表の値が分岐しないよう、build時に相互照合します。別のruntime SDKや仕様repoは増やしません。

## 将来の配置を変える場合

source・patch・recipeは編集対象、generatedはbuild出力、distはレビューして採用する配布単位、と役割を明確にします。
例えばgenerated/<engine>/<role>/以下へkernel、worker、receiptをまとめる案は可能ですが、今のsrc/nativeパスを機械的に移動しません。
既存の測定SHA、原本、Git履歴、旧releaseと対応ソースを維持し、legacyも目録で参照可能にします。現行の配布graphから不要な実験生成物を除けるかは、import graphと検査・対応ソース条件の確認が必要です。

Base64同梱を維持する案と通常の同梱WASM資産へ分ける案は、監査性・初回準備・offline境界・CSP・hash固定・保守負荷で比較します。
形式を変えれば検出が消えると主張せず、検出済みbytesを別形式へ変えて実行しません。形式分離はsourceと実体の判断、正規経路での再開条件を満たした後の別変更です。

## 実生成物の検証・配布へ進む条件

1. 隔離実体の同一性と、ベンダーへ確認するために必要な情報・許される取扱手順を確定する。
2. 対象source/recipe/output一覧と、変更しない旧release・測定資料を固定する。
3. 許可されたbuildで出力JSとWASM双方のdigest、再現性、禁止import・開始関数・メモリ上限を確認する。
4. 実distのUI/入力/取消/解放/通信/対応ソースとSite固定採用を別々に検証する。

現在は1が未解決です。隔離物に依存しない配布recipeのreceipt実装とfixture試験は、[実装範囲](../operations/artifact-provenance.md)へ記録しました。内部WASM・Native receipt連鎖、実distの照合、clean rebuild、安全性判定、検出の解消は未完了です。
