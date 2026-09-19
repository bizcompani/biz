// supabase/functions/review-request/index.ts
// بررسی درخواست حذف توسط ادمین:
// approve → حذف درخواست + حذف کامل اکانت (auth.users + profiles)
// reject  → حذف فقط درخواست (اکانت می‌ماند)
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { requestId, action } = await req.json();
    if (!requestId || !["approve", "reject"].includes(action)) throw new Error("ورودی نامعتبر");

    const caller = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("unauthorized");

    const admin = createClient(url, service);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role !== "admin") throw new Error("forbidden");

    const { data: req1, error: fErr } = await admin.from("submissions").select("id,user_id").eq("id", requestId).maybeSingle();
    if (fErr || !req1) throw new Error("درخواست یافت نشد");

    // 1) حذف کامل رکورد حساس (در هر دو حالت)
    const { error: dErr } = await admin.from("submissions").delete().eq("id", requestId);
    if (dErr) throw dErr;

    // 2) اگر تأیید: حذف کامل حساب کاربری
    if (action === "approve") {
      await admin.auth.admin.deleteUser(req1.user_id); // profiles هم با cascade پاک می‌شود
      const { error: pErr } = await admin.from("profiles").delete().eq("id", req1.user_id);
      if (pErr) console.warn("profile delete warn", pErr.message);
    }

    return new Response(JSON.stringify({ ok: true, action }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "forbidden" || msg === "unauthorized" ? 403 : 400;
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: code, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
