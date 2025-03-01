import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_record_db',
});

async function runMigrations() {
  try {
    console.log('マイグレーションを開始します...');
    
    // マイグレーションファイルの読み込み
    const migrationFile = path.join(__dirname, 'migrations', 'add_chats_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // SQLの実行
    await pool.query(sql);
    
    console.log('マイグレーションが完了しました！');
  } catch (error) {
    console.error('マイグレーションエラー:', error);
  } finally {
    await pool.end();
  }
}

runMigrations(); 