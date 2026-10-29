# 400bit SIQSのローカル評価契約

2026-10-28。基準は84d1d4743cb03ba0af5c43152ef81b87f66ff675。
400bitのSIQS残余を、既存の固定Nativeと有限hostへ接続する独立入口です。
公開adapter／GUIのSIQS上限は100桁・332bitのままです。
400bitの受付・初期化・停止と、関係式収集・行列・分解完了を分けます。

## 現行の入力別経路

| 選択と入力 | 実際の処理 |
| --- | --- |
| 全モードの n < 2^128（bit長128以下） | 共通の選定p64経路。小因子2〜97の抽出→素数性判定→平方判定→未解決合成数の分割 |
| p64の残余が64bit以下 | native BigInt Brent |
| p64のそれ以上の残余 | Brent前処理（共有20ms／5万操作）→GMP-ECM前処理（共有80ms／50万操作）→旧SIQS。残余は2^128未満に限定 |
| 通常の 2^128 ≤ n < 2^1024 | 309桁かつ1024bit以下を受付。既存native BigInt Workerの小因子抽出・素数性／平方判定・Brent。GUIでは最大5秒／5万操作／1 Worker／WASMなし |
| 高精度・大メモリの2^128以上・332bit以下 | rusqsieve由来のSIMD SIQS。関係式収集→filter→疎行列Lanczos→GCD→host検算。Brent／ECMの自動前処理ではない |
| 新しい内部入口の400bit以下 | 同じSIQS host／Nativeを再利用。公開GUIには未接続 |
| GNFS | 未実装。自動切替なし |

根拠はsrc/site/session.js、engine/staged-selected.js、staged-plan.js、
staged-factor.js、staged-dispatch.js、factor.js、extended/runner.js、
optimized/runner.js、selected-wide/runner.jsです。
素数性未証明のprobableと、未解決残余を確定素因数へ変更しません。
今回、素数性関数内部の再読は拒否されており、内部再監査済みとは述べません。

SIQSの直接入口は合成残余用です。小因子や素数を含む一般入力を自動的に
Brent／ECMへ回す統合portfolioではなく、Native準備の失敗もあり得ます。
現在のGMP bridgeはsrc/engine/gmp.jsで256bit未満に限定されているため、
400bit ECMをそのまま利用できるとは扱いません。

## 大きい入力での方式選択

