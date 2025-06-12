#!/bin/bash

# オフライン環境向けモデルバンドルスクリプト

echo "オフライン環境向けのセットアップを開始します..."

# モデルディレクトリを作成
mkdir -p resources/models

# Ollamaモデルをコピー
if [ -d "$HOME/.ollama/models" ]; then
    echo "Ollamaモデルをコピー中..."
    cp -r "$HOME/.ollama/models/"* resources/models/
    echo "モデルのコピーが完了しました"
else
    echo "警告: Ollamaモデルディレクトリが見つかりません"
    echo "先にollama pullでモデルをダウンロードしてください"
    exit 1
fi

# electron-builder.jsonを更新
echo "ビルド設定を更新中..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));

// Windows向けの設定を更新
if (!config.win.extraResources.some(r => r.to === 'models/')) {
    config.win.extraResources.push({
        from: 'resources/models/',
        to: 'models/',
        filter: ['**/*']
    });
}

fs.writeFileSync('electron-builder.json', JSON.stringify(config, null, 2));
console.log('electron-builder.json を更新しました');
"

echo "セットアップが完了しました"
echo "次のコマンドでWindows版をビルドできます: npm run dist:win"