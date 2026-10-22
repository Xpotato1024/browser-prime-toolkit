# forest powersの可逆圧縮候補

Stage33。Stage27の1Box保持はpowersの各項にu32 index+u16 exponent（6bytes）を残す。prefix62観測では2,296,741項で、payload18,668,518bytesの大部分を占める。因数分解の演算を変えず、保持表現だけを小さくする仮説を先に固定する。現在の持続計測中にビルド/比較計算はしない。

root/sign/LP/countの既存prefixは維持する。各powerは`(u64(index)<<1)|(exponent!=1)`の非負headerを最大5byteの7bit byte encodingで保持し、指数1を省略する。それ以外は元のu16を保持する。最大index u32::MAXの33bit headerもu64内で正確。Number/浮動小数点/新しい整数型や除算・剰余アルゴリズムを導入しない。index順序・重複・指数・LPを変更しない。

restoreはprefixとpower countを読み、各header最大5byte・最大33bitを検査する。元のu32/u16列を再構築し、既存upstream wire decoderへ渡す。全bytes消費を確認し、無限長/範囲外を拒否する。これは内部のstorage codecで、外部packet形式は変更しない。retained payload実bytesとlive requested/linearを分けて観測する。

2clean build一致、cap128/256（helper64は同じ既採用builtin kernel）、同じ上流/flags/patchを固定。境界root0/1/42/64/128、LP0/1/2、index0/63/64/127/128/8191/8192/2^31/u32::MAXと指数1/2/u16::MAXのroundtripを確認し、指数0は無効値として拒否。40/64桁で全family packet・全canonical column・全counter・最終因子が一致し、取消/期限/全退役と入力範囲を維持する。

比較はRSA100固定64family、4Worker・8枠、baseline/candidate/candidate/baseline、各最大180秒、計算予算720秒と事前契約検証30秒の計750秒以内。元packed+builtin保持をbaselineとし、数学パラメータとprefixは同一。live requested10%以上削減、時間中央値1.10倍以下、PSS1.10倍以下、全prefix証跡一致を採用条件とする。負の結果も保存。採用時は選定入口へ反映後に600秒を1回、必要なら120秒取消を1回、有限の追加検証として別planを開始前に固定する。RSA100完了予測には使わない。
