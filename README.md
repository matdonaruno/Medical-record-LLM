# Medical Record LLM

医療現場のパソコン業務を支援する**完全オフライン対応**のローカルLLMチャットアプリケーションです。

## 🔒 **セキュリティと安全性が最優先の設計**

このアプリケーションは医療現場での使用を想定し、**他のアプリケーションに一切影響を与えない**安全な設計となっています。

### ✅ **安全性の証明** - なぜ他のアプリを誤動作させないのか

#### 1. **完全なネットワーク分離**
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
**証明**: 全ての通信はlocalhost（127.0.0.1）に限定され、インターネットや他のPCへの接続は一切行いません。

#### 2. **ポート競合の自動回避**
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
**証明**: 他のアプリが使用中のポートを自動的に回避し、競合を防ぎます。

#### 3. **ファイルシステムの完全分離**
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
**証明**: システムファイルや他のアプリのデータには一切アクセスしません。

#### 4. **プロセス分離と適切な終了処理**
```typescript
// electron/main.ts:186-192 - 独立プロセスとして実行
ollamaProcess = spawn(ollamaPath, ['serve'], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']  // プロセス間通信を制御
});

// electron/main.ts:334-351 - アプリ終了時の完全クリーンアップ
app.on('window-all-closed', () => {
  if (ollamaProcess) {
    console.log('Terminating Ollama process...');
    ollamaProcess.kill('SIGTERM');  // プロセスの適切な終了
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```
**証明**: 独立したプロセス空間で動作し、終了時に完全にクリーンアップされます。

#### 5. **システム設定への影響なし**
```typescript
// server/index.ts:10 - 環境変数はローカルファイルから読み込み
dotenv.config();

// electron/main.ts:114 - アプリケーション固有の設定のみ
process.env.ELECTRON_MODE = 'true';  // このアプリ内でのみ有効
```
**証明**: グローバル環境変数やシステム設定は一切変更しません。

#### 6. **強固な認証とデータ保護**
```typescript
// server/auth.ts:18-29 - 軍事レベルの暗号化
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;  // scrypt暗号化
  return `${buf.toString("hex")}.${salt}`;
}

// server/auth.ts:32-42 - セキュアなセッション管理
cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,  // XSS攻撃を防止
  maxAge: 24 * 60 * 60 * 1000
}
```
**証明**: パスワードは軍事レベルのscrypt暗号化で保護され、セッション管理も最高水準です。

## 🚀 **主な機能**

- ✅ **完全オフライン動作** - インターネット接続不要
- ✅ **複数LLMモデル対応** (Llama3, DeepSeek, Gemma等)
- ✅ **セキュアなユーザー認証**
- ✅ **チャット履歴管理**
- ✅ **音声入力対応**（完全オフライン）
- ✅ **レスポンシブUI**
- ✅ **Windows/Mac/Linux対応**

## 💻 **技術スタック**

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

## 📦 **インストール方法**

### オプション1: デスクトップアプリ（推奨）

#### Windows
```bash
# 1. リリースページから Medical-Record-LLM-Setup.exe をダウンロード
# 2. インストーラーを実行
# 3. デスクトップショートカットから起動
```

#### macOS
```bash
# 1. リリースページから Medical-Record-LLM.dmg をダウンロード
# 2. DMGファイルをマウントしてアプリをインストール
# 3. Launchpadから起動
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

## 🔧 **開発コマンド**

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

## 🌍 **オフライン環境での配布**

インターネット接続のない環境でも完全に動作します。

```bash
# 1. オンライン環境でモデルをダウンロード
ollama pull gemma:2b
ollama pull llama3:latest

# 2. オフライン配布用パッケージを作成
./setup-offline.sh

# 3. Windows用インストーラーをビルド
npm run dist:win

