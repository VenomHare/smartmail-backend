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

        console.log(`Fetched Data from Redis: `, data);

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

router.post("/mail/:mail_id/chat", async (req, res) => {
    try {
        const { mail_id } = req.params;
        const { message } = req.body;

        if (!mail_id || !message) {
            return res.status(400).json({
                message: "Invalid Inputs"
            });
        }

        // adding message in db
        const { data, error } = await supabase.from("chat_messages").insert({
            mail_id,
            message,
            role: "user"
        }).select("id").single();

        if (error) {
            return res.status(500).json({
                message: "Failed to send message",
                errorCode: "DB02"
            })
        }
        //create a redis object and add to queue
        await redis.hset(`chat:${data.id}`, {
            status: "inqueue"
        })

        await redis.lpush("work_queue", `chat:${data.id}`);

        return res.json({
            chat_id: data.id,
            status: "inqueue"
        })

    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
})

router.get("/chat/:chat_id", async (req, res) => {
    try {
        const { chat_id } = req.params;
        const cachedData = await redis.hgetall(`chat:${chat_id}`);
        console.log("Cached Data :" + JSON.stringify(cachedData));

        if (cachedData) {
            return res.json(cachedData);
        }
        else {
            return res.status(400).json({
                message: "Chat not found!",
            })
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
});

router.get("/chats/:mail_id", async (req, res) => {
    try {
        const { mail_id } = req.params;
        const { data, error } = await supabase.from("chat_messages").select("*").eq("mail_id", mail_id).order("sent_at", { ascending: true });

        if (error) {
            return res.status(404).json({
                message: "Mail Not Found",
                errorCode: "DB04"
            });
        }
        const response = data.map((chat) => ({
            id: chat.id,
            message: chat.message,
            role: chat.role == "ai" ? "assistant" : chat.role,
        }))

        return res.json({
            mail_id,
            chats: response
        })
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!" });
        return
    }
})
export default router