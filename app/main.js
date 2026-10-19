import {mountFactorApp} from '../src/ui/mount.js';
export const app=mountFactorApp(document.getElementById('factor-app'));
addEventListener('pagehide',()=>app.dispose(),{once:true});
