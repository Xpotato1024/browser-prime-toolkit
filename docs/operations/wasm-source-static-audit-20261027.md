# 生成WASMとJSラッパーの限定静的監査

2026-10-27。対象基点: 99133842d311d944d09f258bd29afd3d17ba9514 / v0.1.5。
隔離実体・生成WASM/worker bundle・拒否済みarithmetic.jsの読取、復元、再取得、再生成、実行は行っていません。
UI fixtureの検証結果は、この監査や実engineの安全性・性能の証明とは別です。

## 判明したこと

出所はこの開発の固定ソース、patch、生成スクリプトです。出所不明のダウンロードとして扱う状況ではありません。
隔離実体そのものが期待した生成物と同じかは未確認です。この区別を維持します。

26ファイルを明示allowlistにした静的確認を行いました。build-optimized-128.jsonのsourceHashes20件は全一致しました。
既存記録は29 compiled sourceのhashと2回のclean build一致を保持します。今回buildを再実行した記録ではありません。
upstreamの71ファイル全体・コンパイラ内部・生成バイナリを今回全面監査したという意味ではありません。

- 生成元: scripts/build-optimized-lowcap.mjs。上流archiveと各sourceのSHA256を照合してpatch後、固定imageでrustcを実行する設計です。
- 上流rusqsieve 0.5.0 / commit 4b150834b57636f6ebc350a81321a15c1cd901d2。
- image sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4、rustc 1.90.0。
- scripts/container-compile.mjsは入力pathの相対・正規形を検査し、host mountなし、network=none、cap-drop=ALL、no-new-privileges、有限CPU/RAM/PID/tmpfs/timeoutでcompileします。
- コンパイラ出力を2回比較し、同じWASM bytesをBase64定数にしたJSを生成します。生成JSに別の実行本体を加えるコードはこのgeneratorにはありません。
- root lockの外部packageはreact19.2.8、react-dom19.2.8、scheduler0.27.0の3件。registry.npmjs.orgのresolvedとintegrityがあり、このlock上で追加install scriptは宣言されていません。
- コンパイルはCargo依存解決を使わないdirect rustc方式です。lock3件の確認だけでRust全依存の完全監査とはしません。
- 確認したJSは固定bundled bytesをatobで戻し、メモリ/ABIを検査してWebAssembly.instantiate(bytes,{})へ渡す構成です。
- memoryContract/resourceMemoryContractはWASMの開始関数とimportsを拒否し、非共有メモリの上限を検査します。対象の既存記録は初期1,114,112 bytes、最大134,217,728 bytesです。
- これはvalidatorの設計と既存記録の確認であり、隔離実体に対してvalidatorを今回実行した結果ではありません。
- Worker生成は固定sourceをBlob URLにしmodule Workerへ渡すものです。生成失敗時のURL回収と明示releaseSourceを持ちます。ユーザーの整数はmessageの値で、JS sourceへ連結する仕組みは確認していません。
- allowlist範囲でeval/Function、fetch/XHR/WebSocket/EventSource/sendBeacon/importScripts、localStorage/sessionStorage/IndexedDB/cache/serviceWorker/cookie使用は見つかりませんでした。文字列走査に加え、該当wrapperと生成/compile経路を静的に読みました。
- Rustのextern "C"一致はpub externのWASM ABI exportでした。std::net/fs/processやnative Command呼出しの一致は、この範囲ではありません。
- observerのunsafeは単一thread・非共有WASMのallocation計数です。unsafeという語やC ABIだけをOS上の不審なコード実行とは解釈しません。

## 検出理由について言える範囲

Defenderの検出名はTrojan:Script/ObfusScript.A!mlです。[公式の検出名ページ](https://www.microsoft.com/en-us/wdsi/threats/malware-encyclopedia-description?Name=Trojan%3AScript%2FObfusScript.A%21ml)は、この検体の判定根拠を公開していません。
長いBase64定数、WASMロード、Blob Workerは静的な見た目として存在しますが、それが判定理由だと示す証拠はありません。通常のブラウザ内WASMロードと不審な追加実行を混同しません。
対象は577351 bytesの生成JSで、内部WASMの既存hashは89edd54d48954c7b0a86c2ba7875e5f36c122bc1ea798872cf2dea7e356ea6b3です。
Git期待blob SHA1は50733f1c2fce41ad13d1be5a410238775f0d6d0cです。どちらも隔離実体JSのSHA256の代わりにはなりません。
現在選定128MiB runtimeの記録は別hash5fb2f2ddd292c6f488f94640145e82f3d7eecdf6b14140ae5e5a477e8c3c1d25を参照します。検出された旧生成物と現在の公開runtimeを同一視しません。

## 是正判断と次の手順

今回の限定範囲で、除去すべき悪意ある機能や検出原因を確定できていません。検出を消す目的でencoding、名前、実行環境を変える修正はしません。
監査性を高める将来の候補は、生成JS自体のhashをbuild receiptへ明示すること、source/recipe/選定配布物/歴史的実験生成物の役割を明確にすること、対応ソースとprovenanceを維持したrelease gateです。
確認したworker-bodyにはoom-probeという診断commandもあります。本番に不要な診断機能を配布から分けることはhardening候補ですが、公開bundle実体を今回未検査のため残存や脆弱性を断定しません。診断commandを実行していません。
これらのbuild/Worker sourceを変更するとpin・再現build・実engine回帰が必要になります。隔離対象の再生成/実行前には、現在の拒否境界を親へ戻して手順を確定する必要があります。

[Microsoft公式再判定](https://learn.microsoft.com/en-us/defender-xdr/submission-guide)と、許可された経路での真正な実体照合が未完了です。誤検知、無害、根本解決、計算機能の再開可能性を保証する報告ではありません。
同じ復元の再試行、代替取得、保護無効化、除外、検体送信は行っていません。実装修正が必要と判明したときは、疑わしい機能と到達経路を特定してから是正し、検出回避目的の変更と分離します。
