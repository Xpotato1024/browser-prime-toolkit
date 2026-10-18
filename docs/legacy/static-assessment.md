# 受領 ZIP の静的評価
日付: 2026-10-18。受領プログラムは実行していません。

Prime_numbers.zip: 38,990,798 bytes
SHA256: 276401ce9c31cf22d687831fd507aa0f30c8bb73296c7f9f14568fabe49d5c20
外側46エントリ、ファイル31件。アーカイブはリポジトリ外に保存しています。
WordPress版、Flask版、設定のみの prime_number フォルダ、重複する入れ子ZIPを確認しました。
Flaskの入れ子ZIPには Windows Python .venv が含まれます。流用しません。

WordPressとFlaskで factor_worker.js、main.js、gmp-wasm bundle は同一です。
用途は素数判定と素因数分解。Flaskは配信wrapperで計算backendではありません。
gmp-wasmヘッダーは v1.3.2 / LGPL-3.0。独自部分のroot license、再現可能なbuild/pinは確認できません。

- isProbablyPrime(25) の結果を確定的な「素数」と表示しています。
- 0/1 の扱い、入力制限、無期限ループ、取消・予算が不足しています。
- 非同期応答に job ID がなく、現在の入力と提出済み入力が取り違わされます。
- innerHTMLへの入力補間と外部MathJax依存があります。
- 累乗集約とコピー機能はありますが、安全な表示と計算の責務を分離すべきです。

この評価は静的読解です。旧コードの速度、実行成功、数論的正確性を保証しません。
旧コード、bundle、仮想環境は取り込まず、要件を再設計します。
