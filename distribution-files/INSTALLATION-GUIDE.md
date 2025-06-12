# Medical Record LLM - 病院向け配布パッケージ

## 📦 パッケージ内容

```
Medical-Record-LLM-Distribution/
├── Medical Record LLM-1.0.0-Setup.exe  (124MB) - メインアプリケーション
├── OllamaSetup.exe                     (20MB)  - LLM実行環境
├── ollama-models/                      (2.5GB) - 医療特化LLMモデル
│   ├── alibayram/                               - モデルマニフェスト
│   └── sha256-* (4ファイル)                     - モデルデータ
└── README.md                                    - このファイル
```

## 🏥 Windows PCでのインストール手順

### 1️⃣ Ollamaのインストール
```
1. OllamaSetup.exe をダブルクリック
2. インストーラーの指示に従ってインストール
3. インストール完了後、PCを再起動
```

### 2️⃣ 医療特化モデルの設置
```
1. エクスプローラーでアドレスバーに以下を入力:
   %USERPROFILE%\.ollama

2. 「models」フォルダを作成（まだない場合）

3. USBの「ollama-models」内の全ファイルを以下にコピー:
   - alibayram フォルダ → %USERPROFILE%\.ollama\models\manifests\registry.ollama.ai\
   - sha256-* ファイル → %USERPROFILE%\.ollama\models\blobs\

ディレクトリ構造例:
C:\Users\[ユーザー名]\.ollama\models\
├── manifests\registry.ollama.ai\alibayram\medgemma\latest
└── blobs\
    ├── sha256-b2e54fff7735...
    ├── sha256-2d20114e538b...
    ├── sha256-e0a42594d802...
    └── sha256-5c4d6d243f18...
```

### 3️⃣ Medical Record LLMのインストール
```
1. Medical Record LLM-1.0.0-Setup.exe をダブルクリック
2. インストール先を選択（デフォルト推奨）
3. デスクトップショートカット作成を確認
4. インストール完了
```

### 4️⃣ 動作確認
```
1. デスクトップの「Medical Record LLM」アイコンをダブルクリック
2. ユーザー登録またはログイン
3. 「alibayram/medgemma」モデルが利用可能か確認
4. 音声入力ボタン（🎤）で日本語音声入力をテスト
```

## 🎯 主な機能

### ✅ 完全オフライン動作
- インターネット接続不要
- 患者データが外部に送信されない
- HIPAA準拠のプライバシー保護

### ✅ 医療特化AI
- **alibayram/medgemma**: 医療用途に最適化されたLLMモデル
- 医療用語の正確な理解
- 診療記録作成支援

### ✅ 音声入力対応
- Windows標準音声認識使用（完全オフライン）
- 日本語医療用語対応
- ハンズフリー操作

### ✅ セキュリティ
- 音声データの外部送信なし
- 暗号化されたローカルデータベース
- セッション管理

## 🔧 トラブルシューティング

### モデルが認識されない場合
```
1. Ollamaが正しくインストールされているか確認
2. コマンドプロンプトで「ollama list」を実行
3. 「alibayram/medgemma」が表示されることを確認
4. 表示されない場合、モデルファイルの配置を再確認
```

### 音声入力が動作しない場合
```
1. Windowsの音声認識設定を確認
2. マイクの接続と許可設定を確認
3. ブラウザではなくElectronアプリを使用
```

### アプリが起動しない場合
```
1. Windows Defenderの除外設定を確認
2. 管理者として実行を試行
3. インストールディレクトリの権限を確認
```

## 📞 サポート

技術的な問題や質問がある場合は、このアプリケーションの開発者にお問い合わせください。

---

**Medical Record LLM v1.0.0**  
医療現場での安全で効率的なAI活用を支援します。