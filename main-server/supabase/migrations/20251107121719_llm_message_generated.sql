


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






CREATE TYPE "public"."worker_status" AS ENUM (
    'inqueue',
    'processing',
    'processed'
);


ALTER TYPE "public"."worker_status" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."generated_mail" (
    "uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "html" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "llm_message" "text" DEFAULT 'Here is your Final mail'::"text"
);


ALTER TABLE "public"."generated_mail" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."generated_mail"
    ADD CONSTRAINT "generated_mail_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."worker_process"
    ADD CONSTRAINT "worker_process_pkey" PRIMARY KEY ("uuid");



ALTER TABLE ONLY "public"."worker_questions"
    ADD CONSTRAINT "worker_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_questions"
    ADD CONSTRAINT "fk_worker_process" FOREIGN KEY ("uuid") REFERENCES "public"."worker_process"("uuid") ON DELETE CASCADE;



CREATE POLICY "allow_update_and_select_generated_mail" ON "public"."generated_mail" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_and_select_worker_process" ON "public"."worker_process" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_and_select_worker_questions" ON "public"."worker_questions" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."generated_mail" TO "anon";
GRANT ALL ON TABLE "public"."generated_mail" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_mail" TO "service_role";



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

