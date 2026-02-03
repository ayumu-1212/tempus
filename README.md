# Tempus

個人用の勤怠管理システム。WebアプリケーションとDiscord Bot（未実装）の両方から出退勤を打刻でき、データを一元管理します。

## 特徴

- **シンプルな打刻**: 出勤・退勤の自動判定（順序ベースの計算）
- **カスタム日境界**: 4:00 AM ～ 翌日 3:59 AM を1日として集計
- **月次統計**: 総勤務時間、勤務日数、退勤未打刻アラート
- **編集機能**: 過去の打刻を編集・削除可能（編集済みは視覚的に区別）
- **Basic認証**: シンプルな認証でアクセス制御

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Docker / Vercel Postgres)
- **ORM**: Prisma
- **Linter/Formatter**: Biome

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成：

```env
DATABASE_URL=postgresql://tempus:tempus_dev_password@localhost:5432/tempus
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=changeme
```

### 3. PostgreSQLの起動とマイグレーション

```bash
# PostgreSQLコンテナを起動
npm run db:start

# マイグレーションを実行
npm run db:migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてください。

## データベース管理コマンド

```bash
npm run db:start   # PostgreSQL起動
npm run db:stop    # PostgreSQL停止
npm run db:migrate # マイグレーション実行
npm run db:reset   # データベースリセット
npm run db:studio  # Prisma Studio起動
```

## デプロイ

Vercelへのデプロイ手順は `docs/deployment.md` を参照してください。

## ドキュメント

- `docs/requirements.md` - 要件定義
- `docs/technical-specification.md` - 技術仕様書
- `docs/deployment.md` - デプロイガイド
- `CLAUDE.md` - Claude Code向けガイド
