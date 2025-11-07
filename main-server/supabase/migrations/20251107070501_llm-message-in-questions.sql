ALTER TABLE worker_questions
ADD COLUMN IF NOT EXISTS llm_message TEXT DEFAULT 'Just need little more information';
