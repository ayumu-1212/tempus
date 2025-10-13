# Tempus - 技術仕様書

## システムアーキテクチャ

### 全体構成
```
┌─────────────────┐
│   Web UI        │ ← ユーザー（ブラウザ）
│   (Next.js)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌─────────────────┐
│   Next.js API   │ ←→  │  Discord Bot    │
│   Routes        │     │  (discord.js)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ↓                       ↓
┌────────────────────────────────┐
│      Database (SQLite)         │
└────────────────────────────────┘
```

### 技術スタック
- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **バックエンド**: Next.js API Routes
- **Discord Bot**: discord.js
- **データベース**: SQLite（個人利用のため軽量でOK）
- **ORM**: Prisma（型安全なDB操作）
- **認証**: 環境変数によるBasic認証
- **リンター/フォーマッター**: Biome

---

## データベース設計

### テーブル定義

#### records テーブル
打刻レコードを保存

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| id | INTEGER | NOT NULL | 主キー（自動採番） |
| timestamp | DATETIME | NOT NULL | 打刻日時 |
| source | TEXT | NOT NULL | 打刻元: 'web' or 'discord' |
| is_edited | BOOLEAN | NOT NULL | 編集済みフラグ（デフォルト: false） |
| comment | TEXT | NULL | 編集時のコメント |
| created_at | DATETIME | NOT NULL | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | レコード更新日時 |

**打刻種類の判定ルール**
- その日（6:00-6:00）のうちで、打刻順序により判定
  - 奇数番目（1, 3, 5...）= 出勤
  - 偶数番目（2, 4, 6...）= 退勤
- 後から打刻を追加・削除しても、順序で自動的に判定されるため `type` フィールドは不要

#### インデックス
- `timestamp` に昇順インデックス（月次集計・順序判定の高速化）

---

## API設計

### エンドポイント一覧

#### 1. POST /api/clock
打刻を記録する

**リクエスト**
```json
{
  "source": "web" | "discord",
  "timestamp": "2025-01-15T10:30:00+09:00" // 省略時は現在時刻
}
```

**レスポンス**
```json
{
  "success": true,
  "record": {
    "id": 1,
    "timestamp": "2025-01-15T10:30:00+09:00",
    "source": "web",
    "is_edited": false,
    "comment": null
  },
  "type": "clock_in" // フロントエンド表示用（計算結果）
}
```

**処理フロー**
1. 打刻レコードをDBに保存
2. その日（6:00-6:00）の打刻を全て取得し、順序を計算して出勤/退勤を判定
3. Discord通知を送信（環境変数で設定された場合）

---

#### 2. GET /api/records?year=2025&month=1
指定月の打刻履歴を取得

**パラメータ**
- `year`: 年（数値）
- `month`: 月（1-12）

**レスポンス**
```json
{
  "records": [
    {
      "id": 1,
      "timestamp": "2025-01-15T10:30:00+09:00",
      "type": "clock_in", // 計算結果（奇数番目=出勤、偶数番目=退勤）
      "source": "web",
      "is_edited": false,
      "comment": null
    },
    ...
  ],
  "stats": {
    "totalWorkingHours": "160:30", // HH:MM形式
    "workingDays": 20,
    "missingClockOuts": ["2025-01-15", "2025-01-20"] // 退勤未打刻の日
  }
}
```

**処理フロー**
1. 指定月の6:00-6:00範囲でレコードを取得（例: 1/1 06:00 ～ 2/1 05:59）
2. 各日ごとに打刻を時系列順にソートし、順序番号で出勤/退勤を判定
3. 出勤/退勤のペアを作成し、ペアごとに勤務時間を計算
4. 退勤未打刻の日（奇数個の打刻がある日）をリストアップ

---

#### 3. PUT /api/records/:id
打刻レコードを編集

**リクエスト**
```json
{
  "timestamp": "2025-01-15T10:35:00+09:00",
  "comment": "打刻忘れのため手動追加"
}
```

**レスポンス**
```json
{
  "success": true,
  "record": {
    "id": 1,
    "timestamp": "2025-01-15T10:35:00+09:00",
    "type": "clock_in", // 計算結果（編集後の順序で再計算）
    "source": "web",
    "is_edited": true,
    "comment": "打刻忘れのため手動追加"
  }
}
```

**処理フロー**
1. 指定IDのレコードを取得
2. timestampとcommentを更新
3. `is_edited` を `true` に設定
4. `updated_at` を更新
5. 編集後の順序を再計算して `type` を返す

