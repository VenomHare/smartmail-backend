ALTER TABLE public."worker_process"
ADD COLUMN user_id uuid NOT NULL;

ALTER TABLE public."worker_process"
ADD CONSTRAINT "fk_worker_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."generated_mail" 
ADD COLUMN user_id uuid NOT NULL;

ALTER TABLE public."generated_mail"
ADD CONSTRAINT "fk_mail_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."chat_messages" 
ADD COLUMN user_id uuid;

ALTER TABLE public."chat_messages" 
ADD CONSTRAINT "fk_chat_message_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_user_date
ON chat_messages (user_id, sent_at);

