// Run with: node --test tests/demo-route.test.cjs
// Guards the open-campus demo: every i-tya word shown on the demo route must be a dictionary word
// (or one of the three words the author keeps as game words: oi, hapo, mokuno).
// tests/fixtures/allowed.json is a copy of the dictionary's word tokens (taken 2026-11-09);
// refresh it when the dictionary grows.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '../public/hate-i-tya');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'scene.js'), 'utf8') + ';this.scenes=scenes;', ctx);
const scenes = ctx.scenes;

const demoSrc = fs.readFileSync(path.join(dir, 'demo.js'), 'utf8');
const routeBody = demoSrc.match(/const ROUTE = \[([\s\S]*?)\];/)[1].replace(/\/\/.*$/gm, '');
const route = routeBody.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)).map(Number);   // INTRO_* are the new scenes
const allowed = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/allowed.json'), 'utf8')));
['oi', 'hapo', 'mokuno'].forEach(w => allowed.add(w));
const hasJa = s => /[぀-ヿ一-鿿]/.test(s);

function linesOf(i) {
  const s = scenes[i], out = [];
  if (s.text && s.text.content) out.push(s.text.content);
  const a = (s.action || '').toString();
  for (const m of a.matchAll(/(?:text|question)\s*:\s*"([^"]*)"/g)) out.push(m[1]);   // quiz question / options
  return out;
}

test('route only uses existing scenes, in a connected order', () => {
  assert.ok(route.length > 40);
  for (const i of route) assert.ok(scenes[i], 'scene ' + i + ' exists');
  assert.strictEqual(new Set(route).size, route.length, 'no scene twice');
});

test('every i-tya word on the demo route is in the dictionary', () => {
  const bad = [];
  let checked = 0;
  for (const i of route) for (const line of linesOf(i)) {
    if (hasJa(line)) continue;                                  // author-written Japanese (the god, quiz options)
    for (const t of line.toLowerCase().match(/[a-z]+/g) || []) { checked++; if (!allowed.has(t)) bad.push(`scene ${i}: "${line}" -> ${t}`); }
  }
  assert.ok(checked > 60, 'checked ' + checked);
  assert.deepStrictEqual(bad, []);
});

test('the new ending lines use dictionary words', () => {
  for (const line of ['Pa a i nyu?', 'Pa hati nu!', 'Ma swa', 'ana']) {
    for (const t of line.toLowerCase().match(/[a-z]+/g)) assert.ok(allowed.has(t), t);
  }
});
