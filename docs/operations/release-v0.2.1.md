# 0.2.1 GUI改善の配布

比較元はv0.2.0（488ee538855110be3c718e2e03490bb1da53bf12）。
通常の入力操作を「入力例・実行条件・分解する」に整理し、待機中から工程進捗欄を表示する。
入力編集やサンプル選択後の結果を「前回」と明示し、操作列の位置と非同期コピーのfocusを保つ。
技術説明は既存の詳細へ集約する。計算中の取消は独立操作として維持する。

入力・数値kernel・共通routing・有限予算・React island API v1・manifest schema・依存・CSPは変更しない。
309桁/1024bitは通常の受付範囲であり完全分解の保証ではない。
333..400bitの明示大メモリSIQSは従来どおり実験的で、均衡半素数の全分解は未検証。GNFSは含まない。

日本語release notes、同一tag対象の対応ソース、runtime ZIP、checksums、RELEASE-PROVENANCE.jsonを新規版へ対応付ける。
独立2 clean buildの全ファイル一致と実distの入力/進捗/取消/コピー/Worker退役/通信を確認する。
push/PR/main/tagのCIはevent・head・実checkoutを区別して追跡する。失敗時は原因を記録し、単なる再試行で隠さない。
過去の実測原本・旧tag/assetを保持し、v0.2.0は上書きしない。npm公開はしない。
Site側の採用・license配置・本番配信は別担当へ固定version/source/asset hashを渡す。

既存GUI head2419a59のローカル832試験と全体checkは成功。
Chrome155の配布物操作23件、方式遷移16件、ライト/ダークtoken fixture5群は成功。
版情報更新後と最終tag対象の検証は別証跡で確認する。
Firefox/WebKitは検証用binary未配置で未実施。実機スマホ・Safari・実ソフトキーボード・screen readerは未検証。
dark token fixtureは実Siteのdark統合確認ではない。
