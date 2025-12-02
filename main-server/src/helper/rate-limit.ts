import { supabase } from "../lib/supabase";

export const get_user_todays_chat_message_count = async (user_id: string) => {
    const startTime = new Date();
    startTime.setUTCHours(0, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setUTCDate(endTime.getUTCDate() + 1);

    const { count, error } = await supabase.from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("sent_at", startTime.toISOString())
        .lt("sent_at", endTime.toISOString());

    if (error) {
        throw error
    }

    return count
}