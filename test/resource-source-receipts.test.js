// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {verifyReceiptSources} from '../scripts/source-receipt-proof.mjs';
test('every receipt hash is checked even when actual immutable source hash is cached',()=>{
 const cache=new Map();let reads=0;const actual=()=>{reads++;return 'actual';};
 verifyReceiptSources({'same/path':'actual'},cache,actual);
 assert.throws(()=>verifyReceiptSources({'same/path':'forged-later'},cache,actual),/Receipt source/);
 assert.equal(reads,1);
});
test('repeated equal receipt source and independent paths remain accepted',()=>{
 const cache=new Map();let reads=0;const actual=p=>{reads++;return p;};
 verifyReceiptSources({a:'a'},cache,actual);verifyReceiptSources({a:'a',b:'b'},cache,actual);
 assert.equal(reads,2);
});
