import data from "@/data/processed/constitution-india-2026.json";
import type { LegalChunk,RetrievedChunk } from "@/lib/legal/types";
const chunks=data.chunks as LegalChunk[];
const stop=new Set("i me my the a an is are was were and or to of for in on it this that they them have has had not but from with because someone what".split(" "));
const synonyms:Record<string,string[]>={arrest:["detention","detained","custody","police","grounds"],speech:["speaking","expression","criticised","instagram","publicly"],equality:["differently","discrimination","religion","caste","race","sex"],education:["school","child","elementary","denied"],aid:["lawyer","afford","legal aid","justice"],life:["violence","liberty","danger","threat"]};
function tokens(s:string){const base=(s.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(x=>x.length>2&&!stop.has(x));const expanded=[...base];for(const[k,v]of Object.entries(synonyms))if(base.includes(k)||v.some(x=>s.toLowerCase().includes(x)))expanded.push(k,...v);return [...new Set(expanded)]}
function vectorize(text:string,size=384){const v=Array(size).fill(0);for(const token of tokens(text)){let h=2166136261;for(let i=0;i<token.length;i++)h=Math.imul(h^token.charCodeAt(i),16777619);h>>>=0;v[h%size]+=(h&256)?1:-1}const n=Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1;return v.map(x=>x/n)}
export class LegalRetriever{
  search(query:string,limit=8):RetrievedChunk[]{const q=tokens(query),qv=vectorize(query);return chunks.map(chunk=>{const hay=`${chunk.article} ${chunk.heading} ${chunk.text}`.toLowerCase();const hits=q.filter(t=>hay.includes(t)).length;const keywordScore=q.length?hits/q.length:0;const semanticScore=chunk.embedding.reduce((s,x,i)=>s+x*(qv[i]||0),0);return{chunk,keywordScore,semanticScore,score:keywordScore*.72+Math.max(0,semanticScore)*.28}}).filter(x=>x.score>.01).sort((a,b)=>b.score-a.score).slice(0,limit)}
}
