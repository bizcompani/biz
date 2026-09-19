import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase, type DeletionRequest, type Profile } from "../lib/supabase";
import { normalizePhone, isValidIranMobile } from "../lib/phone";

type Tab = "requests" | "users" | "settings";

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [siteName, setSiteName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ساخت کاربر
  const [newPhone, setNewPhone] = useState("");
  const [newPass, setNewPass] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    const [{ data: r }, { data: u }, { data: s }] = await Promise.all([
      supabase.from("submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("site_name").eq("id", 1).maybeSingle(),
    ]);
    if (r) setRequests(r as DeletionRequest[]);
    if (u) setUsers(u as Profile[]);
    if (s?.site_name) setSiteName(s.site_name);
  }

  useEffect(() => {
    loadAll();
    // لایو: درخواست‌ها + کاربران
    const ch = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_settings" }, (p) => {
        const n = (p.new as { site_name?: string }).site_name;
        if (n) setSiteName(n);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    const label = action === "approve" ? "تأیید و حذف کامل حساب" : "رد درخواست";
    if (!confirm(`${label} انجام شود؟${action === "approve" ? "\nاکانت و اطلاعات برای همیشه حذف می‌شود." : ""}`)) return;
    setBusyId(id); setMsg(null); setErr(null);
    try {
      // امن: حذف واقعی فقط در Edge Function با service_role انجام می‌شود
      const { data, error } = await supabase.functions.invoke("review-request", {
        body: { requestId: id, action },
      });
      if (error) throw error;
      if ((data as { ok?: boolean })?.ok !== true) throw new Error("پاسخ نامعتبر از سرور");
      setMsg(action === "approve" ? "تأیید شد؛ حساب و اطلاعات کاملاً حذف شد." : "درخواست رد شد؛ حساب کاربر باقی ماند.");
      await loadAll();
    } catch {
      setErr("عملیات ناموفق بود. اتصال و دسترسی ادمین را بررسی کنید.");
    } finally {
      setBusyId(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    const p = normalizePhone(newPhone);
    if (!isValidIranMobile(p)) { setErr("شماره تلفن معتبر نیست."); return; }
    if (newPass.length < 8) { setErr("رمز عبور حداقل ۸ کاراکتر باشد."); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { phone: p, password: newPass },
      });
      if (error) throw error;
      if ((data as { ok?: boolean })?.ok !== true) throw new Error("bad response");
      setMsg(`کاربر ${p} ساخته شد.`);
      setNewPhone(""); setNewPass("");
      await loadAll();
    } catch {
      setErr("ساخت کاربر ناموفق بود. (تکراری بودن شماره یا خطای سرور)");
    } finally {
      setCreating(false);
    }
  }

  async function saveSiteName(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!siteName.trim()) { setErr("نام سایت خالی است."); return; }
    const { error } = await supabase.from("app_settings").update({ site_name: siteName.trim() }).eq("id", 1);
    if (error) setErr("ذخیره ناموفق بود.");
    else { setMsg("نام سایت به‌روزرسانی شد و لایو برای همه اعمال می‌شود."); document.title = siteName.trim(); }
  }

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <span className="live-dot"><i />پنل دولوپر • لایو</span>
      <h2 style={{ margin: "10px 0" }}>مدیریت بیز</h2>
      {msg && <div className="ok">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <div className="tabs">
        <button className={`btn ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
          درخواست‌های حذف ({requests.length})
        </button>
        <button className={`btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          کاربران ({users.length})
        </button>
        <button className={`btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>تنظیمات سایت</button>
      </div>

      {tab === "requests" && (
        <div className="table-wrap">
          {requests.length === 0 ? <p style={{ color: "var(--muted)" }}>درخواستی در انتظار نیست.</p> : (
            <table>
              <thead><tr><th>نام کامل</th><th>کد ملی</th><th>تلفن</th><th>نام پدر</th><th>آدرس</th><th>تاریخ</th><th>عملیات</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name}</td><td>{r.national_code}</td><td>{r.phone}</td>
                    <td>{r.father_name}</td><td style={{ whiteSpace: "normal", minWidth: 180 }}>{r.address}</td>
                    <td>{new Date(r.created_at).toLocaleString("fa-IR")}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-success" disabled={busyId === r.id} onClick={() => review(r.id, "approve")}>
                          {busyId === r.id ? "…" : "تأیید"}
                        </button>
                        <button className="btn btn-danger" disabled={busyId === r.id} onClick={() => review(r.id, "reject")}>
                          رد
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 12, color: "var(--muted)" }}>تأیید = حذف کامل درخواست + حذف کامل اکانت (نام کاربری/رمز). رد = حذف فقط درخواست.</p>
        </div>
      )}

      {tab === "users" && (
        <>
          <form onSubmit={createUser} className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>افزودن کاربر جدید (کلاینت)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>شماره تلفن (نام کاربری)</label>
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="09123456789" /></div>
              <div className="field"><label>رمز عبور</label>
                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="حداقل ۸ کاراکتر" /></div>
            </div>
            <button className="btn btn-primary" disabled={creating}>{creating ? "در حال ساخت…" : "ذخیره کاربر"}</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>تلفن</th><th>نقش</th><th>تاریخ ساخت</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}><td>{u.phone}</td><td>{u.role === "admin" ? "ادمین" : "کلاینت"}</td>
                    <td>{new Date(u.created_at).toLocaleString("fa-IR")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>حذف دستی کاربر از همین پنل انجام نمی‌شود؛ از تأیید درخواست حذف یا داشبورد Supabase استفاده کنید تا اکانت Auth هم پاک شود.</p>
        </>
      )}

      {tab === "settings" && (
        <form onSubmit={saveSiteName}>
          <div className="field"><label>نام سایت (عنوان و برندینگ اصلی)</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></div>
          <button className="btn btn-primary">ذخیره</button>
        </form>
      )}
    </motion.div>
  );
}
