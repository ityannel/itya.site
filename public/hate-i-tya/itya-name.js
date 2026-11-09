// itya-name.js — turns a name (kana, or Latin letters) into an i-tya proper noun.
// Fully offline and deterministic: no dictionary server, no AI.
//
// Rules come from the dictionary's own spec (i-tya-dictionary/server.js):
//   - 13 letters: vowels a i u / consonants h k l m n p s t / glides w y
//   - syllables are (C)(G)V only, and a word may never end in a consonant
//   - proper nouns are transliterated, start with a capital and end in -a (noun)
//     e.g. Michael -> Maikilua, ジャクソン -> Yakusuna
// Sound mapping used here:  e->i  o->u   g->k  z->s  d->t  b->p  f->h  v->p
//                           r->l  j->y   sh->sy(si)  ch->ty  ts->t  ん->na
//                           small っ is dropped, ー repeats the previous vowel.
(function (root) {
  'use strict';

  // ---- stage 1: kana -> romaji-ish string (N = ん, Q = っ, '-' = ー) ----
  var BASE = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
    'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
    'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
    'や':'ya','ゆ':'yu','よ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
    'わ':'wa','ゐ':'i','ゑ':'e','を':'o','ん':'N',
    'ゔ':'vu','ゎ':'wa','っ':'Q','ー':'-'
  };
  var SMALL_Y = { 'ゃ':'a', 'ゅ':'u', 'ょ':'o' };
  var SMALL_V = { 'ぁ':'a', 'ぃ':'i', 'ぅ':'u', 'ぇ':'e', 'ぉ':'o' };

  function toHiragana(ch) {
    var c = ch.charCodeAt(0);
    if (c >= 0x30A1 && c <= 0x30F6) return String.fromCharCode(c - 0x60); // katakana -> hiragana
    if (ch === 'ー' || ch === 'ｰ') return 'ー';                  // ー / half-width ｰ
    return ch;
  }

  // consonant part of a mora like "shi" -> "sh", "fu" -> "f", "u" -> "w" (for ウィ etc.)
  function consonantOf(mora) {
    if (mora === 'u') return 'w';
    var m = /^([a-z]*?)[aiueo]$/.exec(mora);
    return m ? m[1] : '';
  }

  function kanaToRomaji(input) {
    var out = [];            // array of mora strings (so small kana can modify the previous one)
    var chars = Array.from(String(input || ''));
    for (var i = 0; i < chars.length; i++) {
      var raw = chars[i];
      var h = toHiragana(raw);
      if (SMALL_Y[h] && out.length) {
        // きゃ -> kya, しゅ -> shu, ちょ -> cho ...
        var prev = out[out.length - 1];
        var m = /^([a-z]+)i$/.exec(prev);
        if (m) out[out.length - 1] = m[1] + 'y' + SMALL_Y[h];
        else out.push('y' + SMALL_Y[h]);
      } else if (SMALL_V[h] && out.length) {
        // ファ -> fa, ティ -> ti, ウィ -> wi ...
        var p2 = out[out.length - 1];
        var c2 = consonantOf(p2);
        out[out.length - 1] = (p2 === 'N' || p2 === 'Q' || p2 === '-' ? '' : c2) + SMALL_V[h];
      } else if (BASE[h]) {
        out.push(BASE[h]);
      } else if (/[A-Za-z]/.test(raw)) {
        out.push(raw.toLowerCase());
      } else if (h === '-' || raw === '―' || raw === '−') {
        out.push('-');
      }
      // anything else (kanji, spaces, symbols) is ignored
    }
    return out.join('');
  }

  // ---- stage 2: romaji-ish string -> i-tya syllables ----
  var CONS = { k:'k', g:'k', s:'s', z:'s', t:'t', d:'t', n:'n', h:'h', f:'h',
               b:'p', p:'p', m:'m', y:'y', r:'l', l:'l', w:'w', v:'p', c:'k',
               q:'k', x:'k', j:'y' };
  var VOW = { a:'a', i:'i', u:'u', e:'i', o:'u' };
  var isVowel = function (c) { return c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u'; };

  function romajiToItya(rom) {
    // collapse doubled consonants (kk, tt ...) like っ
    rom = rom.replace(/([b-df-hj-np-tv-z])\1/g, '$1');
    var out = '';
    var i = 0, n = rom.length;
    while (i < n) {
      var ch = rom[i];
      if (ch === 'N') { out += 'na'; i++; continue; }
      if (ch === 'Q') { i++; continue; }
      if (ch === '-') {
        var last = out[out.length - 1];
        if (last && isVowel(last)) out += last;
        i++; continue;
      }
      if (isVowel(ch)) { out += VOW[ch]; i++; continue; }
      if (!/[a-z]/.test(ch)) { i++; continue; }

      // consonant (maybe a digraph)
      var C, G = '', two = rom.substr(i, 2);
      if (two === 'sh') { C = 's'; G = 'y'; i += 2; }
      else if (two === 'ch') { C = 't'; G = 'y'; i += 2; }
      else if (two === 'ts') { C = 't'; i += 2; }
      else if (two === 'th') { C = 't'; i += 2; }
      else if (two === 'ph') { C = 'p'; i += 2; }
      else if (two === 'kh' || two === 'gh') { C = 'k'; i += 2; }
      else { C = CONS[ch] || ''; i += 1; }
      if (!C) continue;

      // optional glide (y / w) written explicitly, e.g. kya, kwa
      if (!G && (rom[i] === 'y' || rom[i] === 'w') && isVowel(rom[i + 1] || '')) {
        G = rom[i]; i++;
      } else if (G === 'y' && rom[i] === 'y' && isVowel(rom[i + 1] || '')) {
        i++;                                     // "shya" / "chya": the glide is already there
      }
      if (C === 'y' || C === 'w') G = '';       // no "yya" / "wwa"

      var V;
      if (isVowel(rom[i] || '')) {
        // "shi" is plain "si"
        if (C === 's' && G === 'y' && rom[i] === 'i') G = '';
        V = VOW[rom[i]]; i++;
      } else if (C === 'n') {
        V = 'a'; G = '';                         // n with no vowel (coda) -> na
      } else {
        V = 'u';                                 // add a vowel: no syllable may end in a consonant
        G = '';
      }
      out += C + G + V;
    }
    return out;
  }

  var SYLLABLE_OK = /^(?:[hklmnpst]?[wy]?[aiu])+$/;

  // Name (kana / Latin) -> "Halutua" style i-tya proper noun. Returns '' if nothing usable.
  function toItyaName(input) {
    var rom = kanaToRomaji(input);
    var s = romajiToItya(rom);
    if (!s) return '';
    if (s[s.length - 1] !== 'a') s += 'a';        // proper nouns end in -a (noun)
    if (!SYLLABLE_OK.test(s)) return '';          // should never happen; fail safe
    return s[0].toUpperCase() + s.slice(1);
  }

  var api = { toItyaName: toItyaName, kanaToRomaji: kanaToRomaji, romajiToItya: romajiToItya, SYLLABLE_OK: SYLLABLE_OK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ItyaName = api;
})(typeof window !== 'undefined' ? window : this);
