// @ts-nocheck
// @ts-ignore Deno imports
import { serve } from "std/http/server.ts";
// @ts-ignore Deno imports
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["admin", "moderator", "teacher", "parent", "user"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", { p_user_id: user.id, p_role: "admin" });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { action, email, user_id, role } = body as { action?: string; email?: string; user_id?: string; role?: string };

    if (!action || !["grant", "revoke", "lookup"].includes(action)) {
      return new Response(JSON.stringify({ error: "action must be grant|revoke|lookup" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action !== "lookup" && (!role || !VALID_ROLES.includes(role))) {
      return new Response(JSON.stringify({ error: `role must be one of ${VALID_ROLES.join(",")}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve target user
    let targetId = user_id ?? null;
    let targetEmail = email ?? null;
    if (!targetId && email) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw listErr;
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
      if (!found) {
        return new Response(JSON.stringify({ error: `Không tìm thấy email ${email}` }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }
      targetId = found.id;
      targetEmail = found.email ?? null;
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: "Cần email hoặc user_id" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "lookup") {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", targetId);
      const { data: prof } = await admin.from("profiles").select("display_name,jlpt_level").eq("user_id", targetId).maybeSingle();
      return new Response(JSON.stringify({ user_id: targetId, email: targetEmail, profile: prof, roles: (roles ?? []).map((r) => r.role) }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "grant") {
      const { error } = await admin.from("user_roles").upsert({ user_id: targetId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, user_id: targetId, role, granted: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // revoke
    // Safety: don't allow user to revoke their own admin role (lock-out protection)
    if (role === "admin" && targetId === user.id) {
      return new Response(JSON.stringify({ error: "Không thể tự thu hồi quyền admin của chính mình" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { error } = await admin.from("user_roles").delete().eq("user_id", targetId).eq("role", role);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, user_id: targetId, role, revoked: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[admin-manage-role]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
