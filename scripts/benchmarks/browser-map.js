async () => {
  const bench=await page.context().newPage();
  await bench.goto('http://127.0.0.1:4174');
  await bench.getByText('10 of 10 records in view',{exact:true}).waitFor();
  const result=await bench.evaluate(async()=>{
    const React=(await import('/node_modules/.vite/deps/react.js')).default;
    const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const {ProjectMap}=await import('/src/components/ProjectMap.tsx');
    const base=(await import('/src/data/projects.json?import')).default[0];
    const shell=document.createElement('div');shell.id='map-benchmark';shell.style.cssText='position:fixed;inset:0;background:white;z-index:9999';document.body.append(shell);
    const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const waitFor=async(predicate)=>{const start=performance.now();while(!predicate()){if(performance.now()-start>15000)throw new Error('Benchmark render timeout');await nextPaint();}};
    const runs=[];let lastProjects;
    for(const distribution of ['sparse','dense'])for(const count of [1000,10000,100000]){
      let seed=20260926;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
      const start=performance.now();const centers=new Map();
      const projects=Array.from({length:count},(_,i)=>{const p={...base,id:`synthetic-${i}`,company:i%2?'B':'A',name:`Synthetic ${i}`,shortName:`Synthetic ${i}`,endpoints:[{name:'Point',coordinate:distribution==='dense'?[32+random()*.01,-81+random()*.01]:[-80+random()*160,-180+random()*360]}]};centers.set(p.id,p.endpoints[0].coordinate);return p;});
      const prepared=performance.now();const root=createRoot(shell);
      const props={projects,centers,selected:null,fitRequest:0,onProjectSelect:()=>{}};
      root.render(React.createElement(ProjectMap,{...props,mode:'points'}));
      await waitFor(()=>shell.querySelectorAll('.project-pin').length>0);await nextPaint();
      const pointsDone=performance.now();const markers=shell.querySelectorAll('.project-pin').length;
      root.render(React.createElement(ProjectMap,{...props,mode:'heat'}));
      await waitFor(()=>!!shell.querySelector('.leaflet-heatmap-layer'));await nextPaint();
      const heatDone=performance.now();
      runs.push({distribution,records:count,syntheticPreparationMs:prepared-start,pointRenderThroughPaintMs:pointsDone-prepared,heatUpdateThroughPaintMs:heatDone-pointsDone,markers,heap:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null});
      root.unmount();await nextPaint();lastProjects=projects;
    }
    shell.remove();
    const WorkerCtor=(await import('/src/workers/spatial.worker.ts?worker')).default;
    const worker=new WorkerCtor();
    const projects=lastProjects.slice(0,10000);const version='browser-cancel-fixture';
    const query={companies:['A','B'],from:'',to:'',includeUndated:true,thresholdMiles:15000,limit:200,maxCandidates:Infinity,maxNeighborsPerOrigin:Infinity,timeBudgetMs:2000};
    const cancellation=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Worker cancellation timeout'));},15000);
      let sent=0;let obsolete=0;
      worker.onerror=e=>{clearTimeout(timeout);reject(new Error(e.message));};
      worker.onmessage=({data})=>{
        if(data.type==='error'){clearTimeout(timeout);reject(new Error(data.error));}
        if(data.requestId===1&&data.type==='result')worker.postMessage({type:'query',requestId:2,datasetVersion:version,query});
        if(data.requestId===2&&data.type==='progress'&&!sent){sent=performance.now();worker.postMessage({type:'cancel',requestId:2});worker.postMessage({type:'query',requestId:3,datasetVersion:version,query:{...query,companies:[]}});}
        if(data.requestId===2&&data.type==='result')obsolete++;
        if(data.requestId===3&&data.type==='result'){clearTimeout(timeout);resolve({records:projects.length,cancelToReplacementReadyMs:performance.now()-sent,obsoleteResults:obsolete,replacementMatches:data.result.matchedCount});}
      };
      worker.postMessage({type:'prepare',projects,datasetVersion:version,geometryVersion:version});
      worker.postMessage({type:'query',requestId:1,datasetVersion:version,query:{...query,companies:[]}});
    });
    worker.terminate();return {recordedAt:new Date().toISOString(),seed:20260926,userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,method:'Actual ProjectMap mounted in separate browser page using development modules, one measured run per case; 1200-marker sampling and <=5000 heat aggregation. Timings include effects and two animation frames, exclude source transport and tile completion. 100k is component stress, beyond25k upload cap; shared-page heap snapshots are not isolated peaks.',runs,cancellation};
  });
  await bench.close();return result;
}
