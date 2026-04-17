# PomoFight — Claude向け開発メモ

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
