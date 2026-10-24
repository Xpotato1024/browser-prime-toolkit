import test from 'node:test';import assert from 'node:assert/strict';
import {createSettingsState} from '../../src/site/settings-state.js';
test('settings are drafts until valid apply; cancel preserves applied engine and remembered values',()=>{
 const s=createSettingsState({hardwareConcurrency:4});s.begin();s.edit('engine','optimized');s.edit('mode','manual');s.edit('workers','3');s.edit('memory','512');s.edit('time','5000');assert.equal(s.applied().engine,'standard');s.apply();assert.equal(s.effective().memoryMiB,512);s.begin();s.edit('mode','auto');assert.equal(s.draft().memory,'512');assert.equal(s.effective(s.draft()).memoryMiB,undefined);s.edit('engine','wide');s.cancel();assert.equal(s.applied().engine,'optimized');assert.equal(s.effective().workers,3);s.begin();assert.equal(s.draft().time,'5000');
});
test('invalid draft cannot alter the applied budget, and mode round trips retain manual values',()=>{
 const s=createSettingsState();s.begin();s.edit('engine','optimized');s.edit('mode','manual');s.edit('memory','1536');assert.throws(()=>s.apply());assert.equal(s.applied().engine,'standard');s.edit('mode','auto');s.apply();assert.equal(s.applied().memory,'1536');assert.equal(s.effective().memoryMiB,undefined);s.begin();s.edit('mode','manual');assert.throws(()=>s.validateDraft());s.cancel();assert.equal(s.applied().mode,'auto');
});
