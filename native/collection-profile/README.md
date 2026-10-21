# 関係式収集の診断専用Native

基準はStage38成功時のlong-1024で、選定入口へ反映するartifactではない。
固定upstream0.5.0/commit4b150834b57636f6ebc350a81321a15c1cd901d2、
Rust1.90/O3/fatLTO/SIMD128、1GiB hardmaxと小さい初期memoryを維持する。
既存のWASM SIMD根更新・report走査は上流の貢献である。

patch-sourceは現long patchを適用後、6原本fileへ計時scopeを置き、timing.rsを追加する。
演算・順序・閾値・LP設定・packet形式は変更しない。診断専用importは
codex_collection.now_msの1個だけで、ローカルperformance.nowへ結ぶ。
固定16phase・深さ16・clock最大2,000,000回。inclusive/exclusiveを分け、
continue/早期returnはRAIIで閉じる。不正時計・scope順序・容量超過は無効な診断となる。

build-collection-profile.mjsは旧upstream cache/verified toolchain/containerを再利用し、
同じsource/flagsで2clean一致を検査する。source/hash/licenseはreceiptへ固定する。
元のApache-2.0 OR MPL-2.0とRust runtime noticeを維持し、独自observerはAGPL-3.0-only。

```sh
PRIME_RUS_SOURCE_DIR=/absolute/outside-repository/source-0.5.0 node scripts/build-collection-profile.mjs
node scripts/check-collection-profile.mjs
node scripts/check-collection-probe.mjs
node scripts/verify-collection-native.mjs /exclusive/outside-repository/native-equality.json
```

Native機能対照と実Chrome性能は別である。[事前契約](../../docs/contracts/collection-profile.md)に従い、
現在の4familyの全packet/counter/列を成功原本へ照合し、診断負荷gateを確認してから解釈する。
clock callbackはWASMへ再入しない。fatal/trap送信時にside-portからNativeを再利用しない。
親が所有するMessagePortはWorker退役後に閉じ、転送済みchild portの所有権はWorkerへ属する。
