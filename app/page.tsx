import React from 'react';
import dynamic from 'next/dynamic';

// クライアントコンポーネントを動的にインポート
const Chat = dynamic(() => import('./components/Chat'), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="py-6 px-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 text-center">
            Medical record LLM
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
            医療現場のパソコン業務をサポートするAIアシスタント
          </p>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto max-w-6xl px-4 py-8">
        <div className="animate-fade-in">
          <Chat />
        </div>
      </main>
    </div>
  );
} 