CREATE POLICY "allow_update_and_select_worker_process"
ON worker_process
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_update_and_select_worker_questions"
ON worker_questions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_update_and_select_generated_mail"
ON generated_mail
FOR ALL
USING (true)
WITH CHECK (true);
