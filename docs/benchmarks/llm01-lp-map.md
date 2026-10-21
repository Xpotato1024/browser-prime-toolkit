# LLM-01 LP map幅縮小の固定対照

PR19 head3826a590を保持し、測定head c2409f30ec7561a3a5cb8019477a6f99f79ce1ea、同じ4Worker/8枠・64familyのABBAを実行した。全packet/共通列/counterが一致し、全試行のusableは1706。wire/LP設定/数学条件は変更していない。

| 試行 | request秒 | coordinator live/linear MiB | Chrome peak PSS MiB |
| --- | ---: | --- | ---: |
| 1-baseline | 124.842 | 23.10 / 35.69 | 549.62 |
| 2-lpmap | 125.150 | 21.10 / 31.50 | 554.76 |
| 3-lpmap | 125.998 | 21.10 / 30.44 | 550.47 |
| 4-baseline | 126.418 | 23.10 / 35.69 | 548.77 |

live中央値 -8.66%、時間 -0.04%、PSS 0.62%。事前のlive5%以上減/時間1.05倍/PSS1.10倍gateは成立し、LP map分離を採用する。速度向上の主張はしない。

profileのkey/value容量下限は3,670,016→1,835,008bytes。allocator総liveは24,217,635→22,120,547bytesで、control/容量丸め/structの影響も含むため差を同じ指標と呼ばない。u32外のキーはu64 fallbackに保持し、境界/同一下位32bit/混在cycle/置換をNative probeで確認した。40/64桁の全packet/列/counter/因子とterminal後のfresh recoveryも成功した。

開始前Windows空きRAM 16509.92MiB、各試行前WSL空きRAM4096MiB以上。計算前のCIM呼出し失敗は旧runのローカルlogに保存し、Windows側の正規Desktop Commander読取証跡へ修正した。最初の失敗では計算試行0。成功campaignは 2026-10-21T06:31:18.792Z〜2026-10-21T06:40:22.724Z。各試行前後のHEAD/bytes guard、原本/log SHA、plan/driver/sourceの歴史結合、offline/検出器自己試験/全退役、事前契約16件が成功した。

[run原本](staged-lp-map-stage36/run.json)、[事前契約](../contracts/lp-map.md)。この結果はRSA100完了や全工程所要時間を示さない。長時間・大行列の資源検証は別の有限planへ進める。
