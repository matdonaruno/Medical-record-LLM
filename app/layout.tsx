import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Medical record LLM',
  description: '医療現場のパソコン業務を支援するローカルLLMチャットアプリケーション',
  keywords: '医療, LLM, チャットボット, AI, アシスタント',
  authors: [{ name: 'matdonaruno' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">{children}</main>
          <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Medical record LLM. All rights reserved.
          </footer>
        </div>
      </body>
    </html>
  );
}
