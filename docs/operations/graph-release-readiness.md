# 改善完了判定とマージ・リリース前の確認

2026-10-21 03:10 UTCの本人指示は、改善余地が概ね尽きた条件が成立した後のPRマージ・リリースを許可している。条件を早めるために探索を打ち切らない。Stage34の2候補は負の結果として閉じ、差分サイズ診断も基準不成立。選定版の最終持続/取消は測定head98a62b2で完了した。最終HEAD試験・独立レビュー・CIの結果は今回Draft PR本文へ固定head付きで記録する。LP map仮説は[Stage36固定対照](../benchmarks/llm01-lp-map.md)でgate成立したが、選定入口反映と長時間設定は一度[保留](stage36-outcome.md)となり、本人の追加承認後に[Stage37](stage37-tdd-evidence.md)で反映・有限検証を再開した。[Stage38](stage38-outcome.md)の明示co1024枠ではRSA100のproper divisor・因子積・probable判定まで成立した。PR22最終head e1dae4bはtest/check・独立review2名・CI36件成功。不要filter配列の早期解放候補は[Stage39](stage39-outcome.md)で局所live減と全工程gate不成立を確認し不採用とした。残る条件はStage39最終headの検証・独立review・CIと実PR依存確認であり、現時点では完了扱いしない。改善余地ゼロとは断言しない。

## 依存PR

04:22 UTC頃の読取snapshot。マージ直前には実HEAD・Draft・base・checkを取り直す。

