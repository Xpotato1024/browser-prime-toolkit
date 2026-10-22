import { readFile, readdir } from 'node:fs/promises';
// Only descendants of the dedicated Chrome process launched by this harness.
export class BrowserMemorySampler {
  constructor(pid, intervalMs=25, {read=readFile,list=readdir}={}) {
    this.pid=pid;this.intervalMs=intervalMs;this.samples=[];this.running=false;this.read=read;this.list=list;
  }
  async sample() {
    const seen=new Set(),queue=[this.pid];let rss=0,pss=0;
    while(queue.length) {
      const pid=queue.pop();if(seen.has(pid))continue;seen.add(pid);
      try {
        for(const task of await this.list('/proc/'+pid+'/task')) {
          try {
            const children=await this.read('/proc/'+pid+'/task/'+task+'/children','utf8');
            queue.push(...children.trim().split(/\s+/).filter(Boolean).map(Number));
          } catch(error) {if(error.code!=='ENOENT'&&error.code!=='ESRCH')throw error;}
        }
        const text=await this.read('/proc/'+pid+'/smaps_rollup','utf8');
        rss+=Number(/^Rss:\s+(\d+)/m.exec(text)?.[1]??0)*1024;
        pss+=Number(/^Pss:\s+(\d+)/m.exec(text)?.[1]??0)*1024;
      } catch(error) {if(error.code!=='ENOENT'&&error.code!=='ESRCH')throw error;}
    }
    const row={atMs:performance.now(),rssBytes:rss,pssBytes:pss,processes:seen.size};
    this.samples.push(row);return row;
  }
  async start() {
    this.running=true;
    this.loop=(async()=>{while(this.running){await this.sample();await new Promise(r=>setTimeout(r,this.intervalMs));}})();
    this.loop.catch(e=>{this.error=e;this.running=false;});
  }
  mark() {return this.samples.length;}
  summary(mark=0) {
    if(this.error)throw this.error;
    const rows=this.samples.slice(mark);if(!rows.length)throw Error('Missing browser RAM samples');
    return {samples:rows.length,first:rows[0],peakRssBytes:Math.max(...rows.map(x=>x.rssBytes)),
      peakPssBytes:Math.max(...rows.map(x=>x.pssBytes)),maxProcesses:Math.max(...rows.map(x=>x.processes))};
  }
  async stop() {this.running=false;await this.loop;if(this.error)throw this.error;}
}
