// SPDX-License-Identifier: AGPL-3.0-only
import {parseIntegerInput,MAX_INPUT_LENGTH,IntegerInputError} from '../core/integer-input.js';
import {selectResourcePlan as normalPlan} from '../graph-multicore/policy.js';
import {selectResourcePlan as widePlan} from '../selected-wide/policy.js';
const STANDARD_BOUNDARY=1n<<128n,MAX_SITE_BITS=332,MAX_SITE_DIGITS=100;
export function parseSiteInput(raw){
 const input=parseIntegerInput(raw).canonical;
 if(input.length>MAX_SITE_DIGITS||BigInt(input).toString(2).length>MAX_SITE_BITS)throw RangeError('Maximum 332 bits / 100 digits');
 return input;
}
export function validateSiteInput(raw,engine='standard'){
 const input=parseSiteInput(raw);
 if(engine==='standard'&&BigInt(input)>=STANDARD_BOUNDARY)throw new IntegerInputError('STANDARD_RANGE');
 return input;
}
export function siteInputLimit(engine='standard'){
 const standard=engine==='standard';
 return {maxDigits:standard?(STANDARD_BOUNDARY-1n).toString().length:MAX_SITE_DIGITS,maxTextLength:MAX_INPUT_LENGTH,
  text:standard?'通常：最大39桁・2^128未満':'高精度／大メモリ：最大100桁・332bit以下',
  note:'先頭の0を除いた値の上限です。分解完了を保証する桁数ではありません。入力表記は'+MAX_INPUT_LENGTH+'文字まで。'};
}
export function siteInputErrorMessage(error,engine){
 if(error?.code==='INPUT_TOO_LONG')return '入力表記は'+MAX_INPUT_LENGTH+'文字以内にしてください。入力内容は切り詰めず残しています。';
 if(error?.code==='NOT_AN_INTEGER')return '小数部が残らない整数を入力してください（例：32、3.2e1）。';
 if(error?.code==='EXPONENT_OUT_OF_RANGE')return '科学表記の指数は-10000から10000の範囲で入力してください。数値自体にもモード別の上限があります。';
 if(error?.code==='INVALID_SYNTAX'||error?.code==='INVALID_TYPE')return '0以上の整数を入力してください。半角数字または科学表記（例：3.2e1）を使えます。';
 return engine==='standard'?'通常モードは2^128未満（最大39桁）です。上限以上の値は詳細設定で高精度モードを明示的に選んでください。':'高精度／大メモリの入力は最大100桁、かつ332bit以下にしてください。100桁でも上限を超える値は入力できません。';
}
export function selectSitePlan(engine,settings={},hints={},small=false){
 if(!['standard','optimized','wide'].includes(engine))throw Error('Named engine required');
 if(small||engine==='standard')return normalPlan({timeBudgetMs:Math.min(settings.timeBudgetMs??1000,60000)},hints);
 return engine==='wide'?widePlan(settings):normalPlan(settings,hints);
}
