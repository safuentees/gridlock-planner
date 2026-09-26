async () => {
  await page.goto('http://127.0.0.1:4175');
  await page.getByText('10 of 10 records in view',{exact:true}).waitFor();
  const runs=[];
  for(const n of [1000,10000,25000]){
    await page.getByRole('button',{name:'Import CSV / XLSX'}).click();
    const start=Date.now();
    await page.getByLabel('Project file',{exact:true}).setInputFiles(`output/playwright/fixtures/dense-${n}.csv`);
    await page.getByRole('combobox',{name:'Sheet',exact:true}).waitFor();
    const parsed=Date.now();
    await page.getByRole('button',{name:'Validate mapped rows'}).click();
    const use=page.getByRole('button',{name:'Use this dataset'});
    await use.waitFor();
    if(!await use.isEnabled())throw new Error('Invalid fixture');
    const validated=Date.now();
    await use.click();
    await page.getByText(`${n.toLocaleString()} of ${n.toLocaleString()} records in view`,{exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('.project-pin').length>0);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const rendered=Date.now();
    const markers=await page.locator('.project-pin').count();
    const rows=await page.getByRole('list',{name:'Ranked comparisons'}).getByRole('listitem').count();
    const heap=await page.evaluate(()=>performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null);
    const heatStart=Date.now();await page.getByRole('button',{name:'Heat',exact:true}).click();
    await page.locator('.leaflet-heatmap-layer').waitFor();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    runs.push({records:n,parseObservedMs:parsed-start,validateObservedMs:validated-parsed,acceptToMapObservedMs:rendered-validated,heatObservedMs:Date.now()-heatStart,markers,rows,heap});
  }
  await page.screenshot({path:'output/playwright/dense-25000.png',fullPage:true});
  return {recordedAt:new Date().toISOString(),userAgent:await page.evaluate(()=>navigator.userAgent),hardwareConcurrency:await page.evaluate(()=>navigator.hardwareConcurrency),method:'Single run per size, production preview browser; timings include automation, transfer, React and two animation frames. Dense seeded fixture, no tile-load latency guarantee. Imports intentionally capped at 25000.',runs};
}
