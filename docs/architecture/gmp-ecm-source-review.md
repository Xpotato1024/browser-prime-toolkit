# GMP・ECM・真 SIQS の原本と配布境界
評価日: 2026-10-19。対象は private の比較実験です。

## 原本
| 対象 | 固定値 | 条文・扱い |
| --- | --- | --- |
| GMP | 公式 6.3.0 tar.xz、SHA256 a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898 | LGPL-3.0-or-later または GPL-2.0-or-later |
| GMP-ECM | developer mirror 8ea5e214fdf2f0ddf9415141b8dc039ed6f5874e、archive SHA256 32339eaedca0664e20049894821d030d04d3265703d262ab38dfe6e0e6af1494 | 混在条文。LGPL-only と確定しない |
| msieve SIQS | c8727d91305bdbe0972d160ef0ce61dd02ce9193、明示13ファイル | 全対象に public-domain dedication。object-only、未リンク・未実行 |
| compiler | Emscripten 4.0.15 image digest 27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8 | 既存 vendor/emscripten の通知を保持 |

GMP の公式公表指紋 343C2FF0FBEE5EC2EDBEF399F3599FF828C67298 と照合し、
元 archive と detached signature は VALIDSIG でした。署名作成は2023-07-30、
鍵は2025-01-15に期限切れで、現在は EXPKEYSIG も返します。
個人の keyring/trust 設定は変更せず、評価用の隔離 keyring を使いました。
取得物の版・bytes・SHA は [manifest](../../native/gmp/upstreams.json) に固定しています。
CIからgmplib.orgへの接続がtimeoutしたため、[GMP公式が案内するGNU配布先](https://gmplib.org/#DOWNLOAD)
のftp.gnu.org HTTPS URLを固定取得先に選びました。元取得物と同じ2,094,196 bytes・SHAです。
自動fallbackは追加せず、URLとmanifest hashだけをreceiptへ反映し、生成WASMは変更していません。

ECM の既定 libecm 集合35 Cソースと宣言されたヘッダー等の hash／先頭の条文表記を
[原本目録](../../vendor/gmp-ecm/provenance.json) に記録しています。
主要CはLGPL-3.0-or-later、getprime_r.cはLGPL-2.1-or-laterですが、
basicdefs.hはGPL-2.0-or-later、ecm-ecm.hはGPL-3.0-or-laterです。
addlaws.c、torsions.c、cudawrapper.c等には個別表記がありません。
宣言・型・マクロの存在だけで結合法的な結論を出さず、project COPYING/COPYING.LIB
と併せて確認する対象として残します。GPU/OpenMP/asm-redc/SSE2は無効です。
AUTHORSの元byte F6一つをU+00F6へUTF-8変換し、元と変換後のhashを併記しました。
GMPのAUTHORSと全通知は原文を保持しています。

## 再現手順
Node/npm は既存固定版を使い、PRIME_UPSTREAM_DIR を repo 外の保存先に指定します。
npm run fetch:candidates は固定 HTTPS URL のみを取得し、bytes/hash を検証します。
取得失敗を同じ固定URLへ最大2回再試行し、不一致cacheや不一致hashを別原本で回避しません。
npm run build:candidates -- --check は新規 container 2回で同じWASMとSIQS objectを検証します。
npm run verify:candidate-native は同じ原本のnative ASan/UBSan試験です。
npm run verify:candidate-primes は新balanced因数8個を独立uint64総当たりで証明します。

compiler imageにないAutoconf2.71、Automake1.16.5、Libtool2.4.6、M4 1.4.18、
libsigsegv2 2.13はUbuntu公式配布の版・archive hashを固定しました。
debはhash確認後に一時container内へ展開するだけで、hostへinstallしません。
[通知](../../vendor/build-tools/)とsource URLを保持します。
ECMのconfig.guess/subは同じ固定GMP archiveのconfigfsf.guess/subを使用します。
全コンパイルはnetwork=none、2CPU、2GiB、128pids、cap-drop ALL、no-new-privilegesです。
候補用の作業tmpfsは512MiB、従来tinyqsは128MiBを維持し、host mountを使いません。
source archive、deb、native executableはrepoへcommitしません。
[build recipe](../../native/gmp/build.sh)と[検証receipt](../../native/gmp/build.json)を参照してください。

## PR4時点の実行と未検証
以下はPR4の判断履歴です。PR5の有界SIQS実行・実stage2停止とfatal退役の追加は
[後続評価](bounded-siqs-source-review.md)を参照してください。
GMP Brentは固定scratchとmpz_mod/mpz_gcdを使い、旧ZIPを実行・流用していません。
ECMはSuyama・B1=2000・B2=200000・最大32曲線です。batchは停止callbackを無視するため除外します。
maxmem=16MiBはstage2の目安です。WASM線形メモリ64MiB、stack1MiBでgrowthを禁止します。
残るfd/path importはI/Oを拒否するstub、保存filenameはNULL、初期化後fetchはありません。
Cの予算callbackは停止を保持し、C解放後にJSへ元の例外を返します。
ASan/UBSanの400停止はcutoff0〜199と再利用の検証です。stage2到達を計装していないため、
stage2中断後の解放を専用に検証した証拠とは扱いません。
stage2の多項式木構築等の無callback区間と、未検査mallocによるOOM/trapは残ります。
host deadline/terminateを補完とし、全失敗を正常なincompleteに変換できるとは主張しません。

真SIQSの7ソースから8objectが同一compilerで生成できました。
既定msieveはGMPをリンクしますが、SIQS本体はmp_tを使います。
最小部分集合でGMP実行依存を外せるかは未検証で、今回は生成済みgmp.hを使用します。
次に必要なのは有界savefile、relation/partial/多項式/行列個数・bytesの上限、
checked allocation、sieve/Lanczos内のcallbackと解放経路、段階別検算です。
mem_mbはNFS filtering用で、QS全体の上限ではありません。
[SIQS原本目録](../../vendor/msieve-siqs/provenance.json)に原byteとLF正規化hashを残します。

Alpertronは実browser SIQSですが、構造体3配列だけで約108.8MiB、HTML/保存/server補助の分離が必要です。
FLINTはLGPL-3.0-or-later、通常GMP/MPFR依存で、基底拡張・Lanczos再試行の打切りが必要です。
両者は今回取り込まず、可変branchの調査を採用pinとは扱いません。
GNFS/CADOの判断は[既存記録](advanced-factorization-candidates.md#gnfs-の採否)を引き継ぎ、
多段relation/matrix・中断再開の独立portを要するため短期採用しません。browser不可能という判断ではありません。

## 公開前の具体的な判断
このrepoのprivate evaluationはサイトへの採用・配布許可の確定ではありません。
公開候補は、ECM混在条文を含む全採用ファイルと自作bindingの配布license、
対応source・変更・正確なbuild recipe・再リンク材料の提供形態を揃えてから判断します。
現在のUNLICENSEDを公開licenseへ自動変更せず、旧ZIPも再licenseしません。
xpotato-site側のtool manifestのlicense/capabilityやWASM用CSP変更が必要なら、
対象ファイルと配布案を戻して確認します。現在のsite・CSP・権限・deployは変更しません。
