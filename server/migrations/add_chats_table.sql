-- チャットテーブルの作成
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- メッセージテーブルにchat_idカラムを追加
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id); 