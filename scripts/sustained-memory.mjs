// SPDX-License-Identifier: AGPL-3.0-only
import {BrowserMemorySampler} from './browser-memory.mjs';
export class SustainedMemorySampler extends BrowserMemorySampler{
 constructor(pid){super(pid,250);}
 async sample(){if(this.samples.length>=4000)throw Error('RAM sample retention cap');return super.sample();}
}
