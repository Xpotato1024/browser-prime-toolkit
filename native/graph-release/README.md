# 不可逆な抽出移行のartifact

[有限契約](../../docs/contracts/graph-release.md)に従う実験用artifactです。
比較baselineは[Stage25 compact root](../graph-profile/README.md)です。
公開入口・旧source・原本は変更しません。

既存の検証済みcacheを `PRIME_RUS_SOURCE_DIR` に指定し、
`node scripts/build-graph-release.mjs release` でネットワーク無効の固定imageから各2回構築します。
収集状態の不可逆な終了、列を保持したgraph解放、matrix中間配列の寿命短縮を行います。
計算器・数値パラメータ・dependencyの元matrix検証・proper divisor検証を維持します。
上流はApache-2.0 OR MPL-2.0、追加patchとadapterはAGPL-3.0-onlyです。
