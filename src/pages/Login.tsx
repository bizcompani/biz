import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizePhone, isValidIranMobile } from "../lib/phone";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { login, siteName } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const p = normalizePhone(phone);
    if (!isValidIranMobile(p)) { setErr("شماره تلفن معتبر نیست. مثال: 09123456789"); return; }
    if (!password) { setErr("رمز عبور را وارد کنید."); return; }
    setBusy(true);
    try {
      await login(p, password);
      // نقش را از profiles بخوان و هدایت کن
      const { data: { user } } = await supabase.auth.getUser();
      let role: string | null = null;
      if (user) {
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        role = (data as { role?: string } | null)?.role ?? null;
      }
      nav(role === "admin" ? "/admin" : "/panel", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "نام کاربری یا رمز عبور اشتباه است.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-wrap">
      <div className="login-grid">
        <motion.div
          className="card hero-copy float-anim"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <span className="pill">کارگزاری تبلیغاتی</span>
          <h2>{siteName}</h2>
          <p>
            سامانه اختصاصی مشتریان بیز. ورود فقط با شماره تلفن و رمزی که توسط
            مدیر برای شما تعریف شده است. امکان ثبت‌نام عمومی وجود ندارد.
            پس از ورود، می‌توانید درخواست حذف حساب خود را ثبت کنید.
          </p>
          <p style={{ fontSize: 12 }}>🔒 اتصال امن به Supabase • دسترسی‌ها با RLS محافظت می‌شود • پنل کاملاً لایو</p>
        </motion.div>

        <motion.form
          className="card" onSubmit={onSubmit}
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
        >
          <h3 style={{ marginTop: 0 }}>ورود به حساب</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>نام کاربری = شماره تلفن شما</p>
          {err && <div className="error">{err}</div>}
          <div className="field">
            <label>نام کاربری (شماره تلفن)</label>
            <input inputMode="tel" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>رمز عبور</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "در حال ورود…" : "ورود"}
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            رمز را فراموش کرده‌اید؟ با مدیر (دولوپر) تماس بگیرید. <Link to="/" style={{ color: "var(--gold-400)" }}>بیز</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