ECMの期待計算量は見つける因子の大きさに依存し、大きな整数の小さめの因子を
探す前処理に適します。均衡半素数の総桁数だけを見てECMへ置換する判断はしません。
QS／GNFSは一般の大きな合成数を扱う方式です。
[HAC第3章3.2](https://cacr.uwaterloo.ca/hac/about/chap3.pdf)の一般戦略と、
[現行CADO-NFSの構成](https://cado-nfs.gitlabpages.inria.fr/)を参照します。
歴史資料の桁数境界を現在のbrowserでの厳密な分岐点には使いません。

固定上流自身も369〜400bit tierを進捗可能性のための設定と説明し、
速度実証済みtierと区別しています。400bit対応は既存SIQSの能力境界を接続する段階で、
GNFSより速い、実用時間内に完走する、とは主張しません。
GNFSの移植や400bit ECMの新実装は今回の対象外です。

## 入力・設定・資産

src/siqs400/contracts.jsはcanonical十進表記、2以上、
121桁かつ400bit以下を要求します。2^400以上、指数表記、前後空白、先頭ゼロは
この低位APIで拒否します。GUI parserによる正規化とは別の層です。
SIQSの400bit上限と、Nativeの1024bit格納幅は別の値です。

| bits | FB bound | interval half-width | single LP | double LP | offset |
| --- | --- | --- | --- | --- | --- |
| 321〜333 | 3,250,000 | 524,288 | 471,250,000 | 10,932,187,500,000,000 | -23 |
| 334〜368 | 3,000,000 | 262,144 | 435,000,000 | 10,926,000,000,000,000 | -23 |
| 369〜400 | 6,000,000 | 524,288 | 870,000,000 | 43,704,000,000,000,000 | -23 |

baseline profileだけを使います。高位tierのLP積はBigIntで計算し、
u64未満を維持します。LP mapは元のu32／u64分岐、rootは最大128bytes、
因子packetも128bytes、FB indexはu32を保持します。
上流Naturalは16×64bit格納とwidening modular multiplicationを使います。
これらの静的な幅確認は全ての算術経路の正しさや完走の証明ではありません。
上流natural/mod.rsの古い512bit説明より、engine.rsの400bit guardとABIを優先します。

src/siqs400/worker-source.jsは既存selected-wideの64／1024MiB用Worker文字列を利用し、
一意な入力validator・設定validator・設定検査呼出しだけを変更します。
固定WASM bytes、protocol21、ABI6、SIMD、role、packet・quota処理を変更しません。
WASMの再コンパイル、隔離物の取得・復元・再生成は行いません。
今回のowner Native SHA256は
21cec2f0e9631c769ad256e42d37e9b7865de1d92e4b0ba129ec1d3c5eb77a6dです。
これはselected-wideが既に使うresieve1-1024版で、旧検出物のhashではありません。

hostはselected-wide／wide-windowの内部factoryへまとめ、
従来のrunRusqsieveは従来validator・Worker・設定検査へ固定したままです。
src/siqs400/index.jsのrunSiqs400だけが新しい3依存を明示的に束縛します。
一般の利用者入力からvalidatorやscriptを指定するloaderではありません。
利用時は明示的なmanual resourcePlanを渡します。例えばworkers:1、memoryMiB:1536、
timeBudgetMs:1500、outstandingSlots:4の有限設定です。
5 Workerでの400bit全工程は未測定です。
従来の生成一致検査も維持します。

## 有限資源と停止

既存wide planを再利用し、coordinator1024MiB・helper各64MiB、
合計WASM予算1536MiB以内、最大5 Workers、最大1時間を変更しません。
これらは指定可能な有限上限であり、今回その長さの試験を実行した訳ではありません。
outstandingは4／8 slots、1packet8MiB、輸送はslots×8MiB、
hostのfamily上限4096、Native上限750000を維持します。
coordinator要求live640MiB／linear832MiBでの既存soft stopと
行列抽出quotaを保持します。WASMの予算・最後の観測値・JS heap・browser RSSは別です。
OSによる終了を防げるとは保証しません。

利用者取消・時間上限・観測したメモリ保護・Worker異常・protocol失敗・
退役失敗を区別します。Worker異常をOOMと推測しません。
Nativeがfamilyを計算中でもhostがterminateして止めます。
family内の途中の多項式数は返却されないので、その区間は不定進捗です。

## 限定検証と残件

実Chrome155で333／334／368／369／400bitのNative準備、
実設定の一致、空collectorのrelease／extractを検査します。
fixtureは固定上流corpusの因子から作った積で、均衡半素数の性能試験ではありません。
空collectorはinsufficient-relationsとなり、分解成功とは扱いません。
別の64MiB helperでも400bit準備とcoordinator設定の一致を確認します。
121bit対照だけで1family packet・submitを確認し、400bitでのpacket到達とは区別します。
400bitの計算中取消とfreshなWorker準備、URL／Worker退役も確認します。

最初の上流400bit境界fixtureで1family返却を10秒待った試行は期限で退役し、
packetを受け取れませんでした。負の原本を保存し、全分解成功とは扱いません。後続の明示許可による同条件・単一family最大60秒観測では、
約10.46秒でpacket返却と受理が成立しました。[単一familyの記録](../benchmarks/llm01-siqs400-family.md)を参照します。
さらにhost＋実Nativeの1.5秒枠停止と、job発行後25ms取消をNode Workerで確認します。
この停止専用試験では算術JS importを拒否するloaderを使い、
検算関数が呼ばれたら例外にします。代替算術engineや分解成功の試験ではありません。

境界・設定・packet幅・host protocol・取消／時間／資源／異常／退役失敗は
対象を限定した試験で検証します。
src/engine/arithmetic.jsの限定再読は、400bit検算調査の依頼を根拠に一度申請しましたが、
本人の後続明示承認がないという自動承認理由で実行前に拒否されました。
再試行や別経路読取は行いません。以前拒否された全体npm test/checkも再実行しません。

400bitの単一family packetと受理までは確認済みです。
必要量までの関係式収集→行列→GCD→最終素数性検算の通し成功、
実GUI／配布adapterへの接続、Site採用、実機mobile、性能比較は未検証／未実装です。
特にGUIのheavyViewは100桁制限を持ち、単にmode metadataを400へ変更してはなりません。
小因子前処理・合成残余dispatch・部分結果・最終検算を一体で検証してから採用します。
公開版の上限やCSPは変えません。push・PR・release・Site公開も行いません。
