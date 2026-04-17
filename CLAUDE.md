# PomoFight — Claude向け開発メモ

## ⚠️ セキュリティ事故パターン（必読）

### 1. APIキーの直書き禁止
**やってはいけない:**
```js
// ❌ 絶対にやらない
const supabase = createClient('https://xxxx.supabase.co', 'eyJhbGci...')
```
**正しい方法:** 必ず `.env` から読み込む
```js
// ✅
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
```
- ハードコードしたキーは git に残り、公開リポジトリでは即座に漏洩する
- 漏洩した場合は Supabase ダッシュボードでキーをローテーションすること

### 2. ログへのトークン出力禁止
**やってはいけない:**
```js
// ❌ セッション・トークンをログに出すな
console.log('session:', session)
console.log('user:', JSON.stringify(user))
```
- `session.access_token` や `session.refresh_token` が含まれる
- ログは開発ツール・クラッシュレポートに残る
- デバッグ時は `user.id` や `user.email` だけ出す

### 3. Supabase 無料枠の上限

無料枠を超えると**アプリが突然動かなくなる**。課金は基本発生しないが機能が止まる。

**DB容量 500MB**
- 超えると書き込みが全部止まる（読み込みは可）
- `pomodoro_logs` がユーザー×回数で膨らむ → 古いデータを定期削除するか件数上限を設ける
- 現状の目安: 1ユーザーが毎日8ポモドーロ×1年 ≒ 3,000行 ≒ 数百KB → 数百ユーザーまでは余裕

**月間アクティブユーザー（MAU）50,000人**
- 超えると新規ログイン・サインアップが止まる（既存ログイン済みユーザーは使える）
- PomoFightの現段階では全く気にしなくていい

**Realtime 同時接続 200**
- 超えると新しい対戦の接続が繋がらない（既存の接続は維持）
- 対戦1回につき1〜2チャンネルを使う → 100対戦が同時進行すると上限
- **必ず `unsubscribe()` を呼ぶ**。コンポーネントのクリーンアップで漏れると接続が積み上がる
- 現状のコードは `useEffect` の `return` で `unsubscribe()` しているので問題なし

**帯域幅 5GB/月**
- 画像など大きいファイルを大量配信すると超える
- 現状: 木・魚の画像は Expo バンドル内にあるので Supabase の帯域は消費しない → 問題なし

**Edge Functions 500,000回/月**（現在未使用）
- 使い始めたら意識する。RPC（DB関数）で代替できるなら RPC の方が安全

---

## 環境変数・APIキー

- Supabase URL / Anon Key などのAPIキーは `.env` に記載し、`.gitignore` で隠すこと
- `.env` はリポジトリにコミットしない
- `.env.example` にキー名だけ書いてコミットし、実際の値は各自で設定する

```
# .env（gitignore済み・コミット禁止）
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

- 新しい端末でセットアップする際は `.env.example` を参考に `.env` を手動作成すること
- Expoの環境変数は `EXPO_PUBLIC_` プレフィックスが必要（バンドル時に読み込まれる）
- `.env` を変更した場合は `r` リロードではなく Metro を再起動（`Ctrl+C` → `npm start`）
