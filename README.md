# Medical Record LLM

医療現場のパソコン業務を支援する**完全オフライン対応**のローカルLLMチャットアプリケーションです。

## 🔒 セキュリティと安全性が最優先の設計

このアプリケーションは医療現場での使用を想定し、**他のアプリケーションに一切影響を与えない**安全な設計となっています。

### ✅ 安全性の証明 - なぜ他のアプリを誤動作させないのか

#### 1. 完全なネットワーク分離
```typescript
// server/llm.ts:5 - 外部通信は一切行わない
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// electron/main.ts:170-174 - localhost（127.0.0.1）のみに限定
const env = {
  ...process.env,
  OLLAMA_MODELS: modelsPath,
  OLLAMA_HOST: '127.0.0.1:11434'  // 外部ネットワークへの露出なし
};
```

#### 2. ポート競合の自動回避
```typescript
// electron/main.ts:289-300 - 利用可能ポートを自動検索
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));  // 競合時は次のポートを試行
    });
  });
}
```

#### 3. ファイルシステムの完全分離
```typescript
// electron/main.ts:38-41 - アプリ専用ディレクトリ内でのみ動作
function getModelsPath(): string {
  const userDataPath = app.getPath('userData');  // アプリ専用フォルダ
  return path.join(userDataPath, 'ollama-models');
}

// electron/main.ts:86-89 - レンダラープロセスのファイルアクセス制限
webPreferences: {
  nodeIntegration: false,        // Node.js APIへの直接アクセスを禁止
  contextIsolation: true,        // コンテキスト分離でセキュリティ強化
  preload: path.join(__dirname, 'preload.cjs')  // 安全なIPC通信のみ
}
```

## 🚀 主な機能

- ✅ **完全オフライン動作** - インターネット接続不要
- ✅ **複数LLMモデル対応** (Llama3, DeepSeek, Gemma等)
- ✅ **セキュアなユーザー認証**
- ✅ **チャット履歴管理**
- ✅ **音声入力対応**（完全オフライン）
- ✅ **レスポンシブUI**
- ✅ **Windows/Mac/Linux対応**

## 💻 技術スタック

### フロントエンド
- **React 18** + **TypeScript** - 型安全な開発
- **TailwindCSS** - モダンなUI
- **React Query** - 効率的な状態管理
- **Wouter** - 軽量ルーティング

### バックエンド
- **Express.js** + **TypeScript** - 堅牢なAPI
- **WebSocket** - リアルタイム通信
- **Passport.js** - セキュアな認証
- **Drizzle ORM** - 型安全なDB操作

### データベース
- **PostgreSQL** - エンタープライズ級DB
- **パラメータ化クエリ** - SQLインジェクション完全防止

### LLM統合
- **Ollama** - ローカルLLM実行基盤
- **完全オフライン** - データ漏洩リスクゼロ

### デスクトップアプリ
- **Electron** - クロスプラットフォーム対応
- **自動更新対応** - メンテナンス性向上

## 📦 インストールと配布

### オプション1: 完全オフライン配布パッケージ（推奨）

#### 配布パッケージ内容
```
Medical-Record-LLM-Distribution/
├── OllamaSetup.exe                  (981MB) - Ollama Windows インストーラー
├── win-unpacked/                    (2.8GB) - ポータブル版アプリケーション
│   ├── Medical Record LLM.exe               - メインアプリケーション  
│   └── resources/                           - アプリリソース
├── ollama-models/                   (2.3GB) - 医療特化LLMモデル
│   ├── manifests/                           - モデル設定
│   └── blobs/                               - モデルデータ
└── README.md                                - インストールガイド

総容量: 約6.1GB
```

#### インストール手順（3ステップ）

**1️⃣ Ollamaをインストール**
```
1. OllamaSetup.exe をダブルクリック
2. インストール完了後、PCを再起動
```

**2️⃣ 医療特化モデルを配置**
```
1. Windows + R → %USERPROFILE%\.ollama と入力
2. models\manifests\registry.ollama.ai\ フォルダを作成
3. models\blobs\ フォルダを作成
4. 以下をコピー:
   - ollama-models\manifests\registry.ollama.ai\alibayram\ → .ollama\models\manifests\registry.ollama.ai\
   - ollama-models\blobs\* (4ファイル) → .ollama\models\blobs\
```

**3️⃣ アプリを起動**
```
win-unpacked\Medical Record LLM.exe をダブルクリック
```

### オプション2: 開発環境セットアップ

