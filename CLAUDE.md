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
| リソース | 上限 | 超過時 |
|---------|------|--------|
| DB容量 | 500MB | 書き込み停止 |
| 月間アクティブユーザー | 50,000 | 認証停止 |
| Realtime 同時接続 | 200 | 新規接続拒否 |
| Edge Functions 呼び出し | 500,000回/月 | 課金発生 |
| ストレージ | 1GB | アップロード停止 |

- `pomodoro_logs` は蓄積し続けるので定期的に古いデータを削除するか TTL を設ける
- Realtime チャンネルは使い終わったら必ず `unsubscribe()` する（リークで同時接続数が枯渇）
- Edge Functions は使わず RPC で代替できるなら RPC を使う

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
