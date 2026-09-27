async () => {
 const tab=await page.context().newPage();await tab.goto('http://127.0.0.1:4174');
 const result=await tab.evaluate(async()=>{
  const base=(await import('/src/data/projects.json?import')).default[0];
  const projects=Array.from({length:10000},(_,i)=>({...base,id:`cancel-${i}`,company:i%2?'B':'A',endpoints:[{name:'Synthetic point',coordinate:[32+(i%100)*.00001,-81+Math.floor(i/100)*.00001]}]}));
  const W=(await import('/src/workers/spatial.worker.ts?worker')).default;const worker=new W();
  const q={companies:['A','B'],from:'',to:'',includeUndated:true,thresholdMiles:15000,limit:200,maxCandidates:Infinity,maxNeighborsPerOrigin:Infinity,timeBudgetMs:2000};
  const measurement=await new Promise((resolve,reject)=>{
   let sent=0,candidates=0,obsolete=0;const timeout=setTimeout(()=>reject(new Error('Cancellation benchmark timeout')),15000);
   worker.onerror=e=>reject(new Error(e.message));worker.onmessage=({data})=>{
    if(data.type==='error')reject(new Error(data.error));
    if(data.requestId===1&&data.type==='result')worker.postMessage({type:'query',requestId:2,datasetVersion:'v',query:q});
    if(data.requestId===2&&data.type==='progress'&&data.progress.candidateCount>0&&!sent){candidates=data.progress.candidateCount;sent=performance.now();worker.postMessage({type:'cancel',requestId:2});worker.postMessage({type:'query',requestId:3,datasetVersion:'v',query:{...q,companies:[]}});}
    if(data.requestId===2&&data.type==='result')obsolete++;
    if(data.requestId===3&&data.type==='result'){clearTimeout(timeout);resolve({records:10000,candidatesAtCancel:candidates,cancelToReplacementReadyMs:performance.now()-sent,obsoleteResults:obsolete,replacementMatches:data.result.matchedCount});}
   };
   worker.postMessage({type:'prepare',projects,datasetVersion:'v',geometryVersion:'v'});worker.postMessage({type:'query',requestId:1,datasetVersion:'v',query:{...q,companies:[]}});
  });worker.terminate();return {...measurement,recordedAt:new Date().toISOString(),method:'Cancel sent after a progress report with actual candidates processed; warm real browser Worker. Measures replacement empty-query completion, not a hard cancellation bound.'};
 });await tab.close();return result;
}
