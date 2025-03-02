# Medical Record LLM

医療現場のパソコン業務を支援するローカルLLMチャットアプリケーションです。

## 機能

- ローカルLLM（Ollama）を使用したチャット機能
- 複数のチャットセッション管理
- ユーザー認証
- レスポンシブなUI
- 複数のLLMモデル対応

## 技術スタック

- **フロントエンド**: Next.js, React, TailwindCSS
- **バックエンド**: Express.js (Node.js)
- **データベース**: PostgreSQL
- **LLM**: Ollama (ローカルで実行)

## 前提条件

- Node.js 18以上
- Ollama（ローカルLLM）
- PostgreSQL

## セットアップ

1. リポジトリをクローン
   ```
   git clone https://github.com/matdonaruno/Medical-record-LLM.git
   cd Medical-record-LLM
   ```

2. 依存関係をインストール
   ```
   npm install
   ```

3. 環境変数を設定
   ```
   cp .env.example .env
   ```
   `.env`ファイルを編集して、必要な環境変数を設定してください。

4. データベースをセットアップ
   ```
   npm run db:push
   ```

5. 開発サーバーを起動
   ```
   npm run dev
   ```

6. ブラウザで http://localhost:3000 にアクセス

## Ollamaの設定

このアプリケーションはOllamaを使用してローカルでLLMを実行します。Ollamaのインストールと設定については、[Ollamaの公式ドキュメント](https://ollama.ai/download)を参照してください。

## ライセンス

MIT 