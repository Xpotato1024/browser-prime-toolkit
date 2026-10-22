// SPDX-License-Identifier: AGPL-3.0-only
export function resourceUiAsset(path){
 try{const key=decodeURIComponent(path).slice(1);if(key.split('/').some(p=>!p||p==='.'||p==='..'||p.includes('\\')||p.includes('\0')))return null;
 return ['app/resources.html','app/resources-main.js','app/resources.css'].includes(key)||key.startsWith('src/')&&key.endsWith('.js')?key:null;
 }catch{return null;}
}
