'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
function block(start,end) {
  const a = html.indexOf(start), b = html.indexOf(end,a);
  assert.ok(a >= 0 && b>a, `Código ${start} não encontrado`);
  return html.slice(a,b);
}
test('controles independentes existem no lobby e no menu de partida', () => {
  for(const id of ['musicVolume','keyVolume','stageMusicVolume','stageKeyVolume',
    'musicVolumeOut','keyVolumeOut','stageMusicVolumeOut','stageKeyVolumeOut']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
test('ganhos independentes: som musical e som das teclas, atualizados em tempo real', () => {
  const ids = ['musicVolume','keyVolume','stageMusicVolume','stageKeyVolume'];
  const elements = Object.fromEntries(ids.flatMap(id => [[id,{value:null}], [id+'Out',{textContent:null}]]));
  const nodes = [];
  const ctx = vm.createContext({
    window: { AudioContext: class { constructor() {this.destination={};} createGain() { const node={gain:{value:0},connect(dest){this.connected=dest;}}; nodes.push(node); return node;} } },
    S:{musicVolume:100,keyVolume:60},
    $: id => elements[id.slice(1)],
    savePrefs: () => {},
  });
  vm.runInContext(block('let ctx = null, musicBus = null, keyBus = null;', 'const tick ='),ctx);
  vm.runInContext('getCtx()',ctx);
  assert.equal(nodes.length,2);
  assert.equal(nodes[0].gain.value,1);
  assert.equal(nodes[1].gain.value,.6);
  vm.runInContext("updateVolume('music', '15')",ctx);
  assert.equal(nodes[0].gain.value,.15);
  assert.equal(nodes[1].gain.value,.6);
  assert.equal(elements.stageMusicVolume.value,'15');
  vm.runInContext("updateVolume('key', '0')",ctx);
  assert.equal(nodes[0].gain.value,.15);
  assert.equal(nodes[1].gain.value,0);
  assert.equal(elements.keyVolumeOut.textContent,'0%');
});
