// supabase/functions/create-user/index.ts
// ساخت امن کاربر کلاینت فقط توسط ادمین. کلید service_role فقط روی سرور است.
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
    const { phone, password } = await req.json();

    if (!/^09\d{9}$/.test(phone || "")) throw new Error("شماره تلفن معتبر نیست");
    if (!password || password.length < 8) throw new Error("رمز حداقل ۸ کاراکتر");

    // احراز هویت caller با JWT خودش
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("unauthorized");

    const adminCheck = createClient(url, service);
    const { data: prof } = await adminCheck.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role !== "admin") throw new Error("forbidden");

    // ساخت یوزر در Auth + پروفایل
    const email = `${phone}@biz.local`;
    const { data: created, error: cErr } = await adminCheck.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "client", phone },
    });
    if (cErr) throw cErr;

    const { error: pErr } = await adminCheck.from("profiles").insert({
      id: created.user.id, phone, role: "client",
    });
    if (pErr) {
      await adminCheck.auth.admin.deleteUser(created.user.id); // rollback
      throw pErr;
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "forbidden" || msg === "unauthorized" ? 403 : 400;
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: code, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
