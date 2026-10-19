# RSA challenge 30秒指標の計画
状態: UI完成後の別評価。2026-10-19の本人依頼を記録し、今回のPRでは性能測定をしない。

## 目的と現在の範囲
指標は「固定したブラウザ環境で、初期化を含む30秒以内に完了した公開RSA challengeの最大例」とする。普遍的な分解上限や暗号の安全性の保証とは扱わない。成功しなかった対象、試行していない対象も併記する。

現在の選択engineは0 <= n < 2^128だけを受理する。30秒へ延長するだけでは入力域は広がらない。RSA challengeを範囲外のまま投入したり、上限だけを変更したりしない。

## 一次資料と名称の確認
- [RSA Laboratoriesの2001年原本の保存](https://web.archive.org/web/20010805210445/http://www.rsa.com/rsalabs/challenges/factoring/numbers.html)はRSA-576からRSA-2048までの新しい8課題を掲載する。この命名はbit数。
- [RSA/EMCの公式履歴の保存](https://web.archive.org/web/20130921041734/http://www.emc.com/emc-plus/rsa-labs/historical/the-rsa-challenge-numbers.htm)と[公式FAQの保存](https://web.archive.org/web/20130921043454/http://www.emc.com/emc-plus/rsa-labs/historical/the-rsa-factoring-challenge-faq.htm)も、576bitのRSA-576が174十進桁であることを確認できる。これは現行128bit範囲外。
- [Aokiほかの原著論文 IACR 2004/095](https://eprint.iacr.org/2004/095)は旧RSA-100〜150を十進100〜150桁の対象として報告する。旧名称と新bit名称を混同しない。旧一覧の全modulus・正確なbit数は今後原本を取得して照合する。100十進桁でも128bit範囲を超える。

測定開始前に原本URL、取得日、原本hash、modulusの全桁を固定する。各modulusから十進桁数とBigIntの2進長を独立計算し、名称とは別欄に記録する。原本の入手に失敗した対象を推測や二次情報だけで埋めない。既知因数を入力・seed・探索のヒントへ使わない。

## 範囲拡張が必要な場合の先行判断
公開RSAを扱うには算術backend、文字列とnative buffer、WASM領域、演算予算、素数確度、選択方式の設計を先に見直す。新しい原本のpin/license、再現build、境界テスト、sanitizer、Worker退役と積検証の受入条件を用意し、必要な資源と変更対象を本人へ返す。サイト統合・配布・license・CSPの承認をこの測定依頼から推定しない。

## 測定条件と報告
LLM-01のCPU/RAM/OS、Chromeの正確なversion、headless条件、WASM build/source hash、Worker数1、全パラメータを固定する。入力ごとに5反復（seed 1,11,23,41,67）を基本とし、各反復は新しいbrowser/Workerで行う。初回asset取得時間は別記し、取得後の計算・変換は通信ゼロを検査する。

30秒はWorker生成前からcompile・初期化・計算・応答・結果検証までのhost期限とする。停止要求から退役までの遅延も報告し、壁時計30秒を厳密に保証するとは表現しない。既存の演算上限・固定WASM領域・ブラウザ全体の標本RAMを併記する。初期化費用を除いた計算時間だけで30秒成功としない。

成功数/試行数、完了時の中央値と範囲、全試行の壁時計時間、未完了・取消・fatal・範囲外、実測条件を表にする。因数積と余因子で入力を厳密再構成し、各因数のproven/probableを区別する。probableを証明済み完了と数えず、別欄で報告する。全失敗や範囲外だけの場合は「測定した範囲で30秒完了を確認できない」と明記する。

最大成功例の名称・十進桁数・bit数と、その次に試した未完了例を並べる。既存比較rawは不変に保ち、新しいコーパス・手順・receipt・限界を別成果物へ保存する。
