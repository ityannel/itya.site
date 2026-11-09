// Run with: node --test tests/itya-name.test.cjs
// (the browser file is loaded through vm so it stays a plain <script>)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/hate-i-tya/itya-name.js'), 'utf8'), sandbox);
const { toItyaName, SYLLABLE_OK, kanaToRomaji } = sandbox.ItyaName;

test('matches the dictionary spec examples', () => {
  assert.strictEqual(toItyaName('マイケル'), 'Maikilua');     // Michael -> Maikilua
  assert.strictEqual(toItyaName('ジャクソン'), 'Yakusuna');   // Jackson -> Yakusuna
});

test('typical Japanese names', () => {
  const cases = {
    'はると': 'Halutua',
    'ハルト': 'Halutua',
    'ゆうた': 'Yuuta',
    'さくら': 'Sakula',
    'けんた': 'Kinata',
    'しょうた': 'Syuuta',
    'ちひろ': 'Tyihilua',
    'さっちゃん': 'Satyana',
    'あおい': 'Auia',
    'ふみか': 'Humika',
    'りょうすけ': 'Lyuusukia',
    'ニューヨーク': 'Nyuuyuukua',
  };
  for (const [input, want] of Object.entries(cases)) assert.strictEqual(toItyaName(input), want, input);
});

test('Latin letters work too (physical keyboard)', () => {
  assert.strictEqual(toItyaName('haruto'), 'Halutua');
  assert.strictEqual(toItyaName('maikeru'), 'Maikilua');
  assert.strictEqual(toItyaName('jakuson'), 'Yakusuna');
  for (const s of ['Christopher', 'Emma', 'Sophia', 'Xavier', 'Wyatt', 'Quinn']) {
    const r = toItyaName(s);
    assert.match(r.toLowerCase(), SYLLABLE_OK, s + ' -> ' + r);
  }
});

test('every output is valid i-tya: 13 letters, (C)(G)V syllables, ends in -a, capitalised', () => {
  const kana = Array.from('あいうえおかきくけこがぎぐげごさしすせそざじずぜぞたちつてとだぢづでどなにぬねのはひふへほばびぶべぼぱぴぷぺぽまみむめもやゆよらりるれろわゐゑをんゔぁぃぅぇぉゃゅょっー');
  const inputs = [...kana];
  for (const a of kana) for (const b of kana) inputs.push(a + b);
  let checked = 0;
  for (const s of inputs) {
    const r = toItyaName(s);
    if (r === '') continue;                         // lone っ / ー etc. produce nothing: fine
    checked++;
    assert.match(r.toLowerCase(), SYLLABLE_OK, `${s} -> ${r}`);
    assert.ok(r.toLowerCase().endsWith('a'), `${s} -> ${r} must end in a`);
    assert.strictEqual(r[0], r[0].toUpperCase(), `${s} -> ${r} must start uppercase`);
    assert.match(r.toLowerCase(), /^[aiuhklmnpstwy]+$/, `${s} -> ${r} uses only the 13 letters`);
  }
  assert.ok(checked > 1000, 'checked many inputs: ' + checked);
});

test('garbage and empty input are safe', () => {
  for (const s of ['', '   ', '漢字', '!!!', '123', null, undefined, '😀']) assert.strictEqual(toItyaName(s), '', String(s));
  assert.strictEqual(kanaToRomaji('っ'), 'Q');
});
