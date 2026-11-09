// Run with: node --test "tests/*.test.cjs"
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '../public/hate-i-tya');
const load = (file) => { const sb = { window: {}, document: {}, URLSearchParams, module: undefined }; sb.window = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), sb); return sb; };
const { ItyaCard } = load('card.js');
const qrcode = load('vendor/qrcode.js').qrcode;

const sample = { name: 'Halutua', kana: 'はると', built: 'ma pati hukapata', words: ['hapo', 'hukapata'] };

test('share data survives the round trip through the URL hash', () => {
  const url = ItyaCard.shareUrl(sample);
  assert.ok(url.startsWith('https://ityannel.github.io/itya.site/hate-i-tya/card.html#'));
  const back = ItyaCard.parseHash(new URL(url).hash);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), sample);
});

test('data is in the #fragment only (never sent to a server) and the base can be overridden', () => {
  const url = ItyaCard.shareUrl(sample, 'https://example.org/x/');
  assert.ok(url.startsWith('https://example.org/x/card.html#'));
  assert.strictEqual(new URL(url).search, '');
  assert.ok(!url.split('#')[0].includes('Halutua'));
});

test('anything arriving from a URL is sanitised', () => {
  const d = ItyaCard.parseHash('#n=%3Cscript%3Ealert(1)%3C%2Fscript%3E&k=%3Cb%3E%E3%81%82&s=A%3Cb%3E+B&w=ok.%3Cimg%3E.x1y');
  assert.match(d.name, /^[A-Za-z]+$/);
  assert.ok(!/[<>]/.test(JSON.stringify(d)));
  assert.strictEqual(d.kana, 'あ');
  assert.deepStrictEqual(Array.from(d.words), ['ok', 'img', 'xy']);
  assert.strictEqual(ItyaCard.parseHash('').name, '');
});

test('even the longest possible card still fits in a QR code', () => {
  const worst = { name: 'A'.repeat(24), kana: 'ゆゆゆゆゆゆゆゆ', built: ('hukapata ').repeat(7), words: Array(10).fill('hukapatahukapata') };
  const url = ItyaCard.shareUrl(worst);
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  assert.ok(q.getModuleCount() <= 121, 'version <= 22, got modules=' + q.getModuleCount());
  // the normal case stays small (easy to scan from a screen)
  const q2 = qrcode(0, 'M'); q2.addData(ItyaCard.shareUrl(sample)); q2.make();
  console.log('normal card QR: ' + q2.getModuleCount() + 'x' + q2.getModuleCount() + ' modules, URL ' + ItyaCard.shareUrl(sample).length + ' chars');
  assert.ok(q2.getModuleCount() <= 57);
});