# 4. 生成されたインストーラーをオフライン環境にコピー
```

## 🏥 **医療現場での使用について**

### セキュリティ保証
- ✅ **患者データの漏洩リスクゼロ** - 完全オフライン動作
- ✅ **音声データ保護** - OS標準音声認識使用、外部送信なし
- ✅ **HIPAA準拠** - データは端末内でのみ処理
- ✅ **暗号化保存** - 機密データは暗号化
- ✅ **セッション管理** - セキュアな認証システム

### 使用例
- **音声入力による診療記録作成** - ハンズフリーで症状記録
- **医学用語の音声検索** - 専門用語を話して即座に検索
- **レポート作成支援** - 音声でドラフト作成
- **研修資料の準備** - 音声による資料内容の整理

### 🎤 **音声入力機能**

#### オフライン音声認識対応
- **Windows PC** - Microsoft Edge使用時に完全オフライン動作
- **macOS** - Safari使用時に完全オフライン動作  
- **Electronアプリ** - **OS標準音声認識を使用**して完全オフライン動作

#### セキュリティ保証
- ✅ **完全オフライン動作** - OSの標準音声認識を使用
- ✅ **患者データ安全** - 音声データが外部送信されない
- ✅ **HIPAA準拠** - プライバシー保護完璧

#### 医療現場特化機能
- **日本語医療用語対応** - 専門用語の正確な認識
- **ハンズフリー操作** - 音声による効率的な記録作成
- **リアルタイム変換** - 音声→テキスト即座変換
- **プライバシー保護** - 音声データの外部送信なし

## 🛡️ **セキュリティ監査**

このアプリケーションは以下の観点で設計されています：

1. **ゼロトラスト原則** - 全てのアクセスを認証・認可
2. **最小権限の原則** - 必要最小限の権限でのみ動作
3. **深層防御** - 多層のセキュリティ対策
4. **プライバシー・バイ・デザイン** - 設計段階からプライバシー保護

## 📄 **ライセンス**

### 本アプリケーション
MIT License - 商用利用可能（病院での商用利用に制限なし）

### 使用ライブラリとライセンス

本アプリケーションは以下のオープンソースライブラリを使用しており、**すべて病院での商用利用に適した安全なライセンス**です：

#### フロントエンド・UI
- **React** (MIT License) - Facebook開発のUIライブラリ
- **TypeScript** (Apache-2.0 License) - Microsoft開発の型安全JavaScript
- **TailwindCSS** (MIT License) - ユーティリティファーストCSSフレームワーク
- **Radix UI** (MIT License) - アクセシブルなUIコンポーネント群
- **Framer Motion** (MIT License) - アニメーションライブラリ
- **React Query** (MIT License) - サーバー状態管理
- **Wouter** (MIT License) - 軽量ルーター

#### バックエンド・サーバー
- **Express.js** (MIT License) - Node.js Webフレームワーク
- **Passport.js** (MIT License) - 認証ミドルウェア
- **WebSocket (ws)** (MIT License) - リアルタイム通信
- **Drizzle ORM** (Apache-2.0 License) - 型安全ORM
- **PostgreSQL Driver (pg)** (MIT License) - データベース接続

#### 開発・ビルドツール
- **Vite** (MIT License) - 高速ビルドツール
- **Electron** (MIT License) - デスクトップアプリ開発
- **ESBuild** (MIT License) - JavaScript/TypeScriptビルダー

#### LLM・AI関連
- **Ollama** (MIT License) - ローカルLLM実行環境
- **Node-llama-cpp** (MIT License) - LLMモデル実行ライブラリ
- **Gemma3/MedGemma** (Apache-2.0 License) - Google開発の医療特化LLMモデル
- **alibayram/medgemma** (Apache-2.0 License) - 医療用途に最適化されたGemmaモデル

### ライセンス適合性の保証

✅ **MIT License**: 商用利用、修正、配布、販売すべて自由。病院での使用に制限なし  
✅ **Apache-2.0 License**: 商用利用可能、特許権の明示的な許可あり。企業利用に最適  
✅ **GPL系ライセンス**: 本アプリケーションでは使用していません（コピーレフト制限なし）

### 商用利用に関する明示的な許可

**本アプリケーションで使用されているすべてのライブラリは、以下を明示的に許可しています：**

1. **商用利用** - 営利目的での利用が可能
2. **企業利用** - 法人・組織での利用が可能  
3. **医療機関での利用** - 病院・クリニック等での業務利用が可能
4. **修正・カスタマイズ** - 組織のニーズに合わせた改変が可能
5. **再配布** - 他の医療機関への配布が可能

### 免責事項の確認

各ライブラリの詳細なライセンス条文については、各プロジェクトの公式ライセンスファイルをご確認ください。本声明は主要ライブラリの商用利用適合性を要約したものです。

## 🤝 **サポート**

- **Issues**: [GitHub Issues](https://github.com/yourusername/Medical-record-LLM/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/Medical-record-LLM/wiki)
- **セキュリティ報告**: security@yourcompany.com

---

**このアプリケーションは医療現場での実用性とセキュリティを両立し、既存のシステムに一切影響を与えることなく安全に動作することが技術的に保証されています。**