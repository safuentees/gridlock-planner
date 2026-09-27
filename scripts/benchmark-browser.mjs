// Optional real-browser benchmark runner. Requires Playwright CLI, dev:4174 and preview:4175.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const mode=process.argv[2]??'import';
if(!['import','map','cancellation'].includes(mode))throw new Error('Choose import, map or cancellation');
const cli=process.env.PLAYWRIGHT_CLI??'playwright-cli';
const session='-s=gridlock-benchmark';
mkdirSync('output/playwright/fixtures',{recursive:true});
if(mode==='import'){
  const header='project_id,utility,project_name,state,endpoint_a_name,endpoint_a_latitude,endpoint_a_longitude,endpoint_b_name,endpoint_b_latitude,endpoint_b_longitude,milestone_date,date_precision,date_meaning';
  for(const n of [1000,10000,25000]){
    const rows=[header];for(let i=0;i<n;i++)rows.push([`fixture-${i}`,i%2?'B':'A',`Synthetic project ${i}`,'GA','Station A',32+(i%100)*.00001,-81+Math.floor(i/100)*.00001,'Station B','','','2028','year','need_date'].join(','));
    writeFileSync(`output/playwright/fixtures/dense-${n}.csv`,rows.join('\r\n')+'\r\n');
  }
}
execFileSync(cli,[session,'open',mode!=='import'?'http://127.0.0.1:4174':'http://127.0.0.1:4175'],{stdio:'pipe',timeout:30000});
const code=readFileSync(`scripts/benchmarks/browser-${mode}.js`,'utf8');
const result=execFileSync(cli,[session,'run-code',code],{encoding:'utf8',timeout:180000,maxBuffer:10*1024*1024});
const match=/### Result\n([\s\S]*?)\n### Ran/.exec(result);
if(!match)throw new Error(result);
const data=JSON.parse(match[1]);
writeFileSync(`output/playwright/browser-${mode}-benchmark.json`,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data,null,2));
