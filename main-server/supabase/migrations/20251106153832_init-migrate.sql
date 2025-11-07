CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
        CREATE TYPE worker_status AS ENUM ('inqueue', 'processing', 'processed');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS worker_process (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status worker_status NOT NULL DEFAULT 'inqueue',
    default_answers TEXT[] DEFAULT '{}',
    extra_inputs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_questions (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL,
    questions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT fk_worker_process
        FOREIGN KEY (uuid)
        REFERENCES worker_process (uuid)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generated_mail (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    html TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
