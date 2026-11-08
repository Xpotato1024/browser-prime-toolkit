# CI browser起動の統一と来歴

## 確認した構造

6b3c489の9workflowは33種類のbrowser entryへ到達していた。共通ready確認は5種類だけで、28種類はstderr通知だけを待っていた。memory samplerを使う27種類では、非同期sampler開始を待った後でready通知listenerを追加していた。これは[旧起動調査](staged-ci-startup-20261025.md)で扱った競合と同じ構造である。

ただし、個別の過去runで実際に通知を取り逃したか、DBus出力が原因だったかはログだけでは確定できない。原本取得の接続timeoutは[別の確認済み原因](ci-source-archives-20261109.md)として分ける。SIQS labの複合assertionについても[判定値が残っていない限界](siqs-lab-ci-20261109.md)を維持する。

## 新しいCI経路

[共通契約](../contracts/ci-browser-startup.md)に従い、owned Chromeをspawn直後から観測する。profileのport情報と実際のloopback endpointを使い、stderr通知を必須にしない。元の15秒/30秒上限をport取得とCDP接続で共有し、数値処理の予算は変えない。

凍結したoriginalから生成するstartup adapterと共通lifecycle helperを使う。registry、変換anchor、生成物一致、workflow/package到達入口をcheckで検査し、入口の脱落も拒否する。9workflowとverify aliasを合わせた35入口を検査対象とする。

旧driver・実測raw・receiptは保持する。新receiptのciExecutionはCI契約検査であることを明記し、originalだけでなく実行adapter/registry/generator/transform/helperのhashを保存する。新経路を旧driverの性能実測として解釈しない。

計測再現用benchmark alias6本は変更していない。歴史的driverを直接指定する経路も維持する。新しいverify aliasはCI契約用とし、registryに列挙した限定case/familyだけを許可する。optimized low-capやsustained fixed-familyなど、CIが従来使う限定検査は削らない。

## 回帰と受入

- 起動通知の欠落/遅延、spawn/exit、接続不能、切断とpending、samplerとserverのhang、cleanup失敗を決定論的に検査する。切断後の診断CDPで失敗処理が再び待たされることを防ぐ。
- 事後のcounterfactual確認では、exact6b3のworkflow/package/sourceを新checkerへ渡すと旧verify-supplement-ci入口を拒否し、現在の構成は35入口を受け付けた。これは過去の個別CI失敗を再現したという主張ではない。
- 初期の未作成moduleによるimport失敗は挙動レベルのredとして数えない。新しい回帰が旧構成を拒否することと、現行helperの正常・失敗・解放経路を分けて確認する。
- 実Chromeと最終commitのtest/check、push/PRの確認回数は[固定した受入条件](ci-reliability-acceptance-20261109.md)に従う。全てをgreenに見せるための無変更retryは行わない。

production src、原本pins、独立build recipeは変更していない。サイトのexact9cf/0.2.5 artifactは保持できる。UIの再設計、因数分解性能の向上、起動時間の保証、本番公開をこのCI変更の成果として主張しない。

候補のfocused89試験と、事前列挙した実Chrome35 invocation（31 unique入口と限定case4件）が全て成功した。旧stderr bannerを取り除く実Chrome確認も成功している。これは反復性能比較ではない。残るshared4入口は最終diff影響範囲として別途各1回確認し、最終commit/Hosted CIと合わせてPRへ記録する。
