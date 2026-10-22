import {mountFactorApp} from './mount.js';
export function createPageLifecycle(root,{target=window,mount=mountFactorApp}={}){
 let app=mount(root),closed=false,draft='';
 const hide=()=>{
  if(!app)return;
  const value=root.querySelector('#integer-input')?.value??'';
  draft=value.length<=4096?value:'';
  const owner=app;app=null;owner.dispose();
 };
 const show=event=>{
  if(closed||!event.persisted||app)return;
  app=mount(root);const input=root.querySelector('#integer-input');if(input)input.value=draft;
 };
 target.addEventListener('pagehide',hide);target.addEventListener('pageshow',show);
 return{getApp:()=>app,dispose(){
  if(closed)return;closed=true;target.removeEventListener('pagehide',hide);target.removeEventListener('pageshow',show);
  if(app){const owner=app;app=null;owner.dispose();}draft='';
 }};
}
