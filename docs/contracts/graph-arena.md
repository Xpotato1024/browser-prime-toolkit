# 部分関係式の可逆packed保存

Stage26の抽出移行を基準に、forest内のrelationだけを1つの可逆byte列で保持します。
演算器、sieve設定、family packet、vertex/edge番号、順序、重複A排除、cycle経路は変えません。
名前はgraph-arenaですが、初回は拡張する巨大arenaではなく、edgeごとの単一Boxです。
root長・root LE bytes・sign・LP tag/値・powers長・index:u32/exponent:u16を保存し、
cycle時は既存wire decoderを使って元Relationへ復元します。指数をparityへ切り詰めません。

仮説は、root保存の改善後に残るpowersの8-byte tuple paddingとVec/別root allocationを減らし、
同じ受理64 familyでrequested liveをStage26 baseline比10%以上削減できることです。
restoreの一時family copy・Relation allocationはpeakと実行時間に含めます。
native snapshot schema2は従来18項目にpacked payload bytesを追加します。
power capacityは別tuple配列が存在しないため0で、packed payloadを二重計上しません。

upstream全hash、patch、compiler、2回clean build一致、coordinator256MiBを固定します。
境界root 0/1/42/64/128 bytes、u32 index/u16 exponent最大値、0/1/2 LPをroundtripします。
40/64桁の全工程と固定RSA100 familyのpacket SHA、列SHA、全countersを一致させてから、
4 owners、固定64 family、各180秒以内のbaseline/packed/packed/baselineで反復比較します。
中央値の64 family到達時間が10%超悪化しないことを初期採用条件とします。
時間切れ・差異・悪化も保持し、未完了を完了へ読み替えません。

計算予算はこの系列で最大16分。WASM合計448MiB、transport32MiB/4枠、
available4096MiB以上、coordinator live160MiB/linear208MiBとChrome PSS1536MiBのsoft stop、
fatal優先の分類、cancel/deadline/退役/fresh recoveryを維持します。
sourceと初期asset取得後は通信ゼロ、公開入口や自動設定を変更しません。
