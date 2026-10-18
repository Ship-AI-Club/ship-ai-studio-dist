import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBrief,siteBuild} from '../lib/brief.mjs';
const base=JSON.parse(readFileSync(new URL('../examples/b2b.json',import.meta.url)));
test('build model is separate from business pricing and permits either approved choice',()=>{
 for(const buildModel of ['sonnet-5.5','opus-5.5']){
  const brief=structuredClone(base);brief.setup={buildModel,effort:'medium'};
  assert.deepEqual(validateBrief(brief),[]);assert.deepEqual(brief.business.pricing,base.business.pricing);
 }
});
test('unsupported model and effort do not pass brief validation',()=>{
 for(const setup of [{buildModel:'auto',effort:'medium'},{buildModel:'sonnet-5.5',effort:'high'},{buildModel:'opus-5.5'}])assert.ok(validateBrief({...base,setup}).length>0);
});
test('site and creative build models are separate named fields',()=>{
 const brief=structuredClone(base);brief.setup={siteBuildModel:'claude-opus-5-5',siteBuildEffort:'medium',siteBuildFast:false,creativeBuildModel:'claude-sonnet-5-5',creativeBuildEffort:'medium'};
 assert.deepEqual(validateBrief(brief),[]);
 assert.deepEqual(siteBuild(brief),{model:'claude-opus-5-5',effort:'medium',fast:false});
 assert.equal(siteBuild({setup:{creativeBuildModel:'claude-opus-5-5',creativeBuildEffort:'medium'}}).model,null);
 assert.deepEqual(siteBuild({setup:{buildModel:'opus-5.5',effort:'medium'}}),{model:'claude-opus-5-5',effort:'medium',fast:false});
});
test('fast mode, unknown creative models and conflicting legacy fields fail',()=>{
 for(const setup of [{siteBuildModel:'claude-opus-5-5',siteBuildEffort:'medium',siteBuildFast:true},{creativeBuildModel:'auto',creativeBuildEffort:'medium'},{creativeBuildModel:'claude-sonnet-5-5',creativeBuildEffort:'high'},{siteBuildModel:'claude-opus-5-5',siteBuildEffort:'medium',buildModel:'sonnet-5.5'}])assert.ok(validateBrief({...base,setup}).length>0,JSON.stringify(setup));
});
test('the starter brief leaves the site choice to the PM and defaults creative work to Sonnet 5.5 Medium',()=>{
 const brief=JSON.parse(readFileSync(new URL('../brief/project.json',import.meta.url)));
 assert.deepEqual(brief.setup,{siteBuildModel:null,siteBuildEffort:'medium',siteBuildFast:false,creativeBuildModel:'claude-sonnet-5-5',creativeBuildEffort:'medium'});
});
