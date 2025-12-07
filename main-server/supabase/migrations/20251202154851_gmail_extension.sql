CREATE TABLE IF NOT EXISTS public."gmail_connections" (
    user_id uuid NOT NULL,
    gmail_id text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expiry_date text NOT NULL,
    linked_at TIMESTAMP WITH ZONE DEFAULT now()
);

ALTER TABLE public."gmail_connections" 
ADD CONSTRAINT "fk_gmail_user" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."gmail_connections" 
ADD CONSTRAINT "pk_gmail" PRIMARY KEY (gmail_id);
