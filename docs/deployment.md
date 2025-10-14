# Vercelデプロイガイド

## 開発環境のセットアップ

### 1. PostgreSQLをDockerで起動

```bash
# PostgreSQLコンテナを起動
npm run db:start

# マイグレーションを実行（初回のみ）
npm run db:migrate

# 開発サーバーを起動
npm run dev
```

### 2. データベース管理コマンド

```bash
# PostgreSQLコンテナを起動
npm run db:start

# PostgreSQLコンテナを停止
npm run db:stop

# マイグレーションを実行
npm run db:migrate

# データベースをリセット（全データ削除）
npm run db:reset

# Prisma Studioを起動（GUI管理ツール）
npm run db:studio
```

---

## Vercelへのデプロイ

### 1. Vercel Postgresのセットアップ

1. Vercelダッシュボードでプロジェクトを作成
2. "Storage" タブから "Create Database" → "Postgres" を選択
3. データベースを作成

### 2. 環境変数の設定

Vercelダッシュボードの "Settings" → "Environment Variables" で以下を設定：

**必須:**
```
DATABASE_URL=<Vercel Postgresの接続URL>
BASIC_AUTH_USERNAME=your-username
BASIC_AUTH_PASSWORD=your-password
```

**オプション（Discord Bot用）:**
```
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_USER_ID=your-discord-user-id
DISCORD_NOTIFICATION_CHANNEL_ID=your-channel-id
```

### 3. GitHubにプッシュ

```bash
git add .
git commit -m "feat: Setup PostgreSQL with Docker"
git push origin main
```

### 4. Vercelでインポート

1. https://vercel.com にアクセス
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定（上記の値を入力）
5. "Deploy" をクリック

### 5. デプロイ確認

デプロイ後、Vercelダッシュボードの "Deployments" から該当のデプロイを選択し、
"View Function Logs" でマイグレーションが成功したか確認。

---

## データベース構成

### ローカル開発環境
- **DB**: PostgreSQL 16（Docker経由）
- **接続**: `postgresql://tempus:tempus_dev_password@localhost:5432/tempus`
- **データ永続化**: Docker volumeで管理

### 本番環境（Vercel）
- **DB**: Vercel Postgres
- **接続**: Vercelダッシュボードで自動設定
- **マイグレーション**: `postinstall`スクリプトで自動実行

---

## トラブルシューティング

### ビルドエラー: "Can't reach database server"
→ `DATABASE_URL` が正しく設定されているか確認

### Prisma Clientが見つからない
→ `package.json` の `postinstall` スクリプトが実行されているか確認

### Basic認証が動作しない
→ 環境変数 `BASIC_AUTH_USERNAME` と `BASIC_AUTH_PASSWORD` が設定されているか確認

### ローカルでPostgreSQLに接続できない
```bash
# Dockerコンテナの状態を確認
docker ps -a --filter name=tempus-postgres

# コンテナが停止している場合は起動
npm run db:start

# ログを確認
docker logs tempus-postgres
```

### マイグレーションエラー
```bash
# データベースをリセットして再度マイグレーション
npm run db:reset

# または手動でマイグレーション
npx prisma migrate dev
```

---

## 推奨ワークフロー

1. ローカル開発時は `npm run db:start` でPostgreSQLを起動
2. コード変更後は `npm run db:migrate` でマイグレーション
3. 動作確認後、GitHubにプッシュ
4. Vercelが自動的にビルド・デプロイ
5. 本番環境でも同じPostgreSQLスキーマが適用される
