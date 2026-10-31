# 0.2.2 ECM Workerのhost bundle修正

基点はv0.2.1/source d963bc2f9e097c7c5ce1758dfd047407e2df9b7f。
報告入力11451419198101448524859159549219459514145142112で、公開Siteのminify後にECM Workerの参照名が失われる異常停止を修正する。
runtimeのFunction.toString組立てをproducerの固定生成へ移し、host minifierがWorkerの中身を書き換えないようにする。
生成物はcheckとbuilderで入力に照合し、8recipeのprovenanceへ生成元・既存GMP source/bytesを含める。

修正head21bc5a3のローカル835試験/check、minify後7件、Chrome操作23件/routing16件、独立レビューは成功済み。
これは版情報を揃えたheadや最終tag CIの証跡ではない。push/PR/main/tagのexact head・実checkout・attemptを別に確認する。
最終ソースから2つの独立clean checkoutでdistを生成し、全fileのbytes/hash一致と実distのhost minify/取消/再実行/退役/通信を確認する。
対応source ZIPはGit treeとblobに照合し、runtime/source/checksum/provenance/受入記録を新v0.2.2へ配布、匿名readbackする。
旧v0.2.1資産と測定原本を保持し、squash/rebaseや旧branch削除はしない。

数値kernel・入力/資源policy・proper-divisor検査・停止分類・取消/退役・React island APIv1・CSPは変えない。
通常309桁/1024bitは受付範囲で完全分解保証ではない。333..400bit SIQSは実験的で、均衡400bit全分解未検証。GNFSは含まない。
実機iOS/Android/Safari/Firefox等の未確認をChromeのviewport検証へ読み替えない。
Site採用・本番配信は別担当へ固定artifactを渡す。Site PR130やコピー共有UIとこの修正を混ぜない。
npm公開、資格情報/権限/監視設定変更、PR approval投稿は行わない。
