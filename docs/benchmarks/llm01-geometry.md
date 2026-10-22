# LLM-01 conditional Rust geometry screen

Measured core: `609ca0c9352a407b28ba56b88ded952240ad289d`. [Frozen plan](../../bench/staged-geometry-plan.json); [all twelve raw/log receipts](staged-geometry-stage20/run.json). Four real-browser contract configurations precede eight60-second two-owner trials. The finite credit1 scheduler is unchanged from the successful Stage19 comparison.

| Profile | B | Halfwidth | FB / target | Single / combined LP bounds | lp_bits | k / Q2 | Target A bits | A factors / variants | Sample A/targetA (min / median / max, quantized) |
|---|---:|---:|---|---|---:|---|---:|---|---|
| b325-m524 | 3250000 | 524288 | 116448 / 116512 | 471250000 / 10932187500000000 | 54 | 139 / true | 149 | 13 / 2048 | 0.96 / 1.00 / 4.99 |
| b250-m524 | 2500000 | 524288 | 91267 / 91331 | 362500000 / 6468750000000000 | 53 | 139 / true | 149 | 13 / 2048 | 0.96 / 1.00 / 4.99 |
| b325-m262 | 3250000 | 262144 | 116448 / 116512 | 471250000 / 10932187500000000 | 54 | 139 / true | 150 | 13 / 2048 | 0.99 / 1.00 / 2.49 |
| b250-m262 | 2500000 | 262144 | 91267 / 91331 | 362500000 / 6468750000000000 | 53 | 139 / true | 150 | 13 / 2048 | 0.99 / 1.00 / 2.49 |

A samples are deterministic families0..63. Each ratio is floor(1000*A/targetA)/1000; this is a bounded quantized sample, not a complete probability distribution. Actual pool sizes and every sample bit length/ratio remain in the receipts. B changes both accepted LP bounds and the actual target; this is a coupled geometry/LP comparison. Threshold adjustment remains-23.

| Profile | Repeat | Polys | Full | SLP | DLP | Cycles | Usable / target | Progress % | Raw | Blocked idle ms | Max return→ACK ms | Chrome peak RSS MiB |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| b325-m524 | 1 | 24576 | 320 | 4175 | 13317 | 3 | 323 / 116512 | 0.28 | 17812 | 16.60 | 8247.10 | 1305.20 |
| b250-m524 | 1 | 32768 | 258 | 3610 | 11801 | 1 | 259 / 91331 | 0.28 | 15669 | 0.00 | 6857.90 | 1293.00 |
| b250-m262 | 1 | 49152 | 222 | 3151 | 10254 | 3 | 225 / 91331 | 0.25 | 13627 | 34.20 | 4622.10 | 1294.70 |
| b325-m262 | 1 | 40960 | 315 | 4134 | 13078 | 3 | 318 / 116512 | 0.27 | 17527 | 0.00 | 388.50 | 1299.27 |
| b325-m262 | 2 | 40960 | 315 | 4134 | 13078 | 3 | 318 / 116512 | 0.27 | 17527 | 3.30 | 5544.40 | 1297.86 |
| b250-m262 | 2 | 49152 | 222 | 3151 | 10254 | 3 | 225 / 91331 | 0.25 | 13627 | 0.00 | 623.50 | 1296.23 |
| b250-m524 | 2 | 32768 | 258 | 3610 | 11801 | 1 | 259 / 91331 | 0.28 | 15669 | 0.00 | 6995.40 | 1293.26 |
| b325-m524 | 2 | 22528 | 293 | 3861 | 12182 | 2 | 295 / 116512 | 0.25 | 16336 | 0.00 | 8215.90 | 1306.51 |

Provisional collection candidate: **none**. Both paired normalized-progress ratios must reach1.15; equal top ratios retain baseline. The exact integer decision and all negative results remain in the run index.

Common native families and accepted-prefix graph counters match within each geometry across repeats. The unchanged geometry also matches Stage19 native family bytes/counters. Source/artifact/configuration, lifecycle, quiet-network and bounded-resource checks are tied to the measured commit.

No end-to-end RSA-100 completion is established. Target normalization does not measure filtering, matrix costs or extraction near target. Assigned-job occupancy is not OS CPU utilization; active calls censor delivered native timing. ACK latency may overlap ahead calculation. Requested allocator bytes, WASM linear memory and sampled Chrome RSS/PSS remain separate;512MiB is the total WASM cap, not total browser RAM.

No long trial, larger search, runtime default, site policy/integration, release or deployment is included.
