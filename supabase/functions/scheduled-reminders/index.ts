import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProfileForReminder {
  user_id: string;
  push_reminder_time: string | null;
}

serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get current date/time info
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15; // Precision 15 mins
    const currentTimeStr = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

    console.log(`Checking reminders for ${today} around ${currentTimeStr}`);

    // 2. Find users who:
    // - Have push enabled
    // - Haven't studied today (last_activity_date < today)
    // - Have a reminder time set for this hour/slot
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, push_reminder_time")
      .eq("push_enabled", true)
      .lt("last_activity_date", today);

    if (error) throw error;

    // Filter by reminder time in JS for more flexibility (or use SQL precision)
    const usersToRemind = (profiles || []).filter((p: ProfileForReminder) => {
        if (!p.push_reminder_time) return false;
        // Simple comparison: e.g., "20:00" == "20:00"
        // We allow a window if needed, but here we match the slot.
        return p.push_reminder_time.startsWith(currentHour);
    });

    console.log(`Found ${usersToRemind.length} users to remind.`);

    // 3. Trigger push for each user
    const results = await Promise.all(
      usersToRemind.map(async (p: ProfileForReminder) => {
        try {
          // Internal invocation to our push-notify function
          const { error } = await supabase.functions.invoke("push-notify", {
            body: {
              userId: p.user_id,
              type: "daily_reminder",
            },
          });
          return { userId: p.user_id, success: !error };
        } catch (e: unknown) {
          return { userId: p.user_id, success: false, error: String(e) };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        checked_time: currentTimeStr,
        notified: results.filter((r: { success: boolean }) => r.success).length,
        failed: results.filter((r: { success: boolean }) => !r.success).length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Scheduled reminders error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
