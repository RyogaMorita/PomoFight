# PomoFight

スマホ依存と戦うポモドーロバトルアプリ。25分間スマホを伏せて集中し、相手より長く続けた方が勝ち。

## 技術スタック

- **フロントエンド:** React Native + Expo SDK 54
- **ルーティング:** expo-router v6（手動タブバー）
- **バックエンド:** Supabase（認証・DB・Realtime）
- **センサー:** expo-sensors（加速度計で伏せ検知）

## セットアップ

### 必要なもの
- Node.js 18+
- Expo Go アプリ（iOS / Android）

### 手順

```bash
git clone <repo-url>
cd PomoFight
npm install

# .env.example を参考に .env を作成
cp .env.example .env
# .env を編集して Supabase の URL と Anon Key を設定

npm start
```

### .env の設定

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase の値は [Supabase ダッシュボード](https://supabase.com) → Project Settings → API から取得。

> ⚠️ `.env` を変更した後は `r` リロードではなく Metro を再起動（`Ctrl+C` → `npm start`）

## 主な機能

- **ランダムマッチ** — 同レベルの相手とマッチング
- **フレンドバトル** — 招待コードで友達と対戦
- **フリーマッチ** — 公開部屋を作って複数人で対戦
- **木・魚の育成** — ポモドーロを積むほど成長（全10段階・6段階）
- **ランキング** — 今日のポモ数ランキング・レートランキング
- **日記** — ヒートマップと集中度ログ
- **実績バッジ** — 勝利数・ポモドーロ数に応じてアンロック

## ディレクトリ構成

```
app/
  (tabs)/         # メイン画面（タブ）
  onboarding.js   # 初回セットアップ
components/
  battle/         # バトル関連画面
  Icon.js         # 画像アイコンコンポーネント
  TreeDisplay.js  # 木の表示
  FishDisplay.js  # 魚の表示
lib/
  supabase.js     # Supabase クライアント
  theme.js        # 色・スタイル定数
context/
  AuthContext.js  # 認証状態管理
assets/
  trees/          # 木の画像（10段階）
  fish/           # 魚の画像（6段階）
```

## 開発ルール

セキュリティ上の注意事項は [CLAUDE.md](./CLAUDE.md) を参照。
