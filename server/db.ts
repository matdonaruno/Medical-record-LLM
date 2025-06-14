import pkg from 'pg';
const { Pool } = pkg;

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

// Electronモードではデータベース接続をオプションにする
const isElectronMode = process.env.ELECTRON_MODE === 'true';

if (!process.env.DATABASE_URL && !isElectronMode) {
  console.error("DATABASE_URL environment variable is not set.");
  console.error("Please copy .env.example to .env and configure your database connection.");
  throw new Error(
    "DATABASE_URL must be set. Please check .env file configuration.",
  );
}

// Electronモード用のダミーDATABASE_URL
if (isElectronMode && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/dummy_db';
  console.log('🔧 Electron mode: Using dummy DATABASE_URL');
}

// PostgreSQL接続プールの設定
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// データベース接続テスト
export async function testDatabaseConnection(): Promise<boolean> {
  const isElectronMode = process.env.ELECTRON_MODE === 'true';
  
  if (isElectronMode) {
    console.log('🔧 Electron mode: Skipping database connection test');
    return true;
  }
  
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Please check your DATABASE_URL configuration in .env file');
    return false;
  }
}

// プールのエラーハンドリング
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });