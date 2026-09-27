import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
const header=`GridLock — third-party notices

OpenStreetMap map data © OpenStreetMap contributors, licensed under ODbL.
https://www.openstreetmap.org/copyright
Tiles served by OpenStreetMap subject to https://operations.osmfoundation.org/policies/tiles/

Supplied utility reports/workbook retain their original ownership and public-disclosure markings.
The application does not claim authorship or relicense those source documents.
`;
let output=header;
for(const [path,entry] of Object.entries(lock.packages).sort(([a],[b])=>a.localeCompare(b))){
  if(!path||entry.dev)continue;
  const directory=join(root,path);
  if(!existsSync(directory))throw new Error(`Run npm ci first: missing ${path}`);
  const pkg=JSON.parse(readFileSync(join(directory,'package.json'),'utf8'));
  const files=readdirSync(directory).sort().filter(name=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(name));

  output+=`\n\n${'='.repeat(72)}\n${pkg.name??basename(path)} ${pkg.version}\nLicense: ${pkg.license??entry.license??'see text'}\n`;
  for(const file of files)output+='\n'+readFileSync(join(directory,file),'utf8').replaceAll('\r\n','\n').trimEnd()+'\n';
  if(!files.length)output+=`\nLicense declaration above is from package.json. No standalone license text was included in this npm package.\nAuthor: ${typeof pkg.author==='string'?pkg.author:JSON.stringify(pkg.author)}\nRepository: ${typeof pkg.repository==='string'?pkg.repository:pkg.repository?.url}\n`;
}
const target=join(root,'public/THIRD_PARTY_NOTICES.txt');
if(process.argv.includes('--check')){
  if(readFileSync(target,'utf8')!==output)throw new Error('Notices differ; run npm run notices');
  console.log('Third-party notices match installed production dependencies.');
}else{writeFileSync(target,output);console.log('Updated production dependency notices.');}
