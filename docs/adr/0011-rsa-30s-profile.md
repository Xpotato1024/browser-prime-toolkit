# ADR0011: RSA向け30秒評価の独立profile
状態: private Draft。Stage10後の直接依頼に基づく設計・TDD。旧profileと教育用比較データを変更しない。

公式RSA challengeの値をそのまま入力できる範囲と、方式が実際に扱える範囲を分ける。新profileは最大2048bit・617十進桁、初期化込み30000ms、1 request/1 Worker、2億計算checkpoint。入力・結果・引用元の全桁は文字列/BigIntだけで扱う。新しい整数型・remote code・保存は導入しない。

最初の実行backendは既存のnative BigInt Brentを固定利用する。旧staged128bit選択やGMP256bit・SIQS128bitのC/WASM上限を緩めない。RSA向けprofileで未導入のGMP/SIQS指定、あるいは実際の対応範囲外は、Workerを作らず未対応とする。これはRSAを30秒で解ける方式を選定したという判断ではない。

新しいprotocolとWorker bundle、host evaluatorを別ファイルへ置く。host deadlineは入力検査前から始め、生成・読み込み・計算・応答・積/確度検証を含む。初期化には同じ枠内で5秒上限、計算への配賦は残時間から25msを控除する。時計やevent loopの遅れで停止応答が30秒を超え得ることを記録する。

取消・timeout・fatal後は必ず単一ownerを退役し、自動再起動しない。evaluatorは中止完了まで次のrunを拒否する。dispose/遅延/不正packetを試験する。退役に失敗したevaluatorは再利用しない。入力0/1はneither、未対応は0 Worker。

結果はunsupported、timeout、incomplete、factorized、prime、probable、cancelled、fatal、neitherを区別する。operation-budgetやalgorithm-resourceを30秒timeoutへ丸めない。積/余因子で元の入力を再構成し、probableは素数証明や分解成功へ数えない。完了packetのprobable因数はhostでも固定7底の検査を再確認し、その時間もdeadline内とする。

このnative経路のWASM領域は0。2048bit入力・factor数2048・packet262144 bytesを上限にするが、JS/Chrome全体のheap hard limitは主張しない。全Chrome process treeの標本RAMを別に残す。新SIQSの大規模行列・buffer・heap方針は[実上限と拡張設計](../architecture/rsa-backend-limits.md)へ戻し、上限だけを変えない。

[一次資料の53入力](../../bench/staged-rsa/catalog.json)には既知因数を一切含めない。RSA-129は参照した公式一覧に含まれず、別の原出典を得るまで未収録とする。旧名称の十進桁と新名称のbitを別欄で保持する。

TDDはcatalog/plan→結果契約→Worker/hostの期限・取消・不正packet→実browser。既存engine/Worker/raw/UIを保全する。最後に同一HEADのtests/check/CIとread-only独立レビューを揃え、別の非公開Draftにする。RSA性能指標はprofileが検証で固定された後の測定だけを実績とする。

追加判断: 旧engineの5千万上限を流用した予備5試行は17秒台でoperation-budgetとなったため、30秒能力評価の完了とは扱わず[原記録を保全](../benchmarks/archive/staged-rsa50m/README.md)する。RSA専用v2は有限2億上限を持ち、shared Budget/arithmeticを変更しない。driverとverifierはimports/normalizer/operation上限だけを分離し、check-rsa-coreで旧版からの許可差分を機械照合する。每checkpointの時計確認・取消terminate・host deadline・入力/factor/packet制限を維持する。2億でも早期停止すれば再び未完了として評価境界を返す。
