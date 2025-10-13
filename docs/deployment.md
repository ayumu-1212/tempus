# Vercelデプロイガイド

## ⚠️ 重要な注意事項

### SQLiteについて
**Vercelのサーバーレス環境ではSQLiteのファイルシステムベースのデータベースは使用できません。**

以下のいずれかの方法でデプロイしてください：

---

## 方法1: Vercel Postgres を使用（推奨）

### 1. Vercel Postgresのセットアップ
1. Vercelダッシュボードでプロジェクトを作成
2. "Storage" タブから "Create Database" → "Postgres" を選択
3. データベースを作成

### 2. 環境変数の設定
Vercelダッシュボードの "Settings" → "Environment Variables" で以下を設定：

```
DATABASE_URL=<Vercel Postgresの接続URL>
BASIC_AUTH_USERNAME=your-username
BASIC_AUTH_PASSWORD=your-password
```

Discord Bot用（オプション）：
```
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_USER_ID=your-discord-user-id
DISCORD_NOTIFICATION_CHANNEL_ID=your-channel-id
```

### 3. Prismaスキーマの修正

`prisma/schema.prisma` を以下のように変更：

```prisma
datasource db {
  provider = "postgresql"  // sqlite から変更
  url      = env("DATABASE_URL")
}
```

### 4. マイグレーションの実行

ローカルで：
```bash
npx prisma migrate dev --name init
```

Vercelにプッシュ後、自動的にマイグレーションが実行されます。

---

## 方法2: Turso（SQLite互換のエッジDB）を使用

### 1. Tursoのセットアップ
```bash
# Turso CLIをインストール
brew install tursodatabase/tap/turso

# ログイン
turso auth login

# データベースを作成
turso db create tempus

# 接続URLを取得
turso db show tempus --url
```

### 2. 環境変数の設定
```
DATABASE_URL=<Tursoの接続URL>
```

### 3. Prismaスキーマの修正

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

---

## 方法3: Railway等の別プラットフォーム

VercelはWeb UIのみをホスト、データベースはRailway等の別サービスを使用：

1. Railwayで PostgreSQL をデプロイ
2. 接続URLをVercelの環境変数に設定
3. 方法1と同じ手順でPrismaスキーマを変更

---

## デプロイ手順

### 1. GitHubにプッシュ
```bash
git add .
git commit -m "feat: Vercel deployment preparation"
git push origin main
```

### 2. Vercelでインポート
1. https://vercel.com にアクセス
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定
5. "Deploy" をクリック

### 3. データベースマイグレーション

デプロイ後、Vercelダッシュボードの "Deployments" から該当のデプロイを選択し、
"View Function Logs" でマイグレーションが成功したか確認。

---

## トラブルシューティング

### ビルドエラー: "Can't reach database server"
→ `DATABASE_URL` が正しく設定されているか確認

### Prisma Clientが見つからない
→ `package.json` の `postinstall` スクリプトが実行されているか確認

### Basic認証が動作しない
→ 環境変数 `BASIC_AUTH_USERNAME` と `BASIC_AUTH_PASSWORD` が設定されているか確認

---

## 開発環境と本番環境の切り替え

`.env.local`（開発用、Gitにコミットしない）:
```env
DATABASE_URL="file:./dev.db"
```

Vercel（本番用）:
- 環境変数として設定

---

## 推奨構成

**最もシンプルな構成:**
1. Vercel Postgres を使用
2. Prismaスキーマを `postgresql` に変更
3. 環境変数を設定してデプロイ

これで基本的なWebアプリケーションとしてデプロイできます。
Discord Bot機能は後から追加可能です。
