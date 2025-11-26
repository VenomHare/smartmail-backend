


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."chat_message_role" AS ENUM (
    'ai',
    'user'
);


ALTER TYPE "public"."chat_message_role" OWNER TO "postgres";


CREATE TYPE "public"."worker_status" AS ENUM (
    'inqueue',
    'processing',
    'processed'
);


ALTER TYPE "public"."worker_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN 
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_message_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_message_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mail_id" "uuid" NOT NULL,
    "message" "text",
    "llm_context" "text",
    "role" "public"."chat_message_role" NOT NULL,
    "sent_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";

ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "fk_chat_mail_id" FOREIGN KEY ("mail_id") REFERENCES "public"."generated_mail"("uuid") ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS "public"."generated_mail" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "html" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "llm_message" "text" DEFAULT 'Here is your Final mail'::"text"
);


ALTER TABLE "public"."generated_mail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "updated_at" timestamp with time zone,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_process" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "public"."worker_status" DEFAULT 'inqueue'::"public"."worker_status" NOT NULL,
    "default_answers" "text"[] DEFAULT '{}'::"text"[],
    "extra_inputs" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."worker_process" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_questions" (
    "id" integer NOT NULL,
    "uuid" "uuid" NOT NULL,
    "questions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "llm_message" "text" DEFAULT 'Just need little more information'::"text"
);


ALTER TABLE "public"."worker_questions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."worker_questions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."worker_questions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."worker_questions_id_seq" OWNED BY "public"."worker_questions"."id";



ALTER TABLE ONLY "public"."worker_questions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."worker_questions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_mail"
    ADD CONSTRAINT "generated_mail_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."worker_process"
    ADD CONSTRAINT "worker_process_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."worker_questions"
    ADD CONSTRAINT "worker_questions_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "chat_messages_updated_at_trigger" BEFORE UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_message_updated_at"();



ALTER TABLE ONLY "public"."worker_questions"
    ADD CONSTRAINT "fk_worker_process" FOREIGN KEY ("uuid") REFERENCES "public"."worker_process"("uuid") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Profiles viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "allow_update_and_select_generated_mail" ON "public"."generated_mail" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_and_select_worker_process" ON "public"."worker_process" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_and_select_worker_questions" ON "public"."worker_questions" USING (true) WITH CHECK (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_message_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_message_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_message_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."generated_mail" TO "anon";
GRANT ALL ON TABLE "public"."generated_mail" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_mail" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."worker_process" TO "anon";
GRANT ALL ON TABLE "public"."worker_process" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_process" TO "service_role";



GRANT ALL ON TABLE "public"."worker_questions" TO "anon";
GRANT ALL ON TABLE "public"."worker_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."worker_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."worker_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."worker_questions_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



