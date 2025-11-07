ALTER TABLE generated_mail
ADD COLUMN IF NOT EXISTS llm_message TEXT DEFAULT 'Here is your Final mail';