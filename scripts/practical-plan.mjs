export function refinementTiers(tiers){
 const rows=tiers.slice().sort((a,b)=>a.digits-b.digits),extra=new Set();
 for(const budgetMs of [3000,30000,180000])for(let i=1;i<rows.length;i++){
  const a=rows[i-1],b=rows[i];
  if(a.solvedByBudget.find(x=>x.budgetMs===budgetMs).solved===4&&b.solvedByBudget.find(x=>x.budgetMs===budgetMs).solved<4)
   for(let d=a.digits+2;d<b.digits;d+=2)extra.add(d);
 }
 return [...extra].sort((a,b)=>a-b);
}
