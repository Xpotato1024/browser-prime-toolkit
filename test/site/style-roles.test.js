import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/site/tool.css',import.meta.url),'utf8');
const rule=(selector)=>css.split('\n').find(line=>line.startsWith(selector+' {'));
test('control and decorative boundaries have independent public fallbacks',()=>{
 for(const selector of ['.bt-prime-factorizer .bt-input-area','.bt-prime-factorizer button[type]']) assert.ok(rule(selector).includes('var(--bt-border-control,var(--bt-border,#736a7b))'));
 for(const selector of ['.bt-prime-factorizer details','.bt-prime-factorizer .bt-help-area','.bt-prime-factorizer .bt-modal-header','.bt-prime-factorizer .bt-modal-footer','.bt-prime-factorizer .bt-equation-frame']) assert.ok(rule(selector).includes('var(--bt-border-divider,var(--bt-border,#736a7b))'));
 assert.match(css,/\.bt-result textarea \{[^}]*var\(--bt-border-control,var\(--bt-border,#736a7b\)\)/);
 assert.equal(css.match(/var\(--bt-border,#736a7b\)/g).length,css.match(/var\(--bt-border-(?:control|divider),var\(--bt-border,#736a7b\)\)/g).length);
});
test('summary spacing is public without reducing minimum target or changing open gap',()=>{
 const summary=rule('.bt-prime-factorizer summary');
 assert.ok(summary.includes('padding:var(--bt-summary-padding-block,.55rem) 0'));
 assert.ok(summary.includes('max(var(--bt-control-min-size,2.75rem),44px)'));
 assert.ok(rule('.bt-prime-factorizer details[open] summary').includes('margin-bottom:.65rem'));
});