| PR | base | HEAD | snapshot checks |
| --- | --- | --- | --- |
| [#1](https://github.com/Xpotato1024/browser-prime-toolkit/pull/1) | main | `0c6c56c91cc4abf44c88287e8a4579d4b9f1b939` | SUCCESS |
| [#2](https://github.com/Xpotato1024/browser-prime-toolkit/pull/2) | codex/design-exact-integers-20261018 | `5aba08c90715b27371ad0dd4dd461a939f9a717c` | SUCCESS |
| [#3](https://github.com/Xpotato1024/browser-prime-toolkit/pull/3) | codex/factor-worker-20261019 | `53c19c434fc2282f0789ed89c1ab35d7594243ee` | SUCCESS |
| [#4](https://github.com/Xpotato1024/browser-prime-toolkit/pull/4) | codex/wasm-siqs-20261019 | `7a08e65df70131b5205c82ded8fa8a1dc4be201a` | SUCCESS |
| [#5](https://github.com/Xpotato1024/browser-prime-toolkit/pull/5) | codex/gmp-factor-candidates-20261019 | `3cff33e93653bbc1fd5a80accf1a6ee1267664b9` | SUCCESS |
| [#6](https://github.com/Xpotato1024/browser-prime-toolkit/pull/6) | codex/bounded-siqs-evaluation-20261019 | `2ed934a90960126067ff18586d59171f24a43b08` | SUCCESS |
| [#7](https://github.com/Xpotato1024/browser-prime-toolkit/pull/7) | codex/engine-selection-closeout-20261019 | `91b4bb512ab36f83b8341f4471e3ffab4a35dae8` | SUCCESS |
| [#8](https://github.com/Xpotato1024/browser-prime-toolkit/pull/8) | codex/siqs-parallel-supplement-20261019 | `82f1c3e4215bf990da142e82e8bc33fa55846b07` | SUCCESS |
| [#9](https://github.com/Xpotato1024/browser-prime-toolkit/pull/9) | codex/siqs-counted-lanczos-20261019 | `4ed6f7b90ab8d70ef25c1323176dffd1ab771d19` | SUCCESS |
| [#10](https://github.com/Xpotato1024/browser-prime-toolkit/pull/10) | codex/staged-selector-20261019 | `723878f67dc120d84d28c315960a82e87a61f4bf` | SUCCESS |
| [#11](https://github.com/Xpotato1024/browser-prime-toolkit/pull/11) | codex/private-exact-ui-20261019 | `4d15a65c9d8011b51324fcf3e047bb944a5ec2e7` | SUCCESS |
| [#12](https://github.com/Xpotato1024/browser-prime-toolkit/pull/12) | codex/rsa-30s-profile-20261019 | `643846e9e43810cec1932315a9aab8240adc67a7` | SUCCESS |
| [#13](https://github.com/Xpotato1024/browser-prime-toolkit/pull/13) | codex/large-siqs-20261019 | `64922e579277edd90c0a5d9e06e1ed564022840e` | FAILURE |
| [#14](https://github.com/Xpotato1024/browser-prime-toolkit/pull/14) | codex/siqs-lab-20261020 | `b2e38bb4b87a36cf2f76159c6ac6b76d4ea60064` | SUCCESS |
| [#15](https://github.com/Xpotato1024/browser-prime-toolkit/pull/15) | codex/rusqsieve-simd-20261020 | `2008edb702a6b9a214687542a146d38582a780de` | SUCCESS |
| [#16](https://github.com/Xpotato1024/browser-prime-toolkit/pull/16) | codex/rusqsieve-dlp-20261020 | `d5e5304119534a64e4dc1e13a5d41aabaaa74897` | SUCCESS |
| [#17](https://github.com/Xpotato1024/browser-prime-toolkit/pull/17) | codex/rusqsieve-scheduler-20261020 | `c1d91e7d0f9b53ea324de3df654b51c94c597288` | SUCCESS |
| [#18](https://github.com/Xpotato1024/browser-prime-toolkit/pull/18) | codex/device-resources-20261020 | `297f9d29c2102dfcd420f0b9fee5230ed4a0d4df` | SUCCESS |

既存PRは1→2→…→18→今回PRの祖先順。通常のmerge commitを使って測定HEADの履歴を保持する。squash/rebaseで歴史blob参照を失うと、原本とsourceを結ぶ検証が壊れる。各PRをmainへ順に取り込む場合、依存先merge後に次のbaseをmainへ変更し、差分・同HEADのcheckと新しいmerge contextを確認する。大量に一括Ready化・自動merge予約しない。今回の増分PRをレビューしてから、履歴を保持する最終headの一括統合PRへ整理する選択肢は親が依存関係と照合する。古いPRを無断でclose/書換えしない。

PR13のFAILUREは[run39391717377](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/39391717377/job/118524581451)のGMP6.3.0固定HTTPS取得時curl28接続15秒timeout。数学テスト失敗ではない。同じ原本/hashと有限retryを維持しており、最新headでの成功を別に記録する。過去の赤を成功へ読み替えない。

## リリース対象と対象外

選定済み実験ESM入口 `src/optimized/index.js`、固定pinと2clean artifact、既存の軽い入力経路、全桁表示/確実性/因子検算、有限CPU/WASM/輸送/時間・取消契約、source/license/build accessと測定報告が対象。採用・不採用候補、失敗と旧rawの履歴も保全する。最終tagはマージ後mainの検証済みcommitへ固定し、release noteは日本語で通常600秒枠のRSA100未完了、明示大メモリ枠の1回のRSA100成功、実機mobile未検証を区別する。source archive/checksumを付ける場合も、対応する完全Git履歴とupstream/patch/flagsの再現手順へ結ぶ。npm公開や新repo作成はしない。

サイトの旧分解機撤去、React island/manifest v1 adapter、multi-instance admission、初回asset後offline、通常サイト移動、CSP/license、軽い入力スマホ実機は次工程の受入対象。サイトの新ブランチで検証し、受入結果を確認してから本番切替する。ここでCloudflare/Search Console/資格情報/権限/端末設定を変更しない。

Stage37開始時点の追加固定基準: PR19 head3826a590、PR20 head18d7d843は成功CIを確認したDraftとして保持する。新しい反映と長枠はその後の増分branchへ分離し、最終head・依存順・受入条件を改めて確認する。

2026-10-21 16:29 UTC読取の追加依存: PR19 head3826a590 → PR20 head18d7d843 → PR21 headdc8dbbb3 → PR22 head d1e0b865（測定時点）。すべてDraft。PR21は同head CI34件、PR22測定headはCI36件が成功した。報告追加後のPR22最終headは本文で更新し、マージ直前に実HEAD・base・checkを取り直す。
