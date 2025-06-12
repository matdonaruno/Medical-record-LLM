# 📦 Medical Record LLM - 配布パッケージ管理

## 🎯 このディレクトリについて

このディレクトリ（`distribution-files/`）には、病院への配布に必要なドキュメントが格納されています。

## 📁 ファイル構成

### **📋 配布用ドキュメント**

| ファイル | 用途 | 配布時のファイル名 |
|----------|------|-------------------|
| **INSTALLATION-GUIDE.md** | Windows PCでのインストール手順 | `README.md` |
| **FILES-OVERVIEW.md** | 配布パッケージのファイル説明 | `FILES-OVERVIEW.md` |
| **DISTRIBUTION-README.md** | この説明書（配布不要） | - |

### **🔄 配布時のファイル構成**
```
配布パッケージ/
├── Medical Record LLM-1.0.0-Setup.exe  ← アプリインストーラー
├── OllamaSetup.exe                     ← LLM実行環境
├── ollama-models/                      ← 医療特化AIモデル
├── README.md                           ← INSTALLATION-GUIDE.md
├── FILES-OVERVIEW.md                   ← FILES-OVERVIEW.md
├── PROJECT-README.md                   ← プロジェクトのREADME.md
└── LICENSE.txt                         ← ライセンス条文
```

## 🚀 配布パッケージの作成方法

### **🔧 自動作成スクリプト**
```bash
# 配布パッケージを一括作成
./create-distribution.sh /path/to/distribution/folder

# 例: USBメモリへの作成
./create-distribution.sh /Volumes/USB/Medical-Record-LLM-Distribution
```

### **📋 手動作成手順**
1. **インストーラービルド**: `npm run dist:win`
2. **Ollamaダウンロード**: Windows版の取得
3. **モデルエクスポート**: `alibayram/medgemma`のコピー
4. **ドキュメント整理**: この配布用ファイルをコピー
5. **クリーンアップ**: ローカルビルドファイル削除

## 📝 ドキュメント更新時の注意

### **INSTALLATION-GUIDE.md 更新時**
- 病院スタッフ向けの分かりやすい手順を維持
- 技術的すぎる説明は避ける
- スクリーンショットがあると良い

### **FILES-OVERVIEW.md 更新時**
- 配布パッケージ内容の変更を反映
- ファイルサイズの更新
- 新しいファイルの説明追加

## 🔄 バージョン管理

### **配布パッケージのバージョンアップ**
1. `package.json`のバージョン更新
2. 配布用ドキュメントの内容確認
3. 新機能の説明追加
4. 配布パッケージ再作成

### **後方互換性**
- 既存の配布パッケージとの互換性を考慮
- インストール手順の大幅変更は避ける
- モデル変更時は移行手順を提供

## 📞 配布サポート

配布に関する技術的な問題やドキュメントの改善提案があれば、開発者に連絡してください。

---

**Medical Record LLM Distribution Management**  
効率的で安全な医療AI配布システム