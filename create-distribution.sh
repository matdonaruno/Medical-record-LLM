#!/bin/bash

# Medical Record LLM - 配布パッケージ作成スクリプト
# このスクリプトは完全な配布パッケージを作成します

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$1"

if [ -z "$DIST_DIR" ]; then
    echo "使用方法: $0 <配布先ディレクトリ>"
    echo "例: $0 /Volumes/USB/Medical-Record-LLM-Distribution"
    exit 1
fi

echo "🚀 Medical Record LLM 配布パッケージ作成開始..."

# 配布ディレクトリを作成
mkdir -p "$DIST_DIR"
echo "📁 配布ディレクトリ作成: $DIST_DIR"

# 1. Windows用インストーラーをビルド
echo "🔨 Windows用インストーラーをビルド中..."
cd "$SCRIPT_DIR"
npm run dist:win

# 2. インストーラーをコピー
echo "📦 インストーラーをコピー中..."
cp "dist-electron/Medical Record LLM-1.0.0-Setup.exe" "$DIST_DIR/"

# 3. Ollama Windows版をダウンロード
echo "⬇️ Ollama Windows版をダウンロード中..."
curl -L "https://ollama.com/download/windows" -o "$DIST_DIR/OllamaSetup.exe"

# 4. 医療特化モデルをエクスポート
echo "🧠 医療特化モデル(alibayram/medgemma)をエクスポート中..."
mkdir -p "$DIST_DIR/ollama-models"

# モデルマニフェストをコピー
cp -r ~/.ollama/models/manifests/registry.ollama.ai/alibayram "$DIST_DIR/ollama-models/"

# モデルblobファイルをコピー（最新のマニフェストから取得）
MANIFEST_FILE=~/.ollama/models/manifests/registry.ollama.ai/alibayram/medgemma/latest
if [ -f "$MANIFEST_FILE" ]; then
    # JSONから必要なblobのhashを抽出してコピー
    grep -o 'sha256:[a-f0-9]*' "$MANIFEST_FILE" | cut -d: -f2 | while read hash; do
        if [ -f ~/.ollama/models/blobs/sha256-$hash ]; then
            cp ~/.ollama/models/blobs/sha256-$hash "$DIST_DIR/ollama-models/"
            echo "  ✅ コピー完了: sha256-$hash"
        fi
    done
else
    echo "❌ エラー: alibayram/medgemmaモデルが見つかりません"
    echo "   先に 'ollama pull alibayram/medgemma' を実行してください"
    exit 1
fi

# 5. 配布用ドキュメントをコピー
echo "📚 配布用ドキュメントをコピー中..."
cp "distribution-files/INSTALLATION-GUIDE.md" "$DIST_DIR/README.md"
cp "distribution-files/FILES-OVERVIEW.md" "$DIST_DIR/"
cp "README.md" "$DIST_DIR/PROJECT-README.md"
cp "LICENSE.txt" "$DIST_DIR/"

# 6. ローカルのビルドファイルを削除
echo "🗑️ ローカルのビルドファイルを削除中..."
rm -rf "dist-electron"

# 7. 配布パッケージのサイズを確認
echo "📊 配布パッケージ作成完了!"
echo "📁 配布先: $DIST_DIR"
echo "💾 パッケージサイズ:"
du -sh "$DIST_DIR"

echo ""
echo "🎉 配布パッケージの作成が完了しました!"
echo "📋 配布パッケージ内容:"
ls -lh "$DIST_DIR"

echo ""
echo "📖 次のステップ:"
echo "1. USBメモリまたはネットワーク共有で配布"
echo "2. 受け取った側はREADME.mdの手順に従ってインストール"
echo "3. 技術的な詳細はPROJECT-README.mdを参照"