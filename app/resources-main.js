// SPDX-License-Identifier: AGPL-3.0-only
import {mountResourceApp} from '../src/resources/mount.js';
const root=document.getElementById('resource-app');let current=mountResourceApp(root),draft='';
addEventListener('pagehide',()=>{draft=current.getDraft();current.dispose();});
addEventListener('pageshow',e=>{if(e.persisted){current=mountResourceApp(root);current.setDraft(draft);}});
export const getApp=()=>current;
