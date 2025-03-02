import { NextRequest, NextResponse } from 'next/server';
import { ChatResponse } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが無効です' },
        { status: 400 }
      );
    }
    
    // バックエンドAPIにリクエストを転送
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
      // タイムアウトを設定
      signal: AbortSignal.timeout(10000), // 10秒
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('バックエンドAPIエラー:', errorText);
      
      return NextResponse.json(
        { error: 'バックエンドAPIリクエストに失敗しました' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // レスポンスにタイムスタンプを追加
    const chatResponse: ChatResponse = {
      response: data.response || data.message || '',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error('Error in chat API route:', error);
    
    // エラーの種類に応じたレスポンス
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'リクエストの解析に失敗しました' },
        { status: 400 }
      );
    } else if (error instanceof TypeError && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'リクエストがタイムアウトしました' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
} 