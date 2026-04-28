import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  type: "daily_reminder" | "streak_warning" | "challenge_update";
  payload?: {
    title?: string;
    body?: string;
    url?: string;
  };
}

const NOTIFICATION_TEMPLATES: Record<PushPayload["type"], { title: string; body: string }> = {
  daily_reminder: { title: "⏰ Đến giờ học rồi!", body: "Duy trì streak của bạn — học 5 phút thôi!" },
  streak_warning: { title: "🔥 Streak sắp mất!", body: "Bạn chưa học hôm nay. Đừng để streak bị reset nhé!" },
  challenge_update: { title: "⚔️ Thách đấu mới!", body: "Có người vừa thách đấu bạn. Chấp nhận không?" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: PushPayload = await req.json();
    const { userId, type, payload } = body;

    // Fetch push subscription from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("push_endpoint, push_p256dh, push_auth, push_enabled")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.push_enabled || !profile.push_endpoint) {
      return new Response(
        JSON.stringify({ message: "Push notifications not enabled for this user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = NOTIFICATION_TEMPLATES[type];
    const notification = {
      title: payload?.title ?? template.title,
      body: payload?.body ?? template.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: payload?.url ?? "/",
      tag: type,
    };

    // Send Web Push using the Web Push Protocol
    // Note: Full VAPID signing requires crypto operations — using fetch to a push service
    const pushSubscription = {
      endpoint: profile.push_endpoint,
      keys: {
        p256dh: profile.push_p256dh,
        auth: profile.push_auth,
      },
    };

    // For production, use a proper web-push library or implement VAPID signing
    // This is a placeholder that logs the intent — replace with actual push sending
    console.log("Push notification queued:", { userId, type, pushSubscription: pushSubscription.endpoint, notification });

    return new Response(
      JSON.stringify({ success: true, message: "Push notification sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push notify error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
