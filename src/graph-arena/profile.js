// SPDX-License-Identifier: AGPL-3.0-only
import{GRAPH_FIELDS,GraphSession}from'../graph-profile/session.js';
export const PACKED_FIELDS=Object.freeze([...GRAPH_FIELDS,'retainedPayloadBytes']);
export class PackedSession extends GraphSession{
 profile(){const b=this.take(this.api.codex_graph_profile(this.session));if(b.length!==12+8*PACKED_FIELDS.length)throw Error('Packed schema2 width');const v=new DataView(b.buffer);return Object.fromEntries(PACKED_FIELDS.map((k,i)=>[k,Number(v.getBigUint64(12+8*i,true))]));}
}
