import { initialQuestions } from "./lib/config";
import { GEMINI_MODEL } from "./lib/env";
import { ai, redis, supabase } from "./lib/exports";
import { initialGenerationPrompt } from "./lib/prompts";

type LLMQuestions = {
    question: string
    select: false
    textarea: boolean
} | {
    question: string
    select: true
    options: string[]
    textarea: boolean
}

type LLMResponse = {
    type: "questions"
    llmMessage: string
    questions: LLMQuestions[]
} | {
    type: "mail"
    llmMessage: string
    html: string
    subject: string
}

const main = async () => {
    while (true) {
        const jobId = await redis.brpop("work_queue", 0);
        if (jobId) {
            const [, id] = jobId;
            await processsJob(id);
        }
    }
}

const processsJob = async (jobId: string) => {
    console.log(`🔧 Started Processing ${jobId}`);

    const uuid = jobId.replace("job:", "");
    // const data = await redis.hgetall(jobId);
    await redis.hset(jobId, {
        status:"processing"
    })

    const { data: answersData, error } = await supabase
        .from("worker_process")
        .update({
            status: "processing",
            updated_at: new Date().toISOString()
        })
        .eq("uuid", uuid)
        .select("*")
        .single();

    if (error) {
        throw error
    }
    if (answersData == null) {
        console.log("No Data found for job: ", uuid);
        return
    }

    let promptedAnswers = "";
    answersData.default_answers.forEach((answer: string, index: number) => {
        promptedAnswers += `${index + 1}. ${initialQuestions[index]} : ${answer} `;
    })
    promptedAnswers += `\n Extra QnA requested by you: ${JSON.stringify(answersData.extra_inputs)} `

    console.log("🛫 Sending LLM Request");
    const chat = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptedAnswers,
        config: {
            systemInstruction: initialGenerationPrompt
        }
    })
    console.log("🛬 Recieved LLM Response");
    try {
        if (!chat.text) {
            throw new Error("LLM Halucinated: Didn't recieved text data from llm ")
        }
        const response: LLMResponse = JSON.parse(chat.text);

        if (response.type == "questions") {
            const { error } = await supabase.from("worker_questions").insert({
                uuid,
                questions: response.questions,
                llm_message: response.llmMessage
            });

            if (error) {
                throw error;
            }

            await redis.hset(jobId, {
                status: "waiting_for_input",
            })
        }
        else if (response.type == "mail") {
            const { error } = await supabase.from("generated_mail").insert({
                uuid,
                subject: response.subject,
                html: response.html,
                llm_message: response.llmMessage
            })

            if (error) {
                throw error;
            }

            const { error: statusError } = await supabase
                .from("worker_process")
                .update({
                    status: "processed",
                    updated_at: new Date().toISOString()
                })
                .eq("uuid", uuid);

            await redis.hset(jobId, {
                status: "mail_generated",
            })

            if (statusError) {
                throw statusError
            }

        }
        else {
            throw new Error("Invalid Response Type")
        }
    }
    catch (er) {
        console.log(er);
        console.log("♻️ Requeueing " + jobId);

        await redis.lpush("work_queue", jobId);
    }

    console.log("🏁 Done with " + jobId);
}

main();