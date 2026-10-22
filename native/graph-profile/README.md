# Graph保持形式の実験artifact

既存の固定rusqsieve 0.5.0とローカルDLP patchから、新しいnamespaceだけを生成します。
原本、旧artifact、receipt、公開入口は変更しません。
契約は[有限評価](../../docs/contracts/graph-profile.md)、upstreamの
[出典とライセンス](../rusqsieve/README.md)を参照してください。

`PRIME_RUS_SOURCE_DIR` に既存の検証済みsource cacheを指定して、
`node scripts/build-graph-profile.mjs baseline` と `compact` を実行します。
全upstream file hashを検査し、ネットワーク無効の固定Docker imageで各2回clean buildします。
`node scripts/check-graph-profile.mjs` はsource/receipt/artifact/cap/生成物を照合します。

baselineは計測のみ、compactはforest rootをlossless LE bytesに保存します。
sign、指数、LP、family packetと既存Natural演算は維持します。
診断コードはAGPL-3.0-only、upstreamはApache-2.0 OR MPL-2.0です。
WASMの256MiBはlinear memoryの上限で、ChromeやJSの総RAM上限ではありません。
