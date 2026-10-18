# 数値入力と因数累乗の契約 v1

## parseIntegerInput(text)
文字列を受け取り、成功時は { value: bigint, canonical: string } を返します。
失敗時は IntegerInputError を投げ、code は INVALID_TYPE / INPUT_TOO_LONG / INVALID_SYNTAX /
EXPONENT_OUT_OF_RANGE / NOT_AN_INTEGER / VALUE_TOO_LARGE のいずれかです。

外側の空白を除いた ASCII 十進表記を使い、先頭 + と e/E の符号付き指数を許可します。
仮数は整数部を必須とし、小数点を付ける場合は小数部も必須です。
負の値、式、桁区切り、内部空白、16進、Unicode数字、Infinity、NaN は拒否します。
小数仮数は展開後が厳密に整数の場合だけ許可し、丸めません。
例: 1e3 → 1000、1.25e3 → 1250、100e-2 → 1、1.20e1 → 12。
1e-3、1.5、.5、1. は拒否します。0 と 1 は入力として有効です。
先行ゼロは除去し、ゼロは canonical = "0" に統一します。

初期限界は元文字列4096文字、正規化後1024桁、指数絶対値10000です。
指数上限はゼロにも適用します。ゼロ埋め・BigInt変換の前に検査します。
これらはリソース防御の初期選択であり、分解性能の測定値でも数学的上限でもありません。
値の演算に Number は使いません。上限確認済み指数と文字列長だけ Number を使います。

## groupFactorPowers(factors) / formatFactorPowers(factors)
2以上・1024桁以下の bigint の配列を最大4096個受け取ります。
前者は昇順の { base: bigint, exponent: number }[]、後者は "2^3 × 3^2 × 5" 形式を返します。
指数1は省略し、空配列は [] / 空文字列です。入力配列は変更しません。
無効な型は TypeError、範囲外は RangeError とします。
これは与えられた基数を集約する機能で、基数の素数性も完全な分解も認定しません。
UI は後続で構造化データから上付き要素を生成します。HTMLやTeXの評価はしません。
