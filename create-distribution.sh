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

# 1. 最初にクリーンビルド（リソースなし）
echo "🔨 基本インストーラーをビルド中..."
cd "$SCRIPT_DIR"
rm -rf "dist-electron" # 古いビルドを削除

# 3. Ollama実行ファイルを配布パッケージに含める
echo "📦 Ollama実行ファイルを準備中..."

# Ollamaの実行ファイルをresourcesディレクトリにコピー
mkdir -p "resources/ollama"

# システムからOllamaバイナリを探す
OLLAMA_PATH=""

# まずPATHから探す
if command -v ollama >/dev/null 2>&1; then
    OLLAMA_PATH=$(which ollama)
    echo "✅ PATH内でOllamaを発見: $OLLAMA_PATH"
elif command -v ollama.exe >/dev/null 2>&1; then
    OLLAMA_PATH=$(which ollama.exe)
    echo "✅ PATH内でOllama.exeを発見: $OLLAMA_PATH"
else
    # Windowsの一般的なインストールパス
    POSSIBLE_PATHS=(
        "/c/Program Files/Ollama/ollama.exe"
        "/c/Program Files (x86)/Ollama/ollama.exe"
        "/c/Users/$USER/AppData/Local/Programs/Ollama/ollama.exe"
        "/c/Users/$USER/AppData/Local/Ollama/ollama.exe"
        "$HOME/.ollama/bin/ollama"
        "/usr/local/bin/ollama"
        "/opt/homebrew/bin/ollama"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            OLLAMA_PATH="$path"
            echo "✅ Ollama実行ファイルを発見: $OLLAMA_PATH"
            break
        fi
    done
fi

if [ -n "$OLLAMA_PATH" ] && [ -f "$OLLAMA_PATH" ]; then
    # Windowsの場合は.exeとして保存
    if [[ "$OLLAMA_PATH" == *.exe ]]; then
        cp "$OLLAMA_PATH" "resources/ollama/ollama.exe"
    else
        cp "$OLLAMA_PATH" "resources/ollama/ollama"
        # 実行権限を付与
        chmod +x "resources/ollama/ollama"
    fi
else
    echo "❌ エラー: Ollama実行ファイルが見つかりません"
    echo "   以下の手順でOllamaをインストールしてください:"
    echo "   1. https://ollama.com/download からOllamaをダウンロード"
    echo "   2. インストール後、このスクリプトを再実行"
    exit 1
fi

# 4. 医療特化モデルをエクスポート
echo "🧠 医療特化モデル(alibayram/medgemma)をエクスポート中..."
mkdir -p "resources/ollama-models"

# モデルファイルをresourcesにコピー
OLLAMA_MODELS_DIR=~/.ollama/models

if [ -d "$OLLAMA_MODELS_DIR" ]; then
    # モデルマニフェストをコピー
    if [ -d "$OLLAMA_MODELS_DIR/manifests/registry.ollama.ai/alibayram" ]; then
        mkdir -p "resources/ollama-models/manifests/registry.ollama.ai"
        cp -r "$OLLAMA_MODELS_DIR/manifests/registry.ollama.ai/alibayram" "resources/ollama-models/manifests/registry.ollama.ai/"
        echo "  ✅ モデルマニフェストをコピー完了"
    fi
    
    # モデルblobファイルをコピー（最新のマニフェストから取得）
    MANIFEST_FILE="$OLLAMA_MODELS_DIR/manifests/registry.ollama.ai/alibayram/medgemma/latest"
    if [ -f "$MANIFEST_FILE" ]; then
        mkdir -p "resources/ollama-models/blobs"
        # JSONから必要なblobのhashを抽出してコピー
        grep -o 'sha256:[a-f0-9]*' "$MANIFEST_FILE" | cut -d: -f2 | while read hash; do
            if [ -f "$OLLAMA_MODELS_DIR/blobs/sha256-$hash" ]; then
                cp "$OLLAMA_MODELS_DIR/blobs/sha256-$hash" "resources/ollama-models/blobs/"
                echo "  ✅ コピー完了: sha256-$hash"
            fi
        done
    else
        echo "❌ エラー: alibayram/medgemmaモデルが見つかりません"
        echo "   先に 'ollama pull alibayram/medgemma' を実行してください"
        exit 1
    fi
else
    echo "❌ エラー: Ollamaモデルディレクトリが見つかりません"
    echo "   先にOllamaをセットアップしてください"
    exit 1
fi

# 5. Electronインストーラーを再ビルド（Ollamaを含める）
echo "🔨 Ollama同梱版インストーラーを再ビルド中..."
npm run dist:win

# 6. 最終インストーラーをコピー
echo "📦 最終インストーラーをコピー中..."
cp "dist-electron/Medical Record LLM-1.0.0-Setup.exe" "$DIST_DIR/"

# 7. 配布用ドキュメントをコピー
echo "📚 配布用ドキュメントをコピー中..."
cp "distribution-files/INSTALLATION-GUIDE.md" "$DIST_DIR/README.md"
cp "distribution-files/FILES-OVERVIEW.md" "$DIST_DIR/"
cp "README.md" "$DIST_DIR/PROJECT-README.md"
cp "LICENSE.txt" "$DIST_DIR/"

# 8. リソースディレクトリをクリーンアップ
echo "🗑️ 一時ファイルを削除中..."
rm -rf "resources"
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