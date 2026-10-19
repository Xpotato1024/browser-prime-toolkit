# Stage10のTDD記録
非公開UIをview、session、DOM、preview、復帰・入力境界の順に小さく実装した。初期失敗と成功の出力はarchive/validation-logsのstaged-ui-*へ保存する。実行環境はLLM-01、Node24.19.0/npm11.19.0、Chrome142系（正確な版は固定receipt）である。

| 境界 | 実際のRED | GREEN |
| --- | --- | --- |
| 表示モデル | Not implementedで5失敗 | 全桁・冪・確度・残余・0/1の5成功 |
| session | Not implementedで5失敗 | 表示とsessionの計10成功 |
| DOMと既存Worker | mount stubでUI要素不足8失敗 | 実Worker・DOMの8成功 |
| loopback preview | Not implementedで3失敗 | 配信allowlist・path逃避・methodの3成功 |
| page lifecycle | Not implementedで3失敗 | 退役・復帰・閉鎖後無反応の3成功 |
| native長文挿入 | 4098文字が4096文字になるassertion失敗 | 全文字を保持して入力全体を拒否 |

DOM harnessの準備時にはsyntax errorもあったが、振舞いのREDに数えない。実際のDOM REDはred-browser-contractの記録だけを根拠とする。中間独立レビューでBFCache復帰とmaxlengthによる別整数受理のP2を受け、上の復帰/長文回帰を追加した。

最後のUI単体は16成功。実Chromeは9シナリオに加えnative4098文字挿入、Clipboard API往復、Enter/Tab、AX label/math name、320px幅を検証する。初回asset取得後にserver停止・offlineとし、page/Worker両方の通信監査にpositive controlを付ける。[固定receipt](../benchmarks/llm01-staged-ui.json)はソースhashに結び、最終HEADでも同じ検証を再実行する。

復帰は合成PageTransitionEventによる契約検証で、実navigationのBFCache hitの実測ではない。スクリーンリーダー音声は未確認。RSA30秒評価、公開UI/React/site adapter、license/CSP変更は今回の実装外。
