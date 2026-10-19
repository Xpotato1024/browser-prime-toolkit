# 0004: GMP と ECM の評価用経路
日付: 2026-10-19。状態: 比較実験。最終 engine の採用ではありません。

## 対象
PR3 の限定 MPQS と区別し、GMP 低位 mpz API を使う Brent と
GMP-ECM library を独立した評価用 Worker で測定します。
既存の整数入力、前処理、MR 判定、因子積の検算、予算、取消の契約を共用します。
BigInt の十進文字列を境界とし、Number への整数丸め、手製の多倍長型や
除算からの剰余合成、旧 ZIP bundle の継承は行いません。

## 原本とビルド
GMP 6.3.0 の公式 tar.xz を SHA256 で固定します。公式指紋の署名を確認しました。
署名時点の有効性と現在の鍵の期限切れを取得記録に分けて記載します。
ECM は開発者 mirror の完全 commit を固定し、library の採用ファイルと条文を確認します。
圧縮原本は repo 外に取得し、CI も明示取得・hash 検証後、通信禁止の固定 compiler
container で構築します。旧成果物の C、hash、実測 JSON は保存します。
生成物・build recipe・原本 pin・条文・再リンク手順をレビュー対象にします。

## 計算と資源
Brent は固定数の mpz_t scratch を再利用し、mpz_mod と mpz_gcd を直接使います。
ECM は固定 B1/B2、曲線数、seed、stage2 memory 上限を持ち、stop_asap で予算を確認します。
各 native 呼び出しは通常終了・予算終了とも全初期化済み変数を解放します。
単一 native 処理の途中まで厳密に割り込めるとは主張せず、host deadline と
Worker terminate を共用します。例外を C stack の解放前に JS から投げません。
WASM 線形メモリは固定上限です。複数 Worker の費用は本数分を記録し、自動並列化しません。

## 比較
PR3 から選んだ11問の検証済み因数・case ID を再利用し、新規6問を加えた17問で比較します。
古い長時間測定は繰り返しません。
同一入力、実時間予算、seed の試行条件で比較し、成功率と成功時時間を併記します。
前処理と warm kernel、初期化費用、メモリ上限を区別します。
方式ごとの operation は等価ではなく、実時間比較と独立の安全上限です。
真の SIQS は msieve 本体・Alpertron・FLINT を原本と契約で比較し、
MPQS を SIQS と呼ばず、未 port のものに実測速度を付けません。
GNFS の多段処理・relation・matrix・中断再開の判断は既存記録を引き継ぎます。

## 公開への境界
この private PR は評価に限定します。新しい公開ライセンス・サイト capability・
資格情報・権限・外部公開は変更しません。copyleft の必要な source 提供・再リンク等は
具体的な配布案を別途戻します。製品 UI、統合、merge、Ready、deploy は対象外です。
