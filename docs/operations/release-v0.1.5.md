# v0.1.5 の公開・Site 採用

承認済み GUI と Site 表示契約を保持し、PR35 統合後の `340778cc80c4a731b19e76d126a2ca98bda3a599` を基準に版情報と対応ソース案内を揃える。計算エンジン、依存、入力受入条件、実行予算は変更しない。PR35 の main は全9 workflows／26 checks が初回成功し、レビュー済み head と同じ tree である。

`v0.1.3` と `v0.1.4` は変更しない。前者の tag CI は raw tag object と checkout commit の比較で失敗し、後者は Actions checkout によるローカル tag ref の正規化で失敗した。PR35 は全履歴の2段階 fetch と浅い checkout の双方を実 Git で再現し、元のイベント object・タグ名・双方の peel・実 checkout を別々に照合する。欠けた元 object だけを既存 origin から一度取得し、失敗時には停止する。既存タグに Release・配布アセットは作成していない。失敗した旧 tag CI を成功扱いにしない。

最終 head のテスト・check・独立レビュー・PR CI 後、通常マージして main CI とレビュー済み tree の一致を確認する。実際の tag target から2つの clean checkout を作り、全配布ファイル・manifest・capability 情報・LICENSE／NOTICE／第三者通知の完全一致を確認する。対応ソース ZIP は全 tracked files と実 tag target を結び、provenance は実際の commit／tree／CI run とファイル hash を記録する。注釈付き新タグの全 CI 成功後だけ Release と添付ファイルを公開し、匿名取得した各ファイルの hash と本文を照合する。

Site は正式 Release の検証済み配布物と同じソース・manifest／capability hash・版へ固定する。PR117 の承認範囲と既存 GUI／SEO／共有／関連記事を保持し、PR115／116 は含めない。Site のテスト・ビルド・独立レビュー・最終 CI と合成画面の受入後に通常マージする。成功した main producer の固定 Production artifact を既存 GitHub 手動配信経路で一度配信し、公開ページ・配布ファイル・入力／結果／設定／取消／コピー／共有先 canonical と通信制約を読み戻す。資格情報・権限・CSP・監視設定は変更しない。

v0.1.2 tag CI の Native validation 初回失敗と同じソースでの1回再実行成功（初回原因未確定）、PR31 main の Chrome 起動失敗と PR33 の監視修正、v0.1.4 main の固定 GMP 取得 timeout と同 SHA 失敗 job の1回再実行成功は履歴として保持する。実機 iOS／Android、Safari アプリ、soft keyboard／autozoom、実 BFCache、スクリーンリーダー、OS clipboard 拒否画面、長時間・多 Worker 性能は未検証。desktop WebKit の結果を実機保証へ拡張しない。
