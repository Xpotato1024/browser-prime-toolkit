import assert from 'node:assert/strict';
export function upgradeLegacyLongHarness(text){
 const once=(from,to)=>{assert.ok(text.includes(from));assert.equal(text.indexOf(from),text.lastIndexOf(from));text=text.replace(from,to);};
 once("import { BrowserMemorySampler } from './browser-memory.mjs';","import { BrowserMemorySampler } from './browser-memory.mjs';\nimport {longAsset} from './long-asset-route.mjs';");
 once("      if (!url.pathname.startsWith('/src/') && !url.pathname.startsWith('/bench/') && !url.pathname.startsWith('/app/')) throw Error('Not an asset');\n      if(url.pathname.includes('oracle')||url.pathname.includes('manifest'))throw Error('Not a runtime asset');\n      const path = resolve(root, '.' + decodeURIComponent(url.pathname));",
 "      const relative=longAsset(url.pathname);if(relative===null)throw Error('Not a runtime asset');\n      const path = resolve(root, relative);");
 once("  const origin = 'http://127.0.0.1:' + port;",
 "  const origin = 'http://127.0.0.1:' + port;\n  const assetBoundarySelfTest=[];\n  for(const path of ['/bench/staged-practical/%6fracle.json','/bench/staged-practical/%256fracle.json','/bench/staged-practical/%6danifest.json','/src/%2e%2e/bench/staged-practical/oracle.json']){\n    const response=await fetch(origin+path);assert.equal(response.status,404);assert.equal(await response.text(),'');assetBoundarySelfTest.push({path,status:404});\n  }");
 once("'scripts/browser-memory.mjs',","'scripts/browser-memory.mjs','scripts/long-asset-route.mjs',");
 once("coldReadyMs,initialAssets,sourceFiles,records","assetBoundarySelfTest,coldReadyMs,initialAssets,sourceFiles,records");
 return text;
}
