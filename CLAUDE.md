# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Next.js 15 (App Router)、React 19、TypeScript、Tailwind CSS v4、Biomeを使用したモダンなWebアプリケーション。

## 開発コマンド

### 基本コマンド
- `npm run dev` - 開発サーバー起動（Turbopack使用）
- `npm run build` - 本番ビルド（Turbopack使用）
- `npm start` - 本番サーバー起動

### コード品質
- `npm run lint` - Biomeによるコードチェック
- `npm run format` - Biomeによるコードフォーマット

開発サーバーはデフォルトで http://localhost:3000 で起動します。

## アーキテクチャ

### ディレクトリ構造
- `src/app/` - Next.js App Routerのルート定義
  - `layout.tsx` - ルートレイアウト（Geist/Geist Monoフォント設定）
  - `page.tsx` - ホームページ
  - `globals.css` - グローバルスタイル（Tailwind CSS v4使用）

### パス設定
- `@/*` - `src/*` へのエイリアス（tsconfig.jsonで定義）

### スタイリング
- Tailwind CSS v4の新しいシンタックスを使用
- `globals.css`で`@theme inline`を使用してカスタムテーマ変数を定義
- CSS変数（`--background`, `--foreground`）でダークモード対応
- Geist SansとGeist Monoフォントを`--font-geist-sans`, `--font-geist-mono`として使用可能

### コード品質ツール
- **Biome**: リンターとフォーマッター
  - インデント: スペース2つ
  - Next.jsとReactの推奨ルールを有効化
  - import自動整理が有効
  - Git統合有効（VCS: Git）
  - 除外: `node_modules`, `.next`, `dist`, `build`

### TypeScript設定
- strict モード有効
- ターゲット: ES2017
- Next.jsプラグイン使用
