# オープンキャンパス用デモ(`?demo=1`)

## 開き方
- 公開版: `https://ityannel.github.io/itya.site/hate-i-tya/index.html?demo=1`
- 手元のPCで: `public/hate-i-tya` を静的サーバーで配信し `index.html?demo=1`(例: `node` や `py -m http.server 5173`)
- Chromeのキオスク表示の例: `chrome --kiosk "URL"`(最初の1クリックでBGMが鳴ります)
- `?demo=1&scene=N` でその場面から開始(確認用)。`?demo=1&qrbase=https://.../hate-i-tya/` でQRの行き先を変更(末尾 `/` 必須)

## デモで起きること(約3分)
1. 変換済みの場面だけをつないだ経路(古い言語の行・マップ・神様の長い独白は飛ばす)。
2. 終盤、冒頭で老人が聞いた `Pa a i nyu?` を神様がもう一度聞く → **来場者が名前を入力**(ひらがなの表をタップ、またはキーボードのローマ字)→ i-tya語の名前に音訳 → 主人公が `Ma swa <Name> ana.` と答える。
3. **カード**(名前・組み立てた文・覚えた語)と**QRコード**を表示。スマホで読むと `card.html` が開き、同じカードが見られる(画像として長押し保存、または ⬇PNG)。
4. 無操作45秒で `Oi?`、さらに12秒で最初に戻る(次の来場者用)。

## 守っていること
- サーバー通信なし・マイクなし(フォントだけGoogle Fontsから読む)。ネットが無くても進行する。
- 名前は端末内だけで処理。QRのURLは `#` 以降に入れているので、サーバーには送られない。
- スペース3連打のスキップは無効。

## 前日までの確認
- [ ] `open-campus-demo` を main に統合して公開(QRの行き先 `card.html` が公開側に必要)
- [ ] 本番と同じ端末・ブラウザで通し(クイズ4回+神様の選択+文の組み立て)
- [ ] スマホの標準カメラでQRを読む(iPhone/Android 各1台)。画面の明るさを上げる
- [ ] `Ma swa <Name> ana.` と `Pa hati nu!`(神様の返事)の意味を作者が確認(辞書の翻訳器の形に合わせたもの)
- [ ] Windowsでgit cloneした場合、`images/Yanya.jpg` と `yanya.jpg` が衝突します。公開版かzipから配信してください

## テスト
```
node --test "tests/*.test.cjs"
```
- 名前の音訳(辞書の仕様例 Maikilua / Yakusuna と一致、全かな2文字の組み合わせで音韻規則を検査)
- 経路の全語が辞書にあること(`tests/fixtures/allowed.json` は 2026-11-09 の辞書の写し。辞書が増えたら更新)
- QR用URLの往復・無害化・最大長でもQRが作れること
