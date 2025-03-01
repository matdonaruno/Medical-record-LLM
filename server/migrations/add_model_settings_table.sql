-- モデル設定テーブルの作成
CREATE TABLE IF NOT EXISTS model_settings (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データの挿入（llama3とdeepseek-r1:7bをデフォルトで追加）
INSERT INTO model_settings (model_name, is_default)
VALUES ('llama3', false),
       ('deepseek-r1:7b', true)
ON CONFLICT (model_name) DO NOTHING; 