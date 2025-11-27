import type { Content } from "@google/genai";
import { initialQuestions } from "./lib/config";
import { GEMINI_MODEL } from "./lib/env";
import { ai, redis, supabase } from "./lib/exports";
import { chatPrompt, initialGenerationPrompt } from "./lib/prompts";

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
        const item = await redis.brpop("work_queue", 0);
        if (item) {
            const [, id] = item;
            if (id.startsWith("job:")) {
                await processsJob(id);
            }
            else if (id.startsWith("chat:")) {
                await processChat(id);
            }
        }
    }
}

const processsJob = async (jobId: string) => {
    console.log(`🔧 Started Processing ${jobId}`);

    const uuid = jobId.replace("job:", "");
    // const data = await redis.hgetall(jobId);
    await redis.hset(jobId, {
        status: "processing"
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
            const { data, error } = await supabase.from("generated_mail").insert({
                uuid,
                subject: response.subject,
                html: response.html,
                llm_message: response.llmMessage
            }).select("uuid").single();

            if (error) {
                throw error;
            }
            const { error: addChatError } = await supabase.from("chat_messages").insert({
                mail_id: data.uuid,
                role: "ai",
                message: response.llmMessage,
                llm_context: "The initail generation of mail"
            });

            if (addChatError) {
                console.log(addChatError);
            }

            const { error: statusError } = await supabase
                .from("worker_process")
                .update({
                    status: "processed",
                    updated_at: new Date().toISOString()
                })
                .eq("uuid", uuid);

            await redis.del(jobId);

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

const processChat = async (chatId: string) => {

    console.log(`🔧 Started Processing ${chatId}`);
    await redis.hset(chatId, {
        status: "processing"
    });

    // Get chat from db along with the latest generated mail 
    const uuid = chatId.replace("chat:", "");

    const { data, error } = await supabase.from("chat_messages").select("message, generated_mail(uuid, html)").eq("id", uuid).single();

    if (error) {
        console.log("⚠️ Oops! No Mail Found!");
        return
    }

    const mailData = Array.isArray(data.generated_mail) ? data.generated_mail[0] : data.generated_mail

    if (!mailData) {
        console.log("⚠️ Didn't find mail data")
        return
    }

    // Get all chats
    const { data: previousChats, error: chatFetchError } = await supabase.from("chat_messages").select("*").eq('mail_id', mailData?.uuid).not("id", "eq", uuid).order("sent_at", { ascending: true });

    if (chatFetchError) {
        console.log("⚠️ Error while fetching mail chats!", chatFetchError);
        return
    }

    // create a history from previous chats
    const generated_history = previousChats.map((chat) => {
        if (chat.role == "ai") {
            return {
                role: "model",
                parts: [
                    {
                        text: chat.llm_context
                    }
                ]
            }
        }
        else {
            return {
                role: "user",
                parts: [
                    {
                        text: chat.message
                    }
                ]
            }
        }
    })

    // add latest version of mail
    generated_history.push({
        role: "user",
        parts: [
            {
                text: `Latest Mail ${mailData?.html}`
            }
        ]
    })

    console.log({ generated_history });
    console.log("🛫 Sending LLM Request");
    const chat = ai.chats.create({
        model: GEMINI_MODEL,
        config: {
            systemInstruction: chatPrompt
        },
        history: generated_history
    })

    const response = await chat.sendMessage({
        message: data.message
    })

    console.log("🛬 Recieved LLM Response");

    try {
        console.log(response.text);
        const llmResponse = JSON.parse(response.text!);
        console.log("🎌Started Experiment🎌");
        // update the latest mail 
        // add new chat and llm context 
        // update status on redis and client

        const { error } = await supabase.from("generated_mail").update({
            subject: llmResponse.subject,
            html: llmResponse.html,
            updated_at: new Date().toISOString()
        }).eq("uuid", mailData.uuid);

        if (error) {
            console.log("⚠️ Error");
            console.log(error);
        }

        const { error: LLMChatAddError } = await supabase.from("chat_messages").insert({
            role: "ai",
            message: llmResponse.message,
            llm_context: llmResponse.llm_context,
            mail_id: mailData.uuid
        })

        if (LLMChatAddError) {
            console.log("⚠️ Error");
            console.log(error);
        }

        await redis.hset(chatId, {
            status: "processed"
        });
    }
    catch (error) {
        console.log("⚠️ Error");
        console.log(error);

    }

    console.log("🏁 Done with " + chatId);
}

main();
