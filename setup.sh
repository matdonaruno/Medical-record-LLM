#!/bin/bash

# 必要なパッケージをインストール
npm install react react-dom next express cors ws ollama
npm install -D typescript @types/react @types/react-dom @types/node @types/express @types/cors @types/ws tsx

# Next.jsの設定ファイルを作成
if [ ! -f "next.config.js" ]; then
  echo "module.exports = {
  reactStrictMode: true,
  swcMinify: true,
};" > next.config.js
fi

# TypeScriptの設定ファイルを作成
if [ ! -f "tsconfig.json" ]; then
  echo '{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}' > tsconfig.json
fi

# Ollamaが起動しているか確認
echo "Ollamaが起動しているか確認しています..."
if ! ollama list &> /dev/null; then
  echo "Ollamaが起動していません。以下のコマンドで起動してください："
  echo "ollama serve"
  exit 1
fi

echo "セットアップが完了しました。以下のコマンドでアプリケーションを起動できます："
echo "npm run dev"