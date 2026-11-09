// Generated CI-only route; original asset boundary remains frozen.
import {labAsset as original} from './siqs-lab-asset-route.mjs';
const extras=new Set(['bench/siqs-lab-ci.html','bench/siqs-lab-ci.js','bench/lab-deadline-probe.js']);
export function labAsset(path){try{const key=decodeURIComponent(path).slice(1);return extras.has(key)?key:original(path);}catch{return null;}}
