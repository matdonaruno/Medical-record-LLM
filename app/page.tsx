import React from 'react';
import dynamic from 'next/dynamic';

// クライアントコンポーネントを動的にインポート
const Chat = dynamic(() => import('./components/Chat'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">Medical record LLM</h1>
        <Chat />
      </div>
    </main>
  );
} 