// Dependency-free release checks. Run with Node.js 22+: npm run verify
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {CATALOG,tick,evaluate} from './public/scripts/economy.js';
import {MODES} from './public/scripts/modes.js';
import {newCity,build,placement,upgrade,demolish,recovery} from './public/scripts/game.js';
import {serializable,parseSave,validateSave} from './public/scripts/storage.js';
import {scoreCity} from './public/scripts/scoring.js';
import worker from './src/index.js';
import {validName,body} from './src/http.js';
const root=dirname(fileURLToPath(import.meta.url));let checks=0;const pass=text=>{checks++;console.log(`PASS ${text}`);};
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
for(const f of [...files(join(root,'public')), ...files(join(root,'src'))].filter(f=>f.endsWith('.js'))){assert.equal(spawnSync(process.execPath,['--check',f]).status,0,`Syntax: ${f}`);const source=readFileSync(f,'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))assert(existsSync(resolve(dirname(f),m[1])),`Missing module ${m[1]}`);}
pass('All browser and Worker modules parse and relative module imports exist');
for(const c of Object.values(CATALOG))assert(existsSync(join(root,'public/assets/icons',c.icon+'.svg')));
for(const path of ['wrangler.jsonc','package.json','README.md','schema.sql','public/assets/buildings/skyline.svg','public/assets/icons/city.svg'])assert(existsSync(join(root,path)),path);
assert(!existsSync(join(root,'tests'))&&!existsSync(join(root,'migrations'))&&!existsSync(join(root,'.gitignore')));
pass('Required assets and root files exist; prohibited directories/files absent');
const p={id:crypto.randomUUID(),displayName:'Release Mayor'};
for(const mode of Object.keys(MODES)){
 const s=newCity(p,mode),funds=s.treasury;build(s,'house',23,19);assert.equal(s.treasury,mode==='sandbox'?funds:funds-8000);assert(placement(s,'house',23,19));assert(placement(s,'apartment',39,39));const b=s.buildings.find(b=>b.type==='house');tick(s);assert(s.population>0);upgrade(s,b.id);assert.equal(b.level,2);tick(s);demolish(s,b.id);assert(!s.buildings.includes(b));for(let i=0;i<240;i++)tick(s);assert(Number.isFinite(s.treasury));assert.deepEqual(serializable(parseSave(JSON.stringify(serializable(s)))),serializable(s));pass(`${mode}: fixed price, monthly economy, upgrades, demolition, save round trip`);
}
const s=newCity(p,'medium');s.treasury=-200;recovery(s);assert.equal(s.treasury,15000);assert.throws(()=>recovery(s));
const noPower=newCity(p,'medium');noPower.buildings=noPower.buildings.filter(b=>b.type!=='power');assert.equal(evaluate(noPower).utility,0);
pass('Debt recovery, grant bounds and utility shortages');
const good=serializable(newCity(p,'easy'));
for(const bad of [{...good,version:99},{...good,treasury:NaN},{...good,buildings:[...good.buildings,good.buildings[0]]},{...good,mode:'__proto__'},{...good,buildings:[{...good.buildings[0],type:'constructor'}]}])assert.throws(()=>validateSave(bad));
assert.throws(()=>parseSave('{'));assert.throws(()=>validName('<bad>'));pass('Reject unsafe, corrupt, nonfinite and overlapping save/input records');
const stats={population:50,happiness:80,employment:100,treasury:25000,milestones:1};assert.equal(scoreCity(stats),4350);
for(const env of [{},{DB:{prepare(){throw Error('private database internals');}}}]){const r=await worker.fetch(new Request('http://localhost/api/leaderboard'),env);assert.equal(r.status,503);assert(!(await r.text()).includes('private database'));}
assert.deepEqual(await body(new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:'{}'})),{});pass('Shared score formula, JSON parsing and redacted unavailable-D1 responses');
const raw=files(join(root,'public')).reduce((sum,f)=>sum+readFileSync(f).length,0);const compressed=files(join(root,'public')).reduce((sum,f)=>sum+gzipSync(readFileSync(f)).length,0);
console.log(`\n${checks} groups passed. Public files: ${raw} bytes raw; ${compressed} bytes summed gzip (not measured wire traffic).`);
console.log('This check does not replace Wrangler/D1 integration, browser, remote deployment or physical-device QA.');
