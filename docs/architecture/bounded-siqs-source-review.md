# 有界 SIQS の実行範囲と原本

PR5 の非公開評価です。[ADR0005](../adr/0005-bounded-siqs-runtime.md) を先に記録しました。
[固定 source 集合](../../native/siqs/sources.json) は msieve commit
c8727d91305bdbe0972d160ef0ce61dd02ce9193 の self-initializing polynomial、
sieve、relation、sqrt と既存 mp_t 算術を使用します。独自の整数型・除算剰余は追加しません。
新しい prime_sieve.c / squfof.c も同じ commit と public-domain dedication を確認しました。

上流 gf2/Lanczos はリンクせず、1024 行・1024 列の有界 bitset GF(2) adapter を使用します。
raw relation の parity、得られた null vector と組み合わせ、X²≡Y²、非自明な除数、
共通工程での積・有限 mr64 proof を検算します。64 個の依存関係候補を作ります。
これは上流 msieve 全体の性能ではありません。GNFS の短期見送りは維持します。

## 上限と終了
- dispatch の残余は奇数64〜128bit。範囲外に隠れた Rho fallback はありません。
- relation 16000、memory savefile 4MiB、A 多項式2048、derived 多項式32768、sieve block65536。
- 管理 heap32MiB、live allocation handle32768、matrix1024行/列、relation term64。
- 固定 WASM64MiB、stack1MiB、growth/pthreads/filesystem 無効。WASM exception/SjLj 対応が必要です。
- 原本の多項式選択が成立しない64bit入力も algorithm-resource の未完了です。
  受理範囲内の全入力で分解できるという契約ではありません。
- 上限・checked allocation 失敗は algorithm-resource、予算停止は元の reason を返します。
  全所有割当を解放後に復帰します。savefile EOF は最後の有効行を保持します。
- 未知の内部異常・trap は成功へ変換せず、poison と Worker error/terminate で退役します。
  fatal 後の回復は新しい Worker による初期化です。

保存先は C の memory buffer だけで、ブラウザの永続保存ではありません。
原本は保持し、[固定パッチ](../../scripts/patch-siqs.mjs) の一致件数と派生 SHA を receipt に記録します。
sieve factor 配列、poly factor 配列、sqrt large-prime 配列、relation serialization を格納前に検査します。
管理 allocator の所有権検査だけで全ての stale alias が防げるとは主張しません。

## ビルドと検証
npm run build:siqs -- --check は固定 Emscripten image の新規 network=none container 2回で一致を確認します。
npm run verify:siqs-native は portable C の ASan/UBSan（漏れ検出、recover無効）です。
npm run check は原本・派生パッチ・source/artifact hash と実 memory.grow 拒否も確認します。
実行物・intake archive は repo に取り込まず、原本・recipe・通知と生成bytesを追跡します。

native は6段階停止、代表成功jobの全2528割当地点の失敗、13境界probe、
小さい多項式の選択不可、raw ABI拒否と後続 exact recovery を確認しました。
全入力・全経路の形式的証明ではありません。WASMでも早期/中間/最終割当失敗を検証します。
詳細は [TDD](../operations/tdd-evidence.md) と PR5 の実ブラウザ測定に記録します。

## ECM の異常経路
stage2 の入口と既存9停止確認点を計装し、出口・ecm_factor返却・ecm_clear後を分けます。
native は10候補のうち9地点へ実到達して停止・解放・再利用を確認しました。
point3（別branch）は未到達で、成功件数に含めません。無callback区間の時間上限証明ではありません。

GMP の custom allocator から NULL を返したり longjmp で復帰する方法は使用しません。
元の GMP allocator へ委譲する hook で分類し、その内部 raw allocation と ECM 直接 allocation
へ NULL を注入します。GMP abort/denied I/O/ECM assert/trap は fatal として instance を poison にします。
GMP/ECM の既知の OOM 解放不備を全面改修したとは扱わず、Worker 全体の破棄で隔離します。
診断モードは private factory の固定 literal のみで、wire options から指定できません。

WASM64MiB、managed heap の実測と上限、同時所有 Worker 数、
GC待ちを含む Chrome process tree の sampled RSS/PSS は別の値です。
RAM sampling は全taskのchildrenを集約します。25ms目標の標本であり、瞬間最大値や厳密なRAM保証ではありません。
公開license、site capability/CSP、React/UI、配布、Ready/merge/deploy は別判断です。