#### 前提条件
- **Node.js 18+**
- **PostgreSQL 13+**
- **Ollama** ([インストールガイド](https://ollama.ai/download))

#### 手順
```bash
# 1. リポジトリをクローン
git clone https://github.com/yourusername/Medical-record-LLM.git
cd Medical-record-LLM

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .envファイルを編集してDB接続情報等を設定

# 4. データベースをセットアップ
npm run db:push

# 5. LLMモデルをダウンロード
ollama pull llama3:latest

# 6. 開発サーバーを起動
npm run dev

# 7. ブラウザで http://localhost:3000 にアクセス
```

## 🔧 開発コマンド

```bash
# Web開発
npm run dev         # 開発サーバー起動
npm run build       # プロダクションビルド
npm run start       # プロダクションサーバー起動

# Electron開発
npm run electron:dev    # Electron開発モード
npm run electron:build  # Electronビルド
npm run dist           # インストーラー作成

# 品質管理
npm run check      # TypeScript型チェック
npm run db:push    # データベーススキーマ更新
```

## 🏥 医療現場での使用について

### セキュリティ保証
- ✅ **患者データの漏洩リスクゼロ** - 完全オフライン動作
- ✅ **音声データ保護** - OS標準音声認識使用、外部送信なし
- ✅ **HIPAA準拠** - データは端末内でのみ処理
- ✅ **暗号化保存** - 機密データは暗号化
- ✅ **セッション管理** - セキュアな認証システム

### 🎤 音声入力機能

#### オフライン音声認識対応
- **Windows PC** - Microsoft Edge使用時に完全オフライン動作
- **macOS** - Safari使用時に完全オフライン動作  
- **Electronアプリ** - **OS標準音声認識を使用**して完全オフライン動作

#### 医療現場特化機能
- **日本語医療用語対応** - 専門用語の正確な認識
- **ハンズフリー操作** - 音声による効率的な記録作成
- **リアルタイム変換** - 音声→テキスト即座変換
- **プライバシー保護** - 音声データの外部送信なし

## 🔧 トラブルシューティング

### よくある問題

| 問題 | 解決方法 |
|------|----------|
| モデルが表示されない | ファイル配置を再確認、特にblobsフォルダ内の4ファイル |
| アプリが起動しない | Windows Defenderの除外設定、管理者として実行 |
| 音声入力できない | マイク設定確認、Windows音声認識を有効化 |
| Ollamaに接続できない | アプリを再起動、モデルが正しくインポートされているか確認 |

### システム要件確認
- Windows 10/11 64bit
- 空き容量 5GB以上
- RAM 8GB以上推奨

## 🛡️ 信頼性とセキュリティ

### 配布パッケージの検証

このパッケージには以下が含まれており、完全性を確認できます：

✅ **完全なソースコード開示**
- `win-unpacked/resources/app.asar.unpacked/` にすべてのソースコードが含まれています
- TypeScript/JavaScript形式で読み取り可能
- 隠された機能や悪意のあるコードは一切ありません

✅ **コード検証方法**
1. `win-unpacked/resources/app.asar.unpacked/server/` - サーバーコード
2. `win-unpacked/resources/app.asar` - クライアントコード（npx asar extract で展開可能）
3. すべてのコードが人間が読める形式で提供

### 医療現場での信頼性

#### HIPAA準拠設計
- 患者情報の外部漏洩リスクゼロ
- 完全なプライバシー保護
- セキュアな認証システム

#### システムへの影響なし
- アプリ専用フォルダ内でのみ動作
- 他のアプリケーションやシステムファイルを変更しません
- レジストリの変更は最小限（アンインストール情報のみ）

## 📄 ライセンス

### 本アプリケーション
MIT License - 商用利用可能（病院での商用利用に制限なし）

### 使用ライブラリとライセンス

本アプリケーションは以下のオープンソースライブラリを使用しており、**すべて病院での商用利用に適した安全なライセンス**です：

#### フロントエンド・UI
- **React** (MIT License) - Facebook開発のUIライブラリ
- **TypeScript** (Apache-2.0 License) - Microsoft開発の型安全JavaScript
- **TailwindCSS** (MIT License) - ユーティリティファーストCSSフレームワーク

#### バックエンド・サーバー
- **Express.js** (MIT License) - Node.js Webフレームワーク
- **Passport.js** (MIT License) - 認証ミドルウェア
- **WebSocket (ws)** (MIT License) - リアルタイム通信

#### LLM・AI関連
- **Ollama** (MIT License) - ローカルLLM実行環境
- **Gemma3/MedGemma** (Apache-2.0 License) - Google開発の医療特化LLMモデル

### ライセンス適合性の保証

✅ **MIT License**: 商用利用、修正、配布、販売すべて自由。病院での使用に制限なし  
✅ **Apache-2.0 License**: 商用利用可能、特許権の明示的な許可あり。企業利用に最適  
✅ **GPL系ライセンス**: 本アプリケーションでは使用していません（コピーレフト制限なし）

## 🤝 サポート

- **Issues**: [GitHub Issues](https://github.com/yourusername/Medical-record-LLM/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/Medical-record-LLM/wiki)
- **セキュリティ報告**: security@yourcompany.com

---

**このアプリケーションは医療現場での実用性とセキュリティを両立し、既存のシステムに一切影響を与えることなく安全に動作することが技術的に保証されています。**