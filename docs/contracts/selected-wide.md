# 反復比較後の選定 wide 経路

Stage44 の32試行を完了後、固定計画の判定で `resieve1`（境界係数2→1）を選ぶ。prefix は同時採用しない。性能根拠は [反復結果](../benchmarks/llm01-hotpath-repeat.md) の1Worker・RSA100先頭4familyに限定し、5Workerや全工程の短縮を外挿しない。

## 反映する範囲

- 新しい明示選択入口 `src/selected-wide/index.js` を設ける。既存 wide と同じAPI・手動1536MiB予算・1〜5Workers・owner1024MiB/helper64MiB・最大1時間・有限credit/輸送・softstop・cancelを維持する。
- owner1024MiBは実測済み `resieve1` のWASMをそのまま使用する。helper64MiBは既存 builtin64 のソースへ同じ関数の境界係数変更だけを施し、固定コンパイラ/imageで2回clean buildする。選定ownerと関数の完全一致、旧64との差がengine.rsのみ、hardcap64MiB/zero importsを検査する。
- Worker文字列は既存 wide のWASM定数だけを差し替え、定数を除いたprotocol/bodyのSHAを保つ。runnerは既存wideのfactory importだけを差し替えて生成し、挙動を手作業で分岐させない。通常UI・旧64/128/256経路・歴史artifactを変更しない。
- 新しい依存、外部コード、独自mod、追加配列、無限資源・保護解除を導入しない。新入口はサイト公開・本番統合ではない。

## 必要な確認と有限予算

先に入口・cap拒否・protocol/runner一致のテストを失敗させてから実装する。既存ownerの443 oracle、40/64桁・packet/column/counter検証と32試行は再利用する。新helperはRSA100先頭4familyを旧64/新64/成功原本と比較し、各context90秒・全体4分で停止、contextを解放する。Chromeの既存22契約（fresh40/64、取消、退役、メモリ、入力、offline）を選定経路で実行する。機能試験は速度比較とは扱わない。新しい性能候補・RSA100完走・長時間測定は追加しない。

最終headでnpm test/check、独立読取レビュー、必要CIを確認し日本語Draft PRに保存する。merge/release/本番切替をしない。性能改善が全サイズで成立することや改善余地の枯渇を主張しない。
