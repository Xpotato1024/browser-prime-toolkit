# CIの全件単体試験と再ビルド後の保証

同一workflow実行の同一checkoutでは、全件の `npm test` を `CI / test` で1回実行します。
このjobは必須の通常jobとして残し、他jobの成功や変更pathを条件にして省略しません。
原本取得を専用jobで共有した後、consumerは並列で従来の固有検査を実行します。取得・固有検査の失敗は成功扱いにしません。

## 再ビルド後の検査

- supplementary: 独立2ビルドのbyte一致、既存の生成物とreceiptのdiff検査、native sanitizer、source/artifact check、実browserを保持します。
- counted: dense／Lanczos各2ビルドとtracked artifact／receipt一致、両native検査、check、4 variantの実browserを保持します。
- RSA: Workerの `--check`、profile check、実browserを保持します。
- full SIQS／lab／tuned: 各2ビルドのWASM・glue・正規化map一致、tracked生成物／receipt一致、native、固有checkと実browserを保持します。
- 上記6jobでは、全件試験の代わりに再ビルド／native後の `git diff --exit-code --` でtracked差分を拒否します。
- staged／private UIは生成物を書き換えず、固有check、実browser、進捗の実ピクセル検査を保持します。

同じtracked生成物を全件試験した保証と、再生成結果の一致を組み合わせます。
独立2ビルド、数値・資源・取消・CSP・provenanceの検査は削除しません。
Node/npm pin、実checkout identity、job名、権限、timeoutも維持します。

## 実行identityと効果の境界

pushのHEADとPRのsynthetic mergeはtreeが同じでもidentityが異なります。
`ci-execution-identity.mjs` のcheckout／event／tag検査を維持し、pushとpull_requestの両発火を残します。
mainとtagの同commit実行も今回まとめません。取消設定やretryの変更も含みません。

全件試験は総合CIの1実行あたり9回から1回です。他workflowの限定試験は維持します。
既存PR43のPR側全件試験は合計19分02秒、test jobの1回は2分14秒でした。
同じ時間を仮定するとrunner時間の削減候補は16分48秒ですが、変更後のHosted CI実測ではありません。
主要test jobの再ビルド・native・全件試験は残るため、完了までの経過時間の短縮は未測定です。

## 契約試験

`test/ci-unit-coverage.test.js` は全件試験の重複と、再ビルド後のtracked差分拒否を検査します。
変更前は2件失敗、変更後は既存の実checkout identity試験を含め10件成功しました。
全件試験／checkとHosted CIの時間・結果は、対象HEADに結び付けた引渡し証跡で報告します。

## 原本共有jobへの依存

CI安定化で追加した `reviewed-source-archives` だけをtestの依存先として許可します。他の検証結果やpath条件で全件試験を省略しません。
既存5consumer名を維持し、各jobを `always()` で開始して最初にproducer成功を要求します。原本取得失敗時にrequired名がskipped=pass扱いになることを避け、明示failureにします。
成功時だけ同じ実行のartifact IDを検査し、各checkoutのsize/SHAでraw archiveを再検証して、既存build・native・browserの全chainへ進みます。詳細は[原本共有契約](../contracts/ci-source-archives.md)を参照してください。
