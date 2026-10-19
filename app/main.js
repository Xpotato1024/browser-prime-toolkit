import {createPageLifecycle} from '../src/ui/page-lifecycle.js';
export const page=createPageLifecycle(document.getElementById('factor-app'));
export const app=page.getApp();