---

#### 4. DELETE /api/records/:id
打刻レコードを削除

**レスポンス**
```json
{
  "success": true
}
```

**処理フロー**
1. 指定IDのレコードを物理削除

---

#### 5. GET /api/status
現在の勤怠状態を取得

**レスポンス**
```json
{
  "status": "clocked_in" | "clocked_out",
  "lastRecord": {
    "id": 1,
    "timestamp": "2025-01-15T10:30:00+09:00",
    "type": "clock_in"
  }
}
```

**処理フロー**
1. 当日（6:00-6:00）の打刻レコードを全て取得
2. 時系列順にソートし、件数をカウント
3. 奇数個（最後が出勤）→ `clocked_in` を返す
4. 偶数個または0個（最後が退勤 or 未出勤）→ `clocked_out` を返す

---

## Discord Bot仕様

### スラッシュコマンド
- **コマンド名**: `/tempus`
- **説明**: 出勤・退勤を記録します
- **オプション**: なし

### 実装
1. discord.js を使用してBotを作成
2. スラッシュコマンドを登録
3. コマンド実行時:
   - ユーザーのDiscord IDを取得
   - 環境変数の `DISCORD_USER_ID` と照合
   - 一致しない場合はエラーメッセージ
   - 一致する場合は `/api/clock` を呼び出し
   - 結果を返信

### 通知
- 環境変数 `DISCORD_NOTIFICATION_CHANNEL_ID` で通知先を設定
- 打刻成功時にEmbedメッセージを送信

```
✅ 出勤しました
時刻: 2025-01-15 10:30
```

---

## フロントエンド設計

### ページ構成
```
/
  └─ page.tsx (メインページ)
```

### コンポーネント構成
```
src/
  ├─ app/
  │   ├─ layout.tsx
  │   ├─ page.tsx (メインページ)
  │   ├─ globals.css
  │   └─ api/
  │       ├─ clock/route.ts
  │       ├─ records/route.ts
  │       ├─ records/[id]/route.ts
  │       └─ status/route.ts
  ├─ components/
  │   ├─ ClockButton.tsx (打刻ボタン)
  │   ├─ StatusDisplay.tsx (現在の状態表示)
  │   ├─ MonthlyStats.tsx (月次集計)
  │   ├─ RecordsList.tsx (履歴一覧)
  │   ├─ RecordItem.tsx (履歴アイテム)
  │   ├─ EditModal.tsx (編集モーダル)
  │   └─ AlertBanner.tsx (退勤未打刻アラート)
  ├─ lib/
  │   ├─ prisma.ts (Prismaクライアント)
  │   ├─ discord.ts (Discord Bot)
  │   └─ utils.ts (ユーティリティ関数)
  └─ types/
      └─ index.ts (型定義)
```

### 状態管理
- React の useState/useEffect でローカル状態管理
- サーバー状態は API から取得（SWR や React Query は不要、シンプルに fetch でOK）

---

## 環境変数

### 必須環境変数
```env
# Basic認証
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password

# Discord Bot
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_USER_ID=your-discord-user-id
DISCORD_NOTIFICATION_CHANNEL_ID=channel-id

# データベース
DATABASE_URL=file:./dev.db
```

---

## セキュリティ考慮事項

### Web
- Basic認証でページ全体を保護
- 環境変数からクレデンシャルを読み込み
- HTTPS必須（本番環境）

### Discord Bot
- Discord IDでユーザーを識別
- 環境変数に登録されたIDのみコマンド実行可能
- Botトークンは環境変数で管理

---

## 開発フロー

### セットアップ
```bash
npm install
npx prisma generate
npx prisma db push
```

### 開発サーバー起動
```bash
npm run dev
```

### Discord Bot起動
```bash
npm run bot  # 別プロセスで起動
```

### ビルド
```bash
npm run build
```

---

## デプロイ

### 推奨環境
- **Web**: Vercel or Railway
- **Discord Bot**: 常時起動が必要なため、VPS or Railway
- **データベース**: SQLiteファイルをボリュームマウント

### 注意点
- Discord Botは常時起動が必要
- SQLiteファイルの永続化が必要
- 環境変数の設定を忘れずに

---

## 今後の拡張可能性

- データエクスポート機能（CSV出力）
- グラフ表示（勤務時間の推移）
- 複数ユーザー対応（認証強化）
- タイムゾーン対応
