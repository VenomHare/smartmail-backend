import { supabase } from '../lib/supabase';
import { redis } from '../lib/redis';
import { Router } from 'express';

const router = Router();

router.post("/create", async (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || !Array.isArray(answers)) {
            res.status(400).json({ message: "Invalid Input" });
            return
        }

        const { data } = await supabase
            .from("worker_process")
            .insert({
                status: "inqueue",
                default_answers: answers,
                extra_inputs: ""
            })
            .select("*")
            .single();

        console.log(data);
        if (!data || !data.uuid) {
            res.status(500).json({
                message: "Failed to insert data in queue"
            });
            return;
        }

        const jobId = `job:${data.uuid}`;

        await redis.hset(jobId, {
            status: "inqueue",
        })
        await redis.lpush("work_queue", jobId);
        res.json({
            uuid: data.uuid
        });
        return
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
})

router.get("/status/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const data = await redis.hgetall(`job:${id}`);

        console.log(`Fetched Data from Redis: `,data);

        if (data.status == "waiting_for_input") {
            const { data } = await supabase.from("worker_questions").select("*").eq("uuid", id).single();
            if (!data || !data.questions) {
                console.log("Questions not found, Requeuing the task");
                await redis.hset(`job:${id}`, {
                    status: "input_recieved"
                });
                await redis.lpush("work_queue", `job:${id}`);
                res.json({
                    uuid: id,
                    status: "inqueue"
                });
                return
            }

            res.json({
                uuid: data.uuid,
                status: "processed",
                response: {
                    type: "questions",
                    llmMessage: data.llm_message,
                    questions: data.questions
                }
            });
            return;
        }
        // else if (data.status == "mail_generated") {
        //     const { data, error } = await supabase.from("generated_mail").select("*").eq("uuid", id).single();
        //     if (error) {
        //         console.log(error);
        //         res.status(500).json({
        //             message: "The generated email was not found. Try Again!"
        //         })
        //         return
        //     }

        //     res.json({
        //         uuid: data.uuid,
        //         status: "processed",
        //         response: {
        //             type: "mail",
        //             html: data.html,
        //             subject: data.subject,
        //             llmMessage: data.llm_message
        //         }
        //     })
        //     return
        // }
        else if (data.status) {
            res.json({
                uuid: id,
                status: data.status
            });
            return
        }
        else {
            const { data } = await supabase.from("generated_mail").select("*").eq("uuid", id).single();

            if (data) {
                res.json({
                    uuid: data.uuid,
                    status: "processed",
                    response: {
                        type: "mail",
                        html: data.html,
                        subject: data.subject,
                        llmMessage: data.llm_message
                    }
                })
                return
            }

            res.status(404).json({
                message: "Data not found"
            });
            return
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
})

router.post("/input/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;

        const currentData = await redis.hgetall("job:" + id);

        if (!answers || typeof answers !== "string") {
            res.status(400).json({
                message: "Invalid Input"
            });
            return
        }

        if (currentData.status !== "waiting_for_input") {
            res.status(400).json({
                message: "Invalid UUID"
            });
            return
        }

        await supabase
            .from("worker_process")
            .update({
                extra_inputs: answers,
                status: "inqueue",
                updated_at: new Date()
            })
            .eq("uuid", id);

        await redis.hset(`job:${id}`, {
            status: "input_recieved"
        });

        await redis.lpush("work_queue", `job:${id}`);

        res.json({
            uuid: id,
            status: "inqueue"
        })
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
})
export default router