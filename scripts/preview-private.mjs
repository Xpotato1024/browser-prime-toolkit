import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
export function createPrivatePreviewServer(){
 return createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
   const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   if(path.includes('\\')||path.includes('\0'))throw Error('Invalid path');
   const route=path==='/'?'/app/index.html':path;
   const directory=route.startsWith('/app/')?'app':route.startsWith('/src/')?'src':null;
   if(!directory)throw Error('Not a public asset');
   const file=await realpath(resolve(root,'.'+route)),allowed=await realpath(resolve(root,directory));
   if(!file.startsWith(allowed+sep)||!mime[extname(file)]||!(await stat(file)).isFile())throw Error('Not a file');
   const bytes=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2);
 if(args.length&&!(args.length===2&&args[0]==='--port'&&/^\d+$/.test(args[1])))throw Error('Usage: preview-private.mjs [--port 0..65535]');
 const port=args.length?Number(args[1]):4173;
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid loopback port');
 const server=createPrivatePreviewServer();server.listen(port,'127.0.0.1',()=>console.log('Private preview: http://127.0.0.1:'+server.address().port));
}
